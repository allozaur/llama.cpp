/**
 * AgenticStore - Llama Chat's side of the agentic loop
 *
 * The loop itself is `@ggml/llama-harness`: it streams each LLM turn, runs
 * the tool calls and enforces the turn limit. This store gives it what the
 * app owns: ChatService as its inference client, the enabled tools behind
 * the permission gate, and the callbacks that persist each turn as one
 * assistant message (with tool_calls) and one tool result message per call.
 *
 * Waits on the permission/continue/steering gates owned by {@link AgenticGates}.
 */

import {
	type ContentPart,
	createHarness,
	type InferenceClient,
	type InferenceEvent,
	type Message,
	type Tool,
	type ToolCall,
	type ToolContext,
	type ToolResult
} from '@ggml/llama-harness';
import { DEFAULT_AGENTIC_CONFIG, NEWLINE, PROJECT_TOOL_NAMES } from '$lib/constants';
import {
	AUDIO_MIME_TO_EXTENSION,
	DATA_URI_BASE64_REGEX,
	DEFAULT_AUDIO_EXTENSION,
	DEFAULT_IMAGE_EXTENSION,
	IMAGE_MIME_TO_EXTENSION,
	MCP_ATTACHMENT_NAME_PREFIX,
	MIME_TYPE_PREFIXES
} from '$lib/constants';
import { BuiltInTool, ToolPermissionDecision, ToolSource } from '$lib/enums';
import {
	AttachmentType,
	ContentPartType,
	HarnessEventType,
	InferenceEventType,
	MessageRole,
	MimeTypePrefix,
	ToolCallType
} from '$lib/enums';
import { extensions } from '$lib/extensions';
import { ChatService } from '$lib/services';
import { ProjectToolsService } from '$lib/services/project-tools.service';
import { ReadMediaService } from '$lib/services/read-media.service';
import { SandboxService } from '$lib/services/sandbox.service';
import { ToolsService } from '$lib/services/tools.service';
// direct imports between stores, not via the barrel, to avoid circular deps
import { AgenticGates } from '$lib/stores/agentic/gates.svelte';
import { conversationsStore } from '$lib/stores/conversations/index.svelte';
import { modelsStore } from '$lib/stores/models/index.svelte';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type {
	AgenticConfig,
	AgenticFlowParams,
	AgenticFlowResult,
	AgenticSession,
	SettingsConfigType,
	ToolExecutionResult
} from '$lib/types';
import type {
	AgenticFlowCallbacks,
	AgenticFlowOptions,
	AgenticMessage,
	AgenticToolPolicy,
	SteeringMessage
} from '$lib/types/agentic';
import type { ApiChatMessageData } from '$lib/types/api';
import type { ChatMessagePromptProgress, ChatMessageTimings } from '$lib/types/chat';
import type {
	DatabaseMessageExtra,
	DatabaseMessageExtraAudioFile,
	DatabaseMessageExtraImageFile
} from '$lib/types/database';
import type { OpenAIToolDefinition } from '$lib/types/mcp';
import {
	executeBrowserInfoTool,
	executeGetDatetimeTool,
	getAudioInputFormat,
	isAbortError,
	throwIfAborted
} from '$lib/utils';
import { createAsyncQueue } from '$lib/utils/async-queue';
import { SvelteMap } from 'svelte/reactivity';

function createDefaultSession(): AgenticSession {
	return {
		currentTurn: 0,
		executingToolCallId: null,
		flowRootMessageId: null,
		isRunning: false,
		lastError: null,
		liveLlm: null,
		pendingPermissionRequest: null,
		streamingToolCall: null,
		totalToolCalls: 0
	};
}

function toAgenticMessages(messages: ApiChatMessageData[]): AgenticMessage[] {
	return messages.map((message) => {
		if (
			message.role === MessageRole.ASSISTANT &&
			message.tool_calls &&
			message.tool_calls.length > 0
		) {
			return {
				content: message.content,
				reasoning_content: message.reasoning_content,
				role: MessageRole.ASSISTANT,
				tool_calls: message.tool_calls.map((call, index) => ({
					function: {
						arguments: call.function?.arguments ?? '',
						name: call.function?.name ?? ''
					},
					id: call.id ?? `call_${index}`,
					type: (call.type as ToolCallType.FUNCTION) ?? ToolCallType.FUNCTION
				}))
			} satisfies AgenticMessage;
		}

		if (message.role === MessageRole.ASSISTANT) {
			return {
				content: message.content,
				reasoning_content: message.reasoning_content,
				role: MessageRole.ASSISTANT
			} satisfies AgenticMessage;
		}

		if (message.role === MessageRole.TOOL && message.tool_call_id) {
			return {
				content: typeof message.content === 'string' ? message.content : '',
				role: MessageRole.TOOL,
				tool_call_id: message.tool_call_id
			} satisfies AgenticMessage;
		}

		return {
			content: message.content,
			role: message.role as MessageRole.SYSTEM | MessageRole.USER
		} satisfies AgenticMessage;
	});
}

class AgenticStore {
	// permission, continue and steering gates the loop waits on between turns
	private gates = new AgenticGates();
	private sessions = new SvelteMap<string, AgenticSession>();

	get isAnyRunning(): boolean {
		for (const session of this.sessions.values()) {
			if (session.isRunning) return true;
		}

		return false;
	}

	get isReady(): boolean {
		return true;
	}

	clearError(conversationId: string): void {
		this.updateSession(conversationId, { lastError: null });
	}

	clearSession(conversationId: string): void {
		this.sessions.delete(conversationId);
	}

	/**
	 * Clear the pending steering message without consuming it.
	 */
	clearSteeringMessage(conversationId: string): void {
		this.gates.clearSteeringMessage(conversationId);
	}

	constructor() {
		// drop per-conversation session state when the conversation is deleted,
		// otherwise every conversation that ever ran a flow leaks a session here
		conversationsStore.onConversationsDeleted((convIds) => {
			for (const convId of convIds) {
				this.sessions.delete(convId);
			}
		});
	}

	/**
	 * Consume and return the pending steering message for re-sending.
	 * Called by chatStore after the agentic flow exits.
	 */
	consumePendingSteeringMessage(conversationId: string): SteeringMessage | null {
		return this.gates.consumePendingSteeringMessage(conversationId);
	}

	getActiveSessions(): Array<{ conversationId: string; session: AgenticSession }> {
		const active: Array<{ conversationId: string; session: AgenticSession }> = [];

		for (const [conversationId, session] of this.sessions.entries()) {
			if (session.isRunning) active.push({ conversationId, session });
		}

		return active;
	}

	getConfig(settings: SettingsConfigType): AgenticConfig {
		const maxTurns = Number(settings.agenticMaxTurns) || DEFAULT_AGENTIC_CONFIG.maxTurns;
		const hasTools =
			toolsStore.providers.some((provider) => provider.isConfigured()) ||
			toolsStore.serverTools.length > 0 ||
			toolsStore.browserTools.length > 0 ||
			toolsStore.customTools.length > 0;

		return {
			enabled: hasTools && DEFAULT_AGENTIC_CONFIG.enabled,
			maxTurns
		};
	}

	getCurrentTurn(conversationId: string): number {
		return this.sessions.get(conversationId)?.currentTurn ?? 0;
	}

	getExecutingToolCallId(conversationId: string): string | null {
		return this.sessions.get(conversationId)?.executingToolCallId ?? null;
	}

	// read-only: safe to call from derivations, unlike getSession
	getFlowRootMessageId(conversationId: string): string | null {
		return this.sessions.get(conversationId)?.flowRootMessageId ?? null;
	}

	getLastError(conversationId: string): Error | null {
		return this.sessions.get(conversationId)?.lastError ?? null;
	}

	// read-only: safe to call from derivations, unlike getSession
	getLiveLlmTotals(conversationId: string): AgenticSession['liveLlm'] {
		return this.sessions.get(conversationId)?.liveLlm ?? null;
	}

	getPendingContinueRequest(conversationId: string): boolean {
		return this.gates.getPendingContinueRequest(conversationId);
	}

	getPendingPermissionRequest(
		conversationId: string
	): { toolName: string; serverLabel: string } | null {
		return this.gates.getPendingPermissionRequest(conversationId);
	}

	getPendingSteeringMessageContent(conversationId: string): string | null {
		return this.gates.getPendingSteeringMessageContent(conversationId);
	}

	getPendingSteeringMessageExtras(conversationId: string): DatabaseMessageExtra[] | undefined {
		return this.gates.getPendingSteeringMessageExtras(conversationId);
	}

	getSession(conversationId: string): AgenticSession {
		let session = this.sessions.get(conversationId);

		if (!session) {
			session = createDefaultSession();
			this.sessions.set(conversationId, session);
		}

		return session;
	}

	getStreamingToolCall(conversationId: string): { name: string; arguments: string } | null {
		return this.sessions.get(conversationId)?.streamingToolCall ?? null;
	}

	getTotalToolCalls(conversationId: string): number {
		return this.sessions.get(conversationId)?.totalToolCalls ?? 0;
	}

	hasPendingSteeringMessage(conversationId: string): boolean {
		return this.gates.hasPendingSteeringMessage(conversationId);
	}

	/**
	 * Queue a steering message. When the current agentic turn completes,
	 * the flow exits and the caller re-sends the message as a normal chat message.
	 */
	injectSteeringMessage(
		conversationId: string,
		content: string,
		extras?: DatabaseMessageExtra[]
	): void {
		this.gates.injectSteeringMessage(conversationId, content, extras);
	}

	isRunning(conversationId: string): boolean {
		return this.sessions.get(conversationId)?.isRunning ?? false;
	}

	/**
	 * What a request of the chat sends under this tool policy: its messages
	 * as the agentic flow shapes them, and the tools it offers, none when the
	 * flow does not run. A request built from it shares the prefix the server
	 * cached for the conversation.
	 */
	async requestFor(
		messages: ApiChatMessageData[],
		toolPolicy?: AgenticToolPolicy
	): Promise<{ messages: ApiChatMessageData[]; tools: OpenAIToolDefinition[] }> {
		const tools = await this.toolsFor(toolPolicy);

		return {
			messages: tools.length > 0 ? (toAgenticMessages(messages) as ApiChatMessageData[]) : messages,
			tools
		};
	}

	resolveContinue(conversationId: string, shouldContinue: boolean): void {
		this.gates.resolveContinue(conversationId, shouldContinue);
	}

	resolvePermission(conversationId: string, decision: ToolPermissionDecision): void {
		this.gates.resolvePermission(conversationId, decision);
	}

	async runAgenticFlow(params: AgenticFlowParams): Promise<AgenticFlowResult> {
		const {
			callbacks,
			conversationId,
			flowRootMessageId,
			messages,
			options = {},
			signal,
			toolPolicy
		} = params;

		// Clear any pending permissions/continue requests for this conversation when starting a new flow
		this.gates.clear(conversationId);

		const agenticConfig = this.getConfig(settingsStore.config);
		const tools = await this.toolsFor(toolPolicy);

		if (tools.length === 0) {
			return { handled: false };
		}

		console.log(`[AgenticStore] Starting agentic flow with ${tools.length} tools`);

		const normalizedMessages: ApiChatMessageData[] =
			await ChatService.normalizeMessagesForApi(messages);

		this.updateSession(conversationId, {
			currentTurn: 0,
			flowRootMessageId: flowRootMessageId ?? null,
			isRunning: true,
			lastError: null,
			liveLlm: null,
			totalToolCalls: 0
		});

		const flowCleanups = this.startFlowHooks(conversationId);

		try {
			await this.executeAgenticLoop({
				agenticConfig,
				callbacks,
				conversationId,
				messages: normalizedMessages,
				options,
				signal,
				tools
			});

			return { handled: true };
		} catch (error) {
			const normalizedError = error instanceof Error ? error : new Error(String(error));

			this.updateSession(conversationId, { lastError: normalizedError });
			callbacks.onError?.(normalizedError);

			return { error: normalizedError, handled: true };
		} finally {
			this.updateSession(conversationId, {
				flowRootMessageId: null,
				isRunning: false,
				liveLlm: null
			});

			for (const cleanup of flowCleanups) {
				try {
					await cleanup();
				} catch (err) {
					console.warn('[AgenticStore] A flow hook failed to clean up:', err);
				}
			}
		}
	}

	private buildAttachmentName(mimeType: string, index: number): string {
		const extension = mimeType.startsWith(MimeTypePrefix.AUDIO)
			? (AUDIO_MIME_TO_EXTENSION[mimeType] ?? DEFAULT_AUDIO_EXTENSION)
			: (IMAGE_MIME_TO_EXTENSION[mimeType] ?? DEFAULT_IMAGE_EXTENSION);

		return `${MCP_ATTACHMENT_NAME_PREFIX}-${Date.now()}-${index}.${extension}`;
	}

	/**
	 * The media of a tool result as content parts, only what the model can read.
	 */
	private buildContentParts(
		attachments: DatabaseMessageExtra[],
		effectiveModel: string
	): ContentPart[] {
		const contentParts: ContentPart[] = [];

		for (const attachment of attachments) {
			if (attachment.type === AttachmentType.AUDIO) {
				if (modelsStore.props.modelSupportsAudio(effectiveModel)) {
					contentParts.push({
						input_audio: {
							data: (attachment as DatabaseMessageExtraAudioFile).base64Data,
							format: getAudioInputFormat((attachment as DatabaseMessageExtraAudioFile).mimeType)
						},
						type: ContentPartType.INPUT_AUDIO
					});
				}
			} else if (attachment.type === AttachmentType.IMAGE) {
				if (modelsStore.props.modelSupportsVision(effectiveModel)) {
					contentParts.push({
						image_url: {
							url: (attachment as DatabaseMessageExtraImageFile).base64Url
						},
						type: ContentPartType.IMAGE_URL
					});
				} else {
					console.info(
						`[AgenticStore] Skipping image attachment (model "${effectiveModel}" does not support vision)`
					);
				}
			}
		}

		return contentParts;
	}

	/**
	 * Run a tool call where its source runs it: on llama-server, in the
	 * browser or in the extension that provides the tool. Throws when the
	 * call fails.
	 */
	private async dispatchTool(params: {
		callbacks: AgenticFlowCallbacks;
		context: ToolContext;
		effectiveModel: string;
		toolCall: ToolCall;
	}): Promise<ToolExecutionResult> {
		const { callbacks, context, effectiveModel, toolCall } = params;
		const { signal } = context;
		const toolName = toolCall.function.name;
		const toolSource = toolsStore.getToolSource(toolName);

		if (
			toolSource === ToolSource.SERVER &&
			toolName === BuiltInTool.SERVER_EXEC_SHELL_COMMAND &&
			callbacks.createToolResultMessage &&
			callbacks.updateToolResultMessage
		) {
			const args = this.parseToolArguments(toolCall.function.arguments);
			const cwd = conversationsStore.activeConversation?.cwd;

			// the first update creates the result message, so the output shows live
			context.update('');

			let accumulated = '';
			let isError = false;

			for await (const ev of ToolsService.streamTool(toolName, args, signal, cwd)) {
				if (ev.chunk !== null) {
					accumulated += ev.chunk;
					context.update(accumulated);
				}

				if (ev.done) {
					if (ev.error) {
						accumulated = accumulated ? `${accumulated}\nError: ${ev.error}` : `Error: ${ev.error}`;
						context.update(accumulated);
						isError = true;
					}

					break;
				}
			}

			return { content: accumulated, isError };
		}

		if (toolSource === ToolSource.SERVER) {
			const args = this.parseToolArguments(toolCall.function.arguments);
			const cwd = conversationsStore.activeConversation?.cwd;

			return ToolsService.executeTool(toolName, args, signal, cwd);
		}

		if (toolSource === ToolSource.BROWSER) {
			const args = this.parseToolArguments(toolCall.function.arguments);

			if (toolName === BuiltInTool.BROWSER_GET_DATETIME) return executeGetDatetimeTool();

			if (PROJECT_TOOL_NAMES.includes(toolName)) {
				return ProjectToolsService.executeTool(
					toolName,
					args,
					conversationsStore.activeConversation?.projectId
				);
			}

			if (toolName === BuiltInTool.SERVER_GET_INFO) return executeBrowserInfoTool();

			if (toolName === BuiltInTool.BROWSER_READ_MEDIA) {
				return ReadMediaService.executeTool(
					args,
					{
						audio: modelsStore.props.modelSupportsAudio(effectiveModel),
						vision: modelsStore.props.modelSupportsVision(effectiveModel)
					},
					signal,
					conversationsStore.activeConversation?.cwd
				);
			}

			return SandboxService.executeTool(toolName, args, signal);
		}

		const provider = toolsStore.providers.find((p) => p.source === toolSource);

		if (!provider) throw new Error(`Unknown tool: ${toolName}`);

		return provider.execute(
			{ arguments: toolCall.function.arguments, id: toolCall.id, name: toolName },
			signal
		);
	}

	/**
	 * Run the harness and turn its events into the flow's callbacks and the
	 * session state the UI reads.
	 */
	private async executeAgenticLoop(params: {
		conversationId: string;
		messages: ApiChatMessageData[];
		options: AgenticFlowOptions;
		tools: ReturnType<typeof toolsStore.getEnabledToolsForLLM>;
		agenticConfig: AgenticConfig;
		callbacks: AgenticFlowCallbacks;
		signal?: AbortSignal;
	}): Promise<void> {
		const { agenticConfig, callbacks, conversationId, messages, options, signal, tools } = params;
		const {
			createAssistantMessage,
			createToolResultMessage,
			onAssistantTurnComplete,
			onAttachments,
			onChunk,
			onCompletionId,
			onFlowComplete,
			onModel,
			onReasoningChunk,
			onTimings,
			onToolCallsStreaming,
			onTurnComplete,
			updateToolResultMessage
		} = callbacks;
		const effectiveModel = options.model || modelsStore.models[0]?.model || '';
		const harness = createHarness(this.inferenceClient(options, conversationId));
		const harnessTools: Tool[] = tools.map((definition) => ({
			definition,
			execute: (toolCall, context) =>
				this.executeTool({ callbacks, context, conversationId, effectiveModel, toolCall })
		}));
		// result messages of streaming tools, created while the tool runs, by tool call id
		const streamedResults = new SvelteMap<string, { content: string; messageId: string }>();
		const events = harness.run(toAgenticMessages(messages) as Message[], harnessTools, signal, {
			interrupted: () => this.gates.hasPendingSteeringMessage(conversationId),
			maxTurns: agenticConfig.maxTurns,
			onTurnLimit: async () => {
				// Turn limit reached - ask user whether to continue
				const shouldContinue = await this.gates.requestContinue(conversationId, signal);

				// Yield to allow Svelte to flush the UI update
				await new Promise((r) => setTimeout(r, 0));

				return shouldContinue;
			}
		});

		let totalToolCallCount = 0;
		let lastStreamingToolCallName = '';
		let lastStreamingToolCallArgsLength = 0;

		for await (const event of events) {
			switch (event.type) {
				case HarnessEventType.TURN_START:
					this.updateSession(conversationId, { currentTurn: event.turn });
					lastStreamingToolCallName = '';
					lastStreamingToolCallArgsLength = 0;

					// the caller created the first turn's assistant message
					if (event.turn > 1 && createAssistantMessage) await createAssistantMessage();

					break;

				case HarnessEventType.TEXT:
					onChunk?.(event.delta);

					break;

				case HarnessEventType.REASONING:
					onReasoningChunk?.(event.delta);

					break;

				case HarnessEventType.TOOL_CALL_DELTA: {
					onToolCallsStreaming?.(event.toolCalls);

					const streamingCall = event.toolCalls[0]?.function;

					if (streamingCall) {
						const name = streamingCall.name || '';
						const args = streamingCall.arguments || '';
						const argsLengthBucket = Math.floor(args.length / 100);

						if (
							name !== lastStreamingToolCallName ||
							argsLengthBucket !== lastStreamingToolCallArgsLength
						) {
							lastStreamingToolCallName = name;
							lastStreamingToolCallArgsLength = argsLengthBucket;
							this.updateSession(conversationId, {
								streamingToolCall: { arguments: args, name }
							});
						}
					}

					break;
				}

				case HarnessEventType.TIMINGS:
					onTimings?.(event.timings, event.progress);

					// completed turns + in-flight turn live counts
					if (event.llm) this.updateSession(conversationId, { liveLlm: event.llm });

					break;

				case HarnessEventType.MODEL:
					onModel?.(event.model);

					break;

				case HarnessEventType.COMPLETION_ID:
					onCompletionId?.(event.id);

					break;

				case HarnessEventType.MESSAGE:
					this.updateSession(conversationId, { streamingToolCall: null });

					if (event.toolCalls && !event.final) {
						totalToolCallCount += event.toolCalls.length;
						this.updateSession(conversationId, { totalToolCalls: totalToolCallCount });
					}

					await onAssistantTurnComplete?.(
						event.content,
						event.reasoning,
						event.timings,
						event.toolCalls
					);

					break;

				case HarnessEventType.TOOL_UPDATE: {
					if (!createToolResultMessage || !updateToolResultMessage) break;

					const streamed = streamedResults.get(event.toolCall.id);

					if (streamed) {
						streamed.content = event.content;
						await updateToolResultMessage(streamed.messageId, event.content);
					} else {
						const message = await createToolResultMessage(
							event.toolCall.id,
							event.content,
							undefined,
							conversationsStore.activeConversation?.cwd
						);

						streamedResults.set(event.toolCall.id, {
							content: event.content,
							messageId: message.id
						});
					}

					break;
				}

				case HarnessEventType.TOOL_RESULT: {
					const { content } = event.result;
					const attachments = (event.result.details as DatabaseMessageExtra[] | undefined) ?? [];
					const extras = attachments.length > 0 ? attachments : undefined;
					const streamed = streamedResults.get(event.toolCall.id);

					let toolResultMessageId: string | undefined;

					if (streamed) {
						toolResultMessageId = streamed.messageId;

						// the message already shows the streamed output: rewrite it only when the result differs
						if (extras || content !== streamed.content) {
							await updateToolResultMessage?.(streamed.messageId, content, extras);
						}
					} else if (createToolResultMessage) {
						toolResultMessageId = (
							await createToolResultMessage(event.toolCall.id, content, extras)
						).id;
					}

					if (extras && toolResultMessageId) onAttachments?.(toolResultMessageId, extras);

					break;
				}

				case HarnessEventType.TURN_END:
					onTurnComplete?.(event.timings);

					break;

				case HarnessEventType.DONE:
					onFlowComplete?.(event.timings);

					break;

				case HarnessEventType.ERROR:
					onFlowComplete?.(event.timings);

					throw event.error;
			}
		}
	}

	/**
	 * A tool of the harness: the permission gate, then the call, then the
	 * result with its media taken out of the text.
	 */
	private async executeTool(params: {
		callbacks: AgenticFlowCallbacks;
		context: ToolContext;
		conversationId: string;
		effectiveModel: string;
		toolCall: ToolCall;
	}): Promise<ToolResult> {
		const { callbacks, context, conversationId, effectiveModel, toolCall } = params;
		const toolName = toolCall.function.name;
		const serverLabel = toolsStore.getToolServerLabel(toolName);
		// Ask for permission before executing the tool
		const permission = await this.gates.requestPermission(
			conversationId,
			toolName,
			serverLabel,
			context.signal
		);

		// Yield to allow Svelte to flush the UI update (hide permission dialog)
		await new Promise((r) => setTimeout(r, 0));

		throwIfAborted(context.signal);

		// the time waiting for permission does not count
		const toolStartTime = performance.now();

		let execution: ToolExecutionResult;

		// Streaming tools (currently only exec_shell_command): mark
		// the session so the matching renderer can switch to live mode.
		this.updateSession(conversationId, { executingToolCallId: toolCall.id });

		try {
			execution =
				permission === ToolPermissionDecision.DENY
					? { content: 'Tool execution was denied by the user.', isError: true }
					: await this.dispatchTool({ callbacks, context, effectiveModel, toolCall });
		} catch (error) {
			if (isAbortError(error)) throw error;

			execution = {
				content: `Error: ${error instanceof Error ? error.message : String(error)}`,
				isError: true
			};
		} finally {
			this.updateSession(conversationId, { executingToolCallId: null });
		}

		const durationMs = performance.now() - toolStartTime;
		const { attachments, cleanedResult } = this.extractBase64Attachments(execution.content);

		return {
			content: cleanedResult,
			details: attachments,
			durationMs,
			isError: execution.isError,
			parts: this.buildContentParts(attachments, effectiveModel)
		};
	}

	private extractBase64Attachments(result: string): {
		cleanedResult: string;
		attachments: DatabaseMessageExtra[];
	} {
		if (!result.trim()) {
			return { attachments: [], cleanedResult: result };
		}

		const lines = result.split(NEWLINE);
		const attachments: DatabaseMessageExtra[] = [];

		let attachmentIndex = 0;

		const cleanedLines = lines.map((line) => {
			const trimmedLine = line.trim();
			const match = trimmedLine.match(DATA_URI_BASE64_REGEX);

			if (!match) {
				return line;
			}

			const mimeType = match[1].toLowerCase();
			const base64Data = match[2];

			if (!base64Data) {
				return line;
			}

			attachmentIndex += 1;
			const name = this.buildAttachmentName(mimeType, attachmentIndex);

			if (mimeType.startsWith(MIME_TYPE_PREFIXES.IMAGE)) {
				attachments.push({ base64Url: trimmedLine, name, type: AttachmentType.IMAGE });

				return `[Attachment saved: ${name}]`;
			}

			if (mimeType.startsWith(MimeTypePrefix.AUDIO)) {
				// audio extras hold the bare base64, the input_audio part has no room for a data URI
				attachments.push({
					base64Data,
					mimeType,
					name,
					type: AttachmentType.AUDIO
				});

				return `[Attachment saved: ${name}]`;
			}

			return line;
		});

		return { attachments, cleanedResult: cleanedLines.join(NEWLINE) };
	}

	/**
	 * ChatService as the harness's inference client: one streamed completion
	 * per turn, its callbacks turned into events.
	 */
	private inferenceClient(options: AgenticFlowOptions, conversationId: string): InferenceClient {
		return {
			stream: ({ messages, signal, tools }) => {
				const events = createAsyncQueue<InferenceEvent>();

				ChatService.sendMessage(
					messages as ApiChatMessageData[],
					{
						...options,
						onChunk: (chunk: string) =>
							events.push({ delta: chunk, type: InferenceEventType.TEXT }),
						onComplete: () => {
							/* Completion handled after sendMessage resolves */
						},
						onCompletionId: (id: string) =>
							events.push({ id, type: InferenceEventType.COMPLETION_ID }),
						onError: (error: Error) => {
							throw error;
						},
						onModel: (model: string) => events.push({ model, type: InferenceEventType.MODEL }),
						onReasoningChunk: (chunk: string) =>
							events.push({ delta: chunk, type: InferenceEventType.REASONING }),
						onTimings: (timings?: ChatMessageTimings, progress?: ChatMessagePromptProgress) =>
							events.push({ progress, timings, type: InferenceEventType.TIMINGS }),
						onToolCallChunk: (serialized: string) => {
							try {
								events.push({
									toolCalls: JSON.parse(serialized),
									type: InferenceEventType.TOOL_CALLS
								});
							} catch {
								/* Ignore parse errors during streaming */
							}
						},
						stream: true,
						tools
					},
					conversationId,
					signal
				).then(
					() => events.close(),
					(error: unknown) => events.fail(error)
				);

				return events;
			}
		};
	}

	private parseToolArguments(args: string | Record<string, unknown>): Record<string, unknown> {
		if (typeof args === 'object') return args;

		const trimmed = args.trim();

		if (trimmed === '') return {};

		return JSON.parse(trimmed) as Record<string, unknown>;
	}

	/**
	 * Run the `flow` hooks of the extensions and collect what they want run
	 * when the flow ends. A hook that throws is skipped.
	 */
	private startFlowHooks(conversationId: string): Array<() => void | Promise<void>> {
		const cleanups: Array<() => void | Promise<void>> = [];

		for (const hook of extensions.contributions('flow')) {
			try {
				const cleanup = hook({ conversationId });

				if (cleanup) cleanups.push(cleanup);
			} catch (err) {
				console.warn('[AgenticStore] A flow hook failed:', err);
			}
		}

		return cleanups;
	}

	/**
	 * The tools a flow under this policy offers the model, none when agentic
	 * is off. Server tools are fetched first: a disabled /tools endpoint stays
	 * disabled for the life of the server, so the tools panel is the only
	 * place that probes it again. The providers get their tools ready next,
	 * and the collection filters by the policy, so switching policies never
	 * makes a provider start over; a caller without a policy falls back to
	 * the global defaults.
	 */
	private async toolsFor(toolPolicy?: AgenticToolPolicy): Promise<OpenAIToolDefinition[]> {
		if (
			toolsStore.serverTools.length === 0 &&
			!toolsStore.loading &&
			!toolsStore.isToolsEndpointUnreachable
		) {
			await toolsStore.fetchServerTools();
		}

		if (!this.getConfig(settingsStore.config).enabled) return [];

		const disabledTools = new Set(toolPolicy?.disabledTools ?? toolsStore.disabledTools);
		const disabledToolCategories = new Set(
			toolPolicy?.disabledToolCategories ?? toolsStore.disabledToolCategories
		);

		for (const provider of toolsStore.providers) await provider.prepare?.();

		return toolsStore.getEnabledToolsForLLM(disabledTools, disabledToolCategories);
	}

	private updateSession(conversationId: string, update: Partial<AgenticSession>): void {
		const session = this.getSession(conversationId);

		this.sessions.set(conversationId, { ...session, ...update });
	}
}

export const agenticStore = new AgenticStore();

// The agentic flow end to end, with the server and the tools mocked: what the
// model is sent each turn, and the order the flow's callbacks fire in.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/database.service', () => ({
	DatabaseService: {}
}));

import { BuiltInTool, MessageRole, ToolPermissionDecision, ToolSource } from '$lib/enums';
import type { Extension, ToolProvider } from '$lib/extensions';
import { extensions } from '$lib/extensions';
import { ChatService } from '$lib/services/chat.service';
import { ToolsService } from '$lib/services/tools.service';
import { agenticStore } from '$lib/stores/agentic/index.svelte';
import { modelsStore } from '$lib/stores/models/index.svelte';
import { permissionsStore } from '$lib/stores/permissions.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { AgenticFlowCallbacks } from '$lib/types/agentic';
import type { ApiChatMessageData } from '$lib/types/api';
import type { ChatMessageTimings } from '$lib/types/chat';
import type { DatabaseMessage } from '$lib/types/database';

const CONV_ID = 'conv-1';
const USER_MESSAGES: ApiChatMessageData[] = [{ content: 'hi', role: MessageRole.USER }];
const IMAGE_DATA_URI = 'data:image/png;base64,AAAA';

type StreamOptions = {
	onChunk?: (chunk: string) => void;
	onReasoningChunk?: (chunk: string) => void;
	onTimings?: (timings?: ChatMessageTimings) => void;
	onToolCallChunk?: (serialized: string) => void;
};
type Turn = (options: StreamOptions) => void | Promise<void>;

function toolCalls(...names: string[]): string {
	return JSON.stringify(
		names.map((name, index) => ({ function: { arguments: '{}', name }, id: `call_${index}` }))
	);
}

// each request plays the next scripted turn; returns what every request was sent
function mockTurns(...turns: Turn[]): ApiChatMessageData[][] {
	const requests: ApiChatMessageData[][] = [];

	vi.spyOn(ChatService, 'sendMessage').mockImplementation(async (messages, options) => {
		requests.push(structuredClone(messages) as ApiChatMessageData[]);
		await turns[requests.length - 1]?.(options as StreamOptions);
	});

	return requests;
}

function mockTools(source: ToolSource, ...names: string[]) {
	vi.spyOn(toolsStore, 'getEnabledToolsForLLM').mockReturnValue(
		names.map((name) => ({ function: { name, parameters: {} }, type: 'function' }))
	);
	vi.spyOn(toolsStore, 'getToolSource').mockReturnValue(source);
}

// callbacks that log their calls in order
function recorder() {
	const calls: unknown[][] = [];
	const log =
		(name: string) =>
		(...args: unknown[]) => {
			calls.push([name, ...args]);
		};

	let nextMessageId = 0;

	const createMessage =
		(name: string) =>
		async (...args: unknown[]) => {
			calls.push([name, ...args]);

			return { id: `msg_${nextMessageId++}` } as DatabaseMessage;
		};
	const callbacks: AgenticFlowCallbacks = {
		createAssistantMessage: createMessage('createAssistantMessage'),
		createToolResultMessage: createMessage('createToolResultMessage'),
		onAssistantTurnComplete: async (...args) => {
			calls.push(['onAssistantTurnComplete', ...args]);
		},
		onAttachments: log('onAttachments'),
		onChunk: log('onChunk'),
		onError: log('onError'),
		onFlowComplete: log('onFlowComplete'),
		onReasoningChunk: log('onReasoningChunk'),
		onToolCallsStreaming: log('onToolCallsStreaming'),
		onTurnComplete: log('onTurnComplete'),
		updateToolResultMessage: async (...args) => {
			calls.push(['updateToolResultMessage', ...args]);
		}
	};

	return {
		callbacks,
		calls,
		named: (name: string) => calls.filter((call) => call[0] === name),
		names: () => calls.map((call) => call[0])
	};
}

// the registry has no way to forget an extension, so every test registers its own
let nextExtensionId = 0;

const activeExtensionIds: string[] = [];

async function activateExtension(extension: Extension): Promise<void> {
	const id = `flow-test-${nextExtensionId++}`;

	extensions.register({
		description: 'A test extension',
		id,
		load: async () => ({ default: extension }),
		name: id
	});
	await extensions.setEnabled(id, true);
	activeExtensionIds.push(id);
}

function makeProvider(overrides: Partial<ToolProvider> = {}): ToolProvider {
	return {
		entries: () => [],
		execute: async () => ({ content: '', isError: false }),
		isConfigured: () => true,
		source: ToolSource.MCP,
		...overrides
	};
}

function runFlow(callbacks: AgenticFlowCallbacks, signal?: AbortSignal) {
	return agenticStore.runAgenticFlow({
		callbacks,
		conversationId: CONV_ID,
		messages: USER_MESSAGES,
		signal
	});
}

beforeEach(() => {
	vi.restoreAllMocks();
	agenticStore.clearSession(CONV_ID);
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(ChatService, 'normalizeMessagesForApi').mockImplementation(
		async (messages) => messages as ApiChatMessageData[]
	);
	vi.spyOn(toolsStore, 'fetchServerTools').mockResolvedValue();
	vi.spyOn(toolsStore, 'getToolServerLabel').mockReturnValue('Browser');
	vi.spyOn(toolsStore, 'getPermissionKey').mockReturnValue('tool-key');
	vi.spyOn(permissionsStore, 'hasTool').mockReturnValue(true);
});

afterEach(async () => {
	for (const id of activeExtensionIds.splice(0)) await extensions.setEnabled(id, false);
});

describe('agentic flow', () => {
	it('is not handled when no tool is enabled', async () => {
		vi.spyOn(toolsStore, 'getEnabledToolsForLLM').mockReturnValue([]);

		const send = vi.spyOn(ChatService, 'sendMessage');

		expect(await runFlow(recorder().callbacks)).toEqual({ handled: false });
		expect(send).not.toHaveBeenCalled();
	});

	it('runs a tool call, then lets the model answer', async () => {
		mockTools(ToolSource.BROWSER, BuiltInTool.BROWSER_GET_DATETIME);

		const requests = mockTurns(
			(options) => {
				options.onChunk?.('checking');
				options.onToolCallChunk?.(toolCalls(BuiltInTool.BROWSER_GET_DATETIME));
				options.onTimings?.({ predicted_ms: 10, predicted_n: 4, prompt_ms: 20, prompt_n: 8 });
			},
			(options) => {
				options.onReasoningChunk?.('hm');
				options.onChunk?.('it is noon');
				options.onTimings?.({ predicted_ms: 5, predicted_n: 2, prompt_ms: 1, prompt_n: 1 });
			}
		);
		const { callbacks, named, names } = recorder();

		expect(await runFlow(callbacks)).toEqual({ handled: true });
		expect(names()).toEqual([
			'onChunk',
			'onToolCallsStreaming',
			'onAssistantTurnComplete',
			'createToolResultMessage',
			'onTurnComplete',
			'createAssistantMessage',
			'onReasoningChunk',
			'onChunk',
			'onAssistantTurnComplete',
			'onTurnComplete',
			'onFlowComplete'
		]);

		const [toolTurn, finalTurn] = named('onAssistantTurnComplete');
		const call = {
			function: { arguments: '{}', name: BuiltInTool.BROWSER_GET_DATETIME },
			id: 'call_0',
			type: 'function'
		};

		expect(toolTurn.slice(1)).toEqual([
			'checking',
			undefined,
			{ predicted_ms: 10, predicted_n: 4, prompt_ms: 20, prompt_n: 8 },
			[call]
		]);
		expect(finalTurn.slice(1, 3)).toEqual(['it is noon', 'hm']);
		expect(finalTurn[4]).toBeUndefined();

		const [, toolCallId, toolResult, extras] = named('createToolResultMessage')[0];

		expect([toolCallId, extras]).toEqual(['call_0', undefined]);
		expect(requests[1].slice(1)).toEqual([
			{ content: 'checking', role: 'assistant', tool_calls: [call] },
			{ content: toolResult, role: 'tool', tool_call_id: 'call_0' }
		]);
		expect(named('onFlowComplete')[0][1]).toMatchObject({
			agentic: {
				llm: { predicted_ms: 15, predicted_n: 6, prompt_ms: 21, prompt_n: 9 },
				perTurn: [{ turn: 1 }, { turn: 2 }],
				toolCalls: [{ name: BuiltInTool.BROWSER_GET_DATETIME, success: true }],
				toolCallsCount: 1,
				turns: 2
			},
			predicted_n: 2
		});
		expect(agenticStore.getTotalToolCalls(CONV_ID)).toBe(1);
		expect(agenticStore.isRunning(CONV_ID)).toBe(false);
	});

	it('waits for permission and tells the model when it is denied', async () => {
		mockTools(ToolSource.BROWSER, BuiltInTool.BROWSER_GET_DATETIME);
		vi.mocked(permissionsStore.hasTool).mockReturnValue(false);

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls(BuiltInTool.BROWSER_GET_DATETIME)),
			(options) => options.onChunk?.('ok')
		);
		const { callbacks, named } = recorder();
		const flow = runFlow(callbacks);

		await vi.waitFor(() =>
			expect(agenticStore.getPendingPermissionRequest(CONV_ID)).toEqual({
				serverLabel: 'Browser',
				toolName: BuiltInTool.BROWSER_GET_DATETIME
			})
		);
		agenticStore.resolvePermission(CONV_ID, ToolPermissionDecision.DENY);
		await flow;

		expect(named('createToolResultMessage')[0].slice(1)).toEqual([
			'call_0',
			'Tool execution was denied by the user.',
			undefined
		]);
		expect(requests[1][2]).toMatchObject({ content: 'Tool execution was denied by the user.' });
		expect(named('onFlowComplete')[0][1]).toMatchObject({
			agentic: { toolCalls: [{ success: false }] }
		});
	});

	it('reports a failing tool to the model and goes on', async () => {
		mockTools(ToolSource.SERVER, 'read_file');
		vi.spyOn(ToolsService, 'executeTool').mockRejectedValue(new Error('no such file'));

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls('read_file')),
			(options) => options.onChunk?.('sorry')
		);
		const { callbacks } = recorder();

		expect(await runFlow(callbacks)).toEqual({ handled: true });
		expect(requests[1][2]).toMatchObject({ content: 'Error: no such file', role: 'tool' });
	});

	it('shows the output of a streaming tool while it runs', async () => {
		mockTools(ToolSource.SERVER, BuiltInTool.SERVER_EXEC_SHELL_COMMAND);
		vi.spyOn(ToolsService, 'streamTool').mockImplementation(async function* () {
			yield { chunk: 'one\n', done: false };
			await new Promise((resolve) => setTimeout(resolve, 0));
			yield { chunk: 'two\n', done: false };
			await new Promise((resolve) => setTimeout(resolve, 0));
			yield { chunk: null, done: true };
		});

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls(BuiltInTool.SERVER_EXEC_SHELL_COMMAND)),
			(options) => options.onChunk?.('done')
		);
		const { callbacks, named } = recorder();

		await runFlow(callbacks);

		// created empty when the tool starts, then rewritten in place: never created twice
		expect(named('createToolResultMessage').map((call) => call.slice(1))).toEqual([
			['call_0', '', undefined, undefined]
		]);
		expect(named('updateToolResultMessage').map((call) => call.slice(1))).toEqual([
			['msg_0', 'one\n'],
			['msg_0', 'one\ntwo\n']
		]);
		expect(requests[1][2]).toMatchObject({ content: 'one\ntwo\n', role: 'tool' });
	});

	it('takes an image out of a tool result and sends it to a model with vision', async () => {
		mockTools(ToolSource.SERVER, 'screenshot');
		vi.spyOn(ToolsService, 'executeTool').mockResolvedValue({
			content: `saved\n${IMAGE_DATA_URI}`,
			isError: false
		});
		vi.spyOn(modelsStore.props, 'modelSupportsVision').mockReturnValue(true);

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls('screenshot')),
			(options) => options.onChunk?.('here')
		);
		const { callbacks, named } = recorder();

		await runFlow(callbacks);

		const [, , content, extras] = named('createToolResultMessage')[0];

		expect(content).toMatch(/^saved\n\[Attachment saved: .+\.png\]$/);
		expect(extras).toMatchObject([{ base64Url: IMAGE_DATA_URI, type: 'IMAGE' }]);
		expect(named('onAttachments')[0].slice(1)).toEqual(['msg_0', extras]);
		expect(requests[1][2]).toEqual({
			content: [
				{ text: content, type: 'text' },
				{ image_url: { url: IMAGE_DATA_URI }, type: 'image_url' }
			],
			role: 'tool',
			tool_call_id: 'call_0'
		});
	});

	it('leaves the flow when a steering message is queued, skipping the tool calls left', async () => {
		mockTools(ToolSource.SERVER, 'first', 'second');
		vi.spyOn(ToolsService, 'executeTool').mockImplementation(async () => {
			agenticStore.injectSteeringMessage(CONV_ID, 'wait');

			return { content: 'first ran', isError: false };
		});

		const requests = mockTurns((options) =>
			options.onToolCallChunk?.(toolCalls('first', 'second'))
		);
		const { callbacks, named, names } = recorder();

		expect(await runFlow(callbacks)).toEqual({ handled: true });
		expect(named('createToolResultMessage').map((call) => call.slice(1, 3))).toEqual([
			['call_0', 'first ran'],
			['call_1', 'Tool execution was interrupted by a new user message.']
		]);
		expect(names().slice(-2)).toEqual(['onTurnComplete', 'onFlowComplete']);
		expect(requests).toHaveLength(1);
		expect(agenticStore.consumePendingSteeringMessage(CONV_ID)).toMatchObject({ content: 'wait' });
	});

	it('keeps the partial turn and reports the error when the stream fails', async () => {
		mockTools(ToolSource.BROWSER, BuiltInTool.BROWSER_GET_DATETIME);
		mockTurns((options) => {
			options.onChunk?.('par');

			throw new Error('HTTP 500');
		});

		const { callbacks, named, names } = recorder();
		const result = await runFlow(callbacks);

		expect(result).toMatchObject({ error: { message: 'HTTP 500' }, handled: true });
		expect(names()).toEqual(['onChunk', 'onAssistantTurnComplete', 'onFlowComplete', 'onError']);
		expect(named('onAssistantTurnComplete')[0].slice(1)).toEqual([
			'par',
			undefined,
			undefined,
			undefined
		]);
		expect(agenticStore.getLastError(CONV_ID)?.message).toBe('HTTP 500');
	});

	it('stops without a tool result when the user aborts during a tool call', async () => {
		const controller = new AbortController();

		mockTools(ToolSource.SERVER, 'slow');
		vi.spyOn(ToolsService, 'executeTool').mockImplementation(async () => {
			controller.abort();

			return { content: 'late', isError: false };
		});

		const requests = mockTurns((options) => options.onToolCallChunk?.(toolCalls('slow')));
		const { callbacks, named, names } = recorder();

		expect(await runFlow(callbacks, controller.signal)).toEqual({ handled: true });
		expect(named('createToolResultMessage')).toEqual([]);
		expect(names().slice(-1)).toEqual(['onFlowComplete']);
		expect(requests).toHaveLength(1);
	});
});

describe('agentic flow with extensions', () => {
	it('gets the providers ready, then runs a tool call through the provider of its source', async () => {
		const order: string[] = [];
		const execute = vi.fn<ToolProvider['execute']>(async () => {
			order.push('execute');

			return { content: 'found it', isError: false };
		});

		await activateExtension({
			activate: (ctx) =>
				ctx.contribute(
					'tools',
					makeProvider({ execute, prepare: async () => void order.push('prepare') })
				)
		});
		mockTools(ToolSource.MCP, 'search');
		vi.mocked(toolsStore.getEnabledToolsForLLM).mockImplementation(() => {
			order.push('list');

			return [{ function: { name: 'search', parameters: {} }, type: 'function' }];
		});

		const controller = new AbortController();
		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls('search')),
			(options) => options.onChunk?.('done')
		);
		const { callbacks, named } = recorder();

		expect(await runFlow(callbacks, controller.signal)).toEqual({ handled: true });
		expect(order).toEqual(['prepare', 'list', 'execute']);
		expect(execute.mock.calls[0][0]).toEqual({ arguments: '{}', id: 'call_0', name: 'search' });
		expect(execute.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
		expect(requests[1][2]).toMatchObject({ content: 'found it', role: 'tool' });
		expect(named('onFlowComplete')[0][1]).toMatchObject({
			agentic: { toolCalls: [{ name: 'search', success: true }] }
		});
	});

	it('reports a failing provider to the model and goes on', async () => {
		await activateExtension({
			activate: (ctx) =>
				ctx.contribute(
					'tools',
					makeProvider({
						execute: async () => {
							throw new Error('server is down');
						}
					})
				)
		});
		mockTools(ToolSource.MCP, 'search');

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls('search')),
			(options) => options.onChunk?.('sorry')
		);

		expect(await runFlow(recorder().callbacks)).toEqual({ handled: true });
		expect(requests[1][2]).toMatchObject({ content: 'Error: server is down', role: 'tool' });
	});

	it('tells the model the tool is unknown when no extension provides its source', async () => {
		mockTools(ToolSource.MCP, 'search');

		const requests = mockTurns(
			(options) => options.onToolCallChunk?.(toolCalls('search')),
			(options) => options.onChunk?.('sorry')
		);
		const { callbacks, named } = recorder();

		expect(await runFlow(callbacks)).toEqual({ handled: true });
		expect(requests[1][2]).toMatchObject({ content: 'Error: Unknown tool: search', role: 'tool' });
		expect(named('onFlowComplete')[0][1]).toMatchObject({
			agentic: { toolCalls: [{ name: 'search', success: false }] }
		});
	});

	it('is enabled by a configured provider alone', async () => {
		vi.spyOn(toolsStore, 'browserTools', 'get').mockReturnValue([]);

		const config = () => agenticStore.getConfig({ agenticMaxTurns: 5 } as never);

		expect(config().enabled).toBe(false);

		await activateExtension({
			activate: (ctx) => ctx.contribute('tools', makeProvider({ isConfigured: () => false }))
		});

		expect(config().enabled).toBe(false);

		await activateExtension({ activate: (ctx) => ctx.contribute('tools', makeProvider()) });

		expect(config().enabled).toBe(true);
	});

	it('runs the flow hooks around the flow, also when one of them fails', async () => {
		const order: string[] = [];
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await activateExtension({
			activate(ctx) {
				ctx.contribute('flow', () => {
					throw new Error('bad start');
				});
				ctx.contribute('flow', () => async () => {
					order.push('failing end');

					throw new Error('bad end');
				});
				ctx.contribute('flow', ({ conversationId }) => {
					order.push(`start ${conversationId}`);

					return () => void order.push('end');
				});
				ctx.contribute('flow', () => void order.push('start without end'));
			}
		});
		mockTools(ToolSource.BROWSER, BuiltInTool.BROWSER_GET_DATETIME);
		mockTurns((options) => {
			order.push(`turn, running: ${agenticStore.isRunning(CONV_ID)}`);
			options.onChunk?.('hi');
		});

		expect(await runFlow(recorder().callbacks)).toEqual({ handled: true });
		expect(order).toEqual([
			`start ${CONV_ID}`,
			'start without end',
			'turn, running: true',
			'failing end',
			'end'
		]);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(agenticStore.isRunning(CONV_ID)).toBe(false);
	});

	it('runs the end of the flow hooks when the flow fails', async () => {
		const end = vi.fn();

		await activateExtension({ activate: (ctx) => ctx.contribute('flow', () => end) });
		mockTools(ToolSource.BROWSER, BuiltInTool.BROWSER_GET_DATETIME);
		mockTurns(() => {
			throw new Error('HTTP 500');
		});

		expect(await runFlow(recorder().callbacks)).toMatchObject({ handled: true });
		expect(end).toHaveBeenCalledOnce();
	});

	it('leaves the flow hooks alone when no tool is enabled', async () => {
		const hook = vi.fn();

		await activateExtension({ activate: (ctx) => ctx.contribute('flow', hook) });
		vi.spyOn(toolsStore, 'getEnabledToolsForLLM').mockReturnValue([]);

		expect(await runFlow(recorder().callbacks)).toEqual({ handled: false });
		expect(hook).not.toHaveBeenCalled();
	});
});

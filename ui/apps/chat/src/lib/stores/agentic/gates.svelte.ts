/**
 * AgenticGates - User interaction gates for the agentic loop
 *
 * Owns the state the loop waits on between turns: tool permission requests,
 * turn-limit continue prompts and queued steering messages. The loop awaits
 * requestPermission/requestContinue; the UI resolves them through
 * resolvePermission/resolveContinue. Owned by agenticStore, no host coupling.
 */

import { PermissionEffect, ToolPermissionDecision } from '#lib/enums/index.ts';
// direct imports between stores, not via the barrel, to avoid circular deps
import { permissionsStore } from '#lib/stores/permissions.svelte.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';
import type {
	DatabaseMessageExtra,
	PermissionAnswer,
	PermissionRequest,
	PermissionRule,
	SteeringMessage
} from '#lib/types/index.ts';
import { SvelteMap } from 'svelte/reactivity';

export class AgenticGates {
	/** Resolve functions for pending continue Promises; nothing derives from this map */
	private continueResolvers = new SvelteMap<string, (shouldContinue: boolean) => void>();
	/** Dedicated reactive state for pending continue requests (turn limit reached) */
	private pendingContinueRequests = new SvelteMap<string, boolean>();

	/** Dedicated reactive state for pending permission requests (ensures immediate UI updates) */
	private pendingPermissions = new SvelteMap<string, PermissionRequest | null>();
	/** Resolve functions for pending permission Promises; nothing derives from this map */
	private permissionResolvers = new SvelteMap<
		string,
		(decision: ToolPermissionDecision, answer?: PermissionAnswer) => void
	>();

	/** Reactive: queued steering messages to inject between turns */
	private steeringMessages = new SvelteMap<string, SteeringMessage>();

	/**
	 * Drop all pending gate state for a conversation, e.g. when a flow exits.
	 */
	clear(conversationId: string): void {
		this.pendingPermissions.set(conversationId, null);
		this.permissionResolvers.delete(conversationId);
		this.pendingContinueRequests.set(conversationId, false);
		this.continueResolvers.delete(conversationId);
		this.steeringMessages.delete(conversationId);
	}

	/**
	 * Clear the pending steering message without consuming it.
	 */
	clearSteeringMessage(conversationId: string): void {
		this.steeringMessages.delete(conversationId);
	}

	/**
	 * Consume and return the pending steering message for re-sending.
	 * Called by chatStore after the agentic flow exits.
	 */
	consumePendingSteeringMessage(conversationId: string): SteeringMessage | null {
		const msg = this.steeringMessages.get(conversationId);

		if (!msg) return null;

		this.steeringMessages.delete(conversationId);

		return msg;
	}

	getPendingContinueRequest(conversationId: string): boolean {
		return this.pendingContinueRequests.get(conversationId) ?? false;
	}

	getPendingPermissionRequest(conversationId: string): PermissionRequest | null {
		return this.pendingPermissions.get(conversationId) ?? null;
	}

	getPendingSteeringMessageContent(conversationId: string): string | null {
		return this.steeringMessages.get(conversationId)?.content ?? null;
	}

	getPendingSteeringMessageExtras(conversationId: string): DatabaseMessageExtra[] | undefined {
		return this.steeringMessages.get(conversationId)?.extras;
	}

	hasPendingSteeringMessage(conversationId: string): boolean {
		return this.steeringMessages.has(conversationId);
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
		this.steeringMessages.set(conversationId, { content, extras });
	}

	async requestContinue(conversationId: string, signal?: AbortSignal): Promise<boolean> {
		this.pendingContinueRequests.set(conversationId, true);

		return new Promise<boolean>((resolve) => {
			if (signal?.aborted) {
				this.pendingContinueRequests.set(conversationId, false);
				resolve(false);

				return;
			}

			this.continueResolvers.set(conversationId, (shouldContinue) => {
				this.pendingContinueRequests.set(conversationId, false);
				resolve(shouldContinue);
			});

			signal?.addEventListener(
				'abort',
				() => {
					const resolver = this.continueResolvers.get(conversationId);

					if (resolver) {
						this.continueResolvers.delete(conversationId);
						this.pendingContinueRequests.set(conversationId, false);
						resolve(false);
					}
				},
				{ once: true }
			);
		});
	}

	/**
	 * Ask the user about a tool call, and keep what they chose to remember:
	 * for this conversation, in its working folder, everywhere, or every tool
	 * of the same server. A stopped run counts as a denial.
	 */
	async requestPermission(
		conversationId: string,
		request: PermissionRequest,
		signal?: AbortSignal
	): Promise<ToolPermissionDecision> {
		this.pendingPermissions.set(conversationId, request);

		return new Promise<ToolPermissionDecision>((resolve) => {
			if (signal?.aborted) {
				this.pendingPermissions.set(conversationId, null);
				resolve(ToolPermissionDecision.DENY);

				return;
			}

			this.permissionResolvers.set(conversationId, (decision, answer) => {
				this.pendingPermissions.set(conversationId, null);
				this.remember(conversationId, request, decision, answer);
				resolve(decision);
			});

			signal?.addEventListener(
				'abort',
				() => {
					const resolver = this.permissionResolvers.get(conversationId);

					if (resolver) {
						this.permissionResolvers.delete(conversationId);
						this.pendingPermissions.set(conversationId, null);
						resolve(ToolPermissionDecision.DENY);
					}
				},
				{ once: true }
			);
		});
	}

	resolveContinue(conversationId: string, shouldContinue: boolean): void {
		const resolver = this.continueResolvers.get(conversationId);

		if (resolver) {
			this.continueResolvers.delete(conversationId);
			resolver(shouldContinue);
		}
	}

	resolvePermission(
		conversationId: string,
		decision: ToolPermissionDecision,
		answer?: PermissionAnswer
	): void {
		const resolver = this.permissionResolvers.get(conversationId);

		if (resolver) {
			this.permissionResolvers.delete(conversationId);
			resolver(decision, answer);
		}
	}

	private remember(
		conversationId: string,
		request: PermissionRequest,
		decision: ToolPermissionDecision,
		answer?: PermissionAnswer
	): void {
		if (decision === ToolPermissionDecision.ALWAYS_SERVER) {
			const serverToolKeys = toolsStore.allTools
				.filter((t) =>
					t.serverName
						? t.serverName === request.serverLabel
						: toolsStore.getToolServerLabel(t.definition.function.name) === request.serverLabel
				)
				.map((t) => toolsStore.getPermissionKey(t.definition.function.name))
				.filter((k): k is string => k !== null);

			permissionsStore.allowTools(serverToolKeys);

			return;
		}

		const patterns = (answer?.patterns ?? request.patterns)
			.map((pattern) => pattern.trim())
			.filter(Boolean);
		// a shell command is remembered by its patterns, any other tool as a whole
		const rules: Omit<PermissionRule, 'createdAt' | 'id'>[] =
			request.command !== undefined && patterns.length > 0
				? patterns.map((pattern) => ({
						effect: PermissionEffect.ALLOW,
						pattern,
						tool: request.toolKey
					}))
				: [{ effect: PermissionEffect.ALLOW, tool: request.toolKey }];

		if (decision === ToolPermissionDecision.SESSION) {
			permissionsStore.addSessionRules(conversationId, rules);
		} else if (decision === ToolPermissionDecision.ALWAYS_HERE && request.cwd) {
			permissionsStore.addRules(rules.map((rule) => ({ ...rule, cwd: request.cwd })));
		} else if (decision === ToolPermissionDecision.ALWAYS) {
			permissionsStore.addRules(rules);
		}
	}
}

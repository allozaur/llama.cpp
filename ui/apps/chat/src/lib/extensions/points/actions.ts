import type { Component } from 'svelte';

/** An action of an extension on a conversation, listed in every conversation menu after Export. */
export interface ConversationAction {
	icon: Component;
	/** Stable identity among the menu's actions. */
	id: string;
	label: string;
	run(conversationId: string): void;
}

/** The message an action was started from: the last one of its turn, for an agentic reply. */
export interface MessageActionTarget {
	conversationId: string;
	messageId: string;
}

/** An action of an extension on a message, under the message and in its context menu. */
export interface MessageAction {
	icon: Component;
	/** Stable identity among the message's actions. */
	id: string;
	label: string;
	run(target: MessageActionTarget): void;
}

/**
 * A component the app mounts once while the extension is on, with no props: a dialog the
 * extension opens from its own state, for instance.
 */
export type Overlay = Component<Record<string, never>>;

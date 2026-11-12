/**
 * The renderer extension points: an extension draws the messages and the
 * attachments it claims, in place of what the core draws for them.
 */

import type { ChatAttachmentDisplayItem, DatabaseMessage } from '$lib/types';
import type { Component } from 'svelte';

/** What a message renderer's component gets. It is drawn inside the message, so the message contexts are there. */
export interface MessageRendererProps {
	class?: string;
	message: DatabaseMessage;
}

/** Draws the messages it claims in place of the default message. System messages are never offered. */
export interface MessageRenderer {
	component: Component<MessageRendererProps>;
	/** False when a claimed message cannot be forked. Left out, it can. */
	forkable?: boolean;
	/** Whether this renderer draws the message. The first renderer that claims it wins. */
	match(message: DatabaseMessage): boolean;
}

/** What an attachment renderer's component gets. */
export interface AttachmentRendererProps {
	/** The classes the attachments list gives each of its items. */
	class?: string;
	item: ChatAttachmentDisplayItem;
	/** Removes the item. Left out where attachments cannot be removed. */
	onRemove?: () => void;
	readonly?: boolean;
}

/**
 * Draws the attachments it claims in place of the default chip. A claimed
 * attachment stays out of the built-in preview, so its renderer shows the
 * content itself when it has a way to.
 */
export interface AttachmentRenderer {
	component: Component<AttachmentRendererProps>;
	/** Whether this renderer draws the item. The first renderer that claims it wins. */
	match(item: ChatAttachmentDisplayItem): boolean;
}

/** The renderer that claims an attachment, if any. */
export function findAttachmentRenderer(
	renderers: AttachmentRenderer[],
	item: ChatAttachmentDisplayItem
): AttachmentRenderer | undefined {
	return renderers.find((renderer) => renderer.match(item));
}

/** The renderer that claims a message, if any. */
export function findMessageRenderer(
	renderers: MessageRenderer[],
	message: DatabaseMessage
): MessageRenderer | undefined {
	return renderers.find((renderer) => renderer.match(message));
}

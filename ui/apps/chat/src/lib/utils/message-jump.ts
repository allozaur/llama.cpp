import type { DatabaseMessage } from '#lib/types/database.js';

/** Marks a message's row in the conversation, so a jump can find it. */
export const MESSAGE_ROW_ATTRIBUTE = 'data-message-id';

/** How long the rows' heights must rest before a jump lets go of its row. */
const JUMP_QUIET_MS = 1000;
/** What the reader does to take the scroll back from a jump. */
const JUMP_CANCEL_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

/**
 * The id of the row that shows a message: its own, or for a message drawn inside
 * another's row (a tool result in the turn that called it) the nearest message
 * before it that has a row. Null when no row shows it.
 */
export function findMessageRowId(
	messages: DatabaseMessage[],
	messageId: string,
	hasRow: (id: string) => boolean
): string | null {
	const byId = new Map(messages.map((message) => [message.id, message]));

	let current = byId.get(messageId);

	while (current) {
		if (hasRow(current.id)) return current.id;

		current = current.parent ? byId.get(current.parent) : undefined;
	}

	return null;
}

/** The row of a message in the open conversation, if it has one. */
export function messageRow(messageId: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		`[${MESSAGE_ROW_ATTRIBUTE}="${CSS.escape(messageId)}"]`
	);
}

/**
 * Brings a row to the top of the view and holds it there while the list settles:
 * the rows around it are placeholders until they come near, and each one that
 * mounts takes its real height and moves the rest. The row is put back whenever
 * the list changes size, before the frame is painted, until the sizes rest or
 * the reader scrolls, presses or types. Returns a function that ends the hold.
 */
export function scrollToMessageRow(row: HTMLElement): () => void {
	let quietTimer: ReturnType<typeof setTimeout> | undefined;

	const stop = () => {
		observer.disconnect();
		clearTimeout(quietTimer);

		for (const type of JUMP_CANCEL_EVENTS) {
			window.removeEventListener(type, stop, { capture: true });
		}
	};
	const land = () => {
		row.scrollIntoView({ block: 'start' });
		clearTimeout(quietTimer);
		quietTimer = setTimeout(stop, JUMP_QUIET_MS);
	};
	// the rows' container grows and shrinks with every row in it
	const observer = new ResizeObserver(land);

	for (const type of JUMP_CANCEL_EVENTS) {
		window.addEventListener(type, stop, { capture: true, passive: true });
	}

	if (row.parentElement) observer.observe(row.parentElement);

	land();

	return stop;
}

/**
 * What an extension can add to the composer, the chat form: slash commands,
 * the pickers they open, and attachments it holds until the message is sent.
 */

import type { ChatUploadedFile, DatabaseMessageExtra } from '$lib/types';
import type { Component } from 'svelte';

/** What the chat form lets a contribution do to it. */
export interface ComposerHandle {
	/** Add an entry to the form's files, e.g. a chip for content that still loads. */
	addUploadedFile(file: ChatUploadedFile): void;
	/** Close the contributed picker that is open. Focus stays where it is. */
	closePicker(): void;
	focusInput(): void;
	/** Open a contributed picker by its id, with `query` as its search. */
	openPicker(id: string, query?: string): void;
	/** Change the entry with this id in the form's files, if it is still there. */
	updateUploadedFile(id: string, update: (file: ChatUploadedFile) => ChatUploadedFile): void;
}

/** A slash command in the chat form's `/` picker. */
export interface ComposerCommand {
	/** What is typed after the slash, e.g. `prompt` for `/prompt`. No other command has it. */
	name: string;
	description: string;
	icon: Component;
	/** Extra search terms that match the command in the picker. */
	keywords?: string[];
	/** Below zero it sorts before the built-in commands, otherwise (and by default) after them. */
	order?: number;
	/** Whether it can be picked now. A command that can not stays in the list, greyed out. The form reads this reactively. */
	isEnabled(): boolean;
	/** Called when the command is picked, after the form cleared its token. `args` is the text typed after the name. */
	run(composer: ComposerHandle, args: string): void;
}

export interface ComposerPickerProps {
	/** What the picker's popover floats by. */
	anchor: HTMLElement | null;
	composer: ComposerHandle;
	isOpen: boolean;
	/** Closes the picker and gives the focus back to the input. */
	onClose: () => void;
	/** What the picker was opened with, e.g. the text typed after its command. */
	query: string;
}

export interface ComposerPickerExports {
	/** Gets the keys typed in the input while the picker is open. Returns true for a key it used. */
	handleKeydown(event: KeyboardEvent): boolean;
}

/** A popover picker the chat form mounts. A command opens it with `ComposerHandle.openPicker`. */
export interface ComposerPicker {
	id: string;
	component: Component<ComposerPickerProps, ComposerPickerExports>;
}

export interface ComposerAttachmentsProps {
	class?: string;
}

/** Attachments that wait outside the chat form's files, e.g. in a store of the extension. */
export interface ComposerAttachments {
	/** Mounted under the input for as long as the form is. It draws the pending attachments, and nothing without them. */
	component: Component<ComposerAttachmentsProps>;
	/** The pending attachments as the extras of the message that is sent now. Clears them at their source. */
	consume(): DatabaseMessageExtra[];
	/** The form reads this reactively: with attachments pending it does not fit a single row. */
	hasPending(): boolean;
}

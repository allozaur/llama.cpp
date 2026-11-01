import type { ComposerHandle } from './composer';
import type { Component } from 'svelte';

/** A prompt a source offers as a system message, as the System message list shows it. */
export interface SystemPromptEntry {
	/** How many arguments the prompt asks for before it has text. Zero: picking it gives the text. */
	argumentCount: number;
	description?: string;
	/** Icon URL of where the prompt comes from, when it has one. */
	iconUrl: string | null;
	/** Stable identity; a system message keeps it to show the prompt it came from. */
	id: string;
	/** Where the prompt comes from, shown above its title, e.g. an MCP server's name. */
	origin: string;
	title: string;
}

/** What a source's card gets to draw a system message made from one of its prompts. */
export interface SystemPromptCardProps {
	class?: string;
	/** The message's text. */
	content: string;
	promptId: string;
	title: string;
}

/** A source of prompts for the chat form's System message list, beside the prompt library. */
export interface SystemPromptSource {
	/** Draws a system message made from one of the source's prompts, in place of the library's prompt card. */
	card?: Component<SystemPromptCardProps>;
	/** Drawn for an entry that has no icon of its own. */
	icon: Component<{ class?: string }>;
	id: string;
	/** Heading of the source's section in the list. */
	label: string;
	/** The prompts on offer. Called each time the list opens. */
	list(): Promise<SystemPromptEntry[]>;
	/** Whether a prompt id, as a system message keeps it, is one of this source's. */
	owns(promptId: string): boolean;
	/** Ask for the arguments of a prompt that needs them, in the chat form. */
	openArguments(entry: SystemPromptEntry, composer: ComposerHandle): void;
	/** The text of a prompt that needs no arguments, or null when it has none. */
	resolve(entry: SystemPromptEntry): Promise<string | null>;
}

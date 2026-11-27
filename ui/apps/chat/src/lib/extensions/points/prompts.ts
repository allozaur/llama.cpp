/**
 * The prompt sources point. A prompt is one kind of item whatever it comes from:
 * the library is the app's own source, and an extension adds another, such as the
 * prompts of MCP servers. Every list of prompts shows them together.
 */

import type { ComposerHandle } from './composer';
import type { Component } from 'svelte';

/** A prompt as the lists show it. */
export interface PromptEntry {
	/** Stable identity. A system message made from the prompt keeps it. */
	id: string;
	title: string;
	description?: string;
	/** Where the prompt comes from, shown on its row: the library, or an MCP server's name. */
	origin: string;
	/** Icon of the origin, when it has one of its own. */
	iconUrl?: string;
	/** How many arguments the prompt asks for before it has text. */
	argumentCount: number;
}

/** What a source's card gets to draw a system message made from one of its prompts. */
export interface PromptCardProps {
	class?: string;
	/** The message's text. */
	content: string;
	name: string;
	promptId: string;
}

/** A place prompts come from. */
export interface PromptSource {
	id: string;
	/** Heading of the source's prompts in a list. */
	label: string;
	/** Drawn for a prompt whose origin has no icon of its own. */
	icon: Component<{ class?: string }>;
	/** Draws a system message made from one of the source's prompts, in place of the default prompt card. */
	card?: Component<PromptCardProps>;
	/** The prompts on offer. Called each time a list opens. */
	list(): Promise<PromptEntry[]>;
	/** Whether a prompt id, as a system message keeps it, is one of this source's. */
	owns(promptId: string): boolean;
	/** Attach the prompt to the message being written. A prompt with arguments asks for them in the chat form first. */
	attach(entry: PromptEntry, composer: ComposerHandle): void;
	/**
	 * The prompt's text, to use as a system message. A prompt with arguments asks for them in
	 * the chat form first. Null when it has no text, or the user gave up.
	 */
	resolve(entry: PromptEntry, composer: ComposerHandle): Promise<string | null>;
}

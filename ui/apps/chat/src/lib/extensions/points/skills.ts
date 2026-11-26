/**
 * The skill sources point. A skill is one kind of item whatever it comes from:
 * the skills folders of the machine are the app's own source, and an extension
 * adds another, such as the skills MCP servers publish. The Library lists them
 * together.
 */

import type { Component } from 'svelte';

/** A skill as the Library lists it. */
export interface SkillEntry {
	/** Stable identity within its source. */
	id: string;
	name: string;
	description: string;
	/** Where the skill comes from, on its badge: a folder, or an MCP server's name. */
	origin: string;
}

/** A place skills come from. */
export interface SkillSource {
	id: string;
	/** Drawn on the tile of each of the source's skills. */
	icon: Component<{ class?: string }>;
	/** The skills on offer. Called each time the list shows. */
	list(): Promise<SkillEntry[]>;
	/** The text of the skill's SKILL.md, for the user to read. */
	read(entry: SkillEntry): Promise<string>;
}

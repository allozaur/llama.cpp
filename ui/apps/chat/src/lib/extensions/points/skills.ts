/**
 * The skill sources point. A skill is one kind of item whatever it comes from:
 * the skills folders of the machine are the app's own source, and an extension
 * adds another, such as the skills MCP servers publish. The Library lists them
 * together, and a chat uses them the same way: `/skill` attaches one, and the
 * model lists and loads them through the core's skill tools.
 */

import type { ComposerHandle } from './composer';
import type { ToolCallPermissionDetail } from './tools';
import type { Component } from 'svelte';

/** A skill as the lists show it. */
export interface SkillEntry {
	/** Stable identity within its source. */
	id: string;
	name: string;
	description: string;
	/** Where the skill comes from, on its badge: a folder, or an MCP server's name. */
	origin: string;
	/** Icon of the origin, when it has one of its own, such as an MCP server's favicon. */
	iconUrl?: string;
	/** Its files cannot be verified, so the model is not offered it. */
	isUnverified?: boolean;
}

/** What loading a skill for the model takes from the user right now. */
export interface SkillPermission {
	/** The user allowed the skill for good before, with other content than it has now. */
	hasChanged: boolean;
	/** Allowed with the content it has now: for good, or for as long as the page is open. */
	isAllowed: boolean;
	/** Drawn in the permission card under its question. */
	detail?: ToolCallPermissionDetail;
	/** The user said yes, for the content it has now: for now, or with `always` for good. */
	allow(always: boolean): void;
}

/** A place skills come from. */
export interface SkillSource {
	id: string;
	/** What one of its origins is, in the model's listing: "folder", "MCP server". */
	originKind: string;
	/** Drawn on the tile of each of the source's skills. */
	icon: Component<{ class?: string }>;
	/** Whether it can offer skills now. Read reactively: `/skill` and the skill tools go with it. */
	isAvailable(): boolean;
	/** The skills on offer. Called each time a list shows. */
	list(): Promise<SkillEntry[]>;
	/** The text of the skill's SKILL.md, for the user to read. Reading is not loading. */
	read(entry: SkillEntry): Promise<string>;
	/** Attach the skill to the message being written. Picking it is the user's yes to it. */
	attach(entry: SkillEntry, composer: ComposerHandle): Promise<void>;
	/** What loading the skill for the model takes from the user. Throws for one that cannot be loaded. */
	permission(entry: SkillEntry): Promise<SkillPermission>;
	/**
	 * The skill as the model gets it: its SKILL.md, or with `file` one of its other files,
	 * under a line that names where it comes from. Only a skill the user allowed with the
	 * content it has now. Throws otherwise.
	 */
	load(entry: SkillEntry, file?: string): Promise<string>;
}

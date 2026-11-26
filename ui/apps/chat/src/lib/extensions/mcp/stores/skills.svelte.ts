/**
 * McpSkillsStore - the skills MCP servers publish (Skills extension, SEP-2640)
 *
 * Per server: the listing, fetched on first need and kept for as long as the
 * server allows; which skills the user allowed, for now or for good; and the
 * reads of a skill's files, verified and always sent to the server the skill
 * came from. No file is fetched ahead of need. Created and owned by mcpStore,
 * which lends the connections.
 *
 * A skill is a server's text, not the user's: nothing in its frontmatter widens
 * what the model may do (`allowed-tools` is not read), and a skill is known by
 * the app's own id for its server plus its URI, never by its name alone.
 */

import { MCPService } from '../services/mcp.service';
import {
	type SkillApprovalRecords,
	SkillApprovals,
	type SkillApprovalStorage
} from '../skills/approvals';
import {
	MCP_SKILL_APPROVALS_LOCALSTORAGE_KEY,
	MCP_SKILL_DYNAMIC_RESOURCES,
	MCP_SKILLS_DEFAULT_TTL_MS
} from '../skills/constants';
import type {
	Skill,
	SkillFile,
	SkillVerificationReason
} from '@modelcontextprotocol/client/ext/skills';
import type { MCPConnection } from '#lib/types/index.ts';
import { SvelteMap } from 'svelte/reactivity';

/** The slice of mcpStore the skills need. */
export interface McpSkillsHost {
	/** A live connection to the server, opened when there is none. Undefined when it cannot be reached. */
	connectionFor(serverId: string): Promise<MCPConnection | undefined>;
}

/** A server's skills as last listed. */
export interface McpServerSkills {
	/** Why the last listing failed, when it did. */
	error?: string;
	/** When the listing stops being current, in ms since the epoch. */
	expiresAt: number;
	isLoading: boolean;
	skills: Skill[];
}

/** What loading a skill takes from the user right now. */
export interface McpSkillPermission {
	/** The user allowed the skill for good before, with other files than it has now. */
	hasChanged: boolean;
	/** Allowed with the files it has now: for good, or for as long as the page is open. */
	isAllowed: boolean;
	skill: Skill;
}

export interface McpLoadedSkillFile {
	file: SkillFile;
	/** The entry the file was verified against. */
	skill: Skill;
}

/** A load of a skill the user did not allow, or not with the files it has now. */
export class McpSkillNotAllowedError extends Error {
	constructor(skill: Skill) {
		super(`The user has not allowed the skill "${skill.frontmatter.name}".`);
	}
}

/** The file asked for is not one of the skill's: nothing is wrong with the entry itself. */
const UNLISTED_FILE: SkillVerificationReason = 'unlisted';
const localStorageApprovals: SkillApprovalStorage = {
	load() {
		try {
			const stored = localStorage.getItem(MCP_SKILL_APPROVALS_LOCALSTORAGE_KEY);
			const records: unknown = stored ? JSON.parse(stored) : null;

			return typeof records === 'object' && records !== null && !Array.isArray(records)
				? (records as SkillApprovalRecords)
				: {};
		} catch {
			return {};
		}
	},
	save(records) {
		try {
			localStorage.setItem(MCP_SKILL_APPROVALS_LOCALSTORAGE_KEY, JSON.stringify(records));
		} catch (error) {
			console.error('[MCPSkills] Failed to save the approved skills:', error);
		}
	}
};
/** Keeps nothing: what is allowed for now ends with the page. */
const NO_STORAGE: SkillApprovalStorage = { load: () => ({}), save: () => {} };

export class McpSkillsStore {
	// allowed for now: bound to a skill's files like an approval, and gone with the page
	private allowedForNow = new SkillApprovals(NO_STORAGE);
	// read on first use: nothing touches the storage before a skill is loaded
	private approvalRecords: SkillApprovals | undefined;
	// one listing request per server at a time; nothing derives from this map
	private listingRequests = new SvelteMap<string, Promise<Skill[]>>();
	private listings = new SvelteMap<string, McpServerSkills>();

	private get approvals(): SkillApprovals {
		return (this.approvalRecords ??= new SkillApprovals(this.storage));
	}

	/**
	 * The user's yes to a skill, for the files it has now: for as long as the
	 * page is open, or with `always` for good.
	 */
	allow(serverId: string, skill: Skill, always: boolean): void {
		if (always) this.approvals.approve(serverId, skill);
		else this.allowedForNow.approve(serverId, skill);
	}

	/** Drop the kept listings, of one server or of all: the next need lists again. */
	clearListings(serverId?: string): void {
		if (serverId === undefined) this.listings.clear();
		else this.listings.delete(serverId);
	}

	constructor(
		private host: McpSkillsHost,
		private storage: SkillApprovalStorage = localStorageApprovals
	) {}

	/** Forget a server the user removed: its listing and what was allowed of its skills. */
	forgetServer(serverId: string): void {
		this.clearListings(serverId);
		this.approvals.forgetServer(serverId);
		this.allowedForNow.forgetServer(serverId);
	}

	/**
	 * The skills of a server: the kept listing while it is current, a new one
	 * from the server otherwise. Not to be called from an effect without
	 * `untrack`: it reads and writes the listing.
	 */
	list(serverId: string): Promise<Skill[]> {
		const kept = this.listings.get(serverId);

		if (kept && kept.error === undefined && Date.now() < kept.expiresAt) {
			return Promise.resolve(kept.skills);
		}

		let request = this.listingRequests.get(serverId);

		if (!request) {
			request = this.fetchListing(serverId).finally(() => this.listingRequests.delete(serverId));
			this.listingRequests.set(serverId, request);
		}

		return request;
	}

	/** A server's skills as last listed, read reactively. Undefined before the first listing. */
	listingOf(serverId: string): McpServerSkills | undefined {
		return this.listings.get(serverId);
	}

	/**
	 * Load a skill for the model: its SKILL.md, or with `file` one of its other
	 * files. Only a skill the user allowed with the files it has now.
	 *
	 * @throws {McpSkillNotAllowedError} When the user did not allow it
	 */
	async load(serverId: string, uri: string, file?: string): Promise<McpLoadedSkillFile> {
		const { isAllowed, skill } = await this.permissionFor(serverId, uri);

		if (!isAllowed) throw new McpSkillNotAllowedError(skill);

		return { file: await this.read(serverId, skill, file), skill };
	}

	/**
	 * What loading a skill takes from the user: nothing when they allowed it
	 * with the files it has now. Throws for a skill that cannot be loaded at all.
	 */
	async permissionFor(serverId: string, uri: string): Promise<McpSkillPermission> {
		const skill = await this.entry(serverId, uri);

		this.assertVerifiable(skill);

		return {
			hasChanged: this.approvals.hasChanged(serverId, skill),
			isAllowed:
				this.approvals.isApproved(serverId, skill) ||
				this.allowedForNow.isApproved(serverId, skill),
			skill
		};
	}

	/**
	 * Read a file of a skill, verified against the skill's entry. Reading is
	 * not loading: this is also how the user looks at a skill before using it.
	 */
	async read(serverId: string, skill: Skill, ref?: string): Promise<SkillFile> {
		this.assertVerifiable(skill);

		const connection = await this.connect(serverId);

		try {
			return await MCPService.readSkillFile(connection, skill, ref);
		} catch (error) {
			const reason = MCPService.unverifiedSkillFile(error);

			if (reason === undefined || reason === UNLISTED_FILE) throw error;

			// the entry is out of date: the next need lists again, and other files ask the user again
			this.clearListings(serverId);

			throw new Error(
				`The skill "${skill.frontmatter.name}" changed on its server since it was listed, so the file was not used. List the skills again.`,
				{ cause: error }
			);
		}
	}

	private assertVerifiable(skill: Skill): void {
		if (skill.resources === MCP_SKILL_DYNAMIC_RESOURCES) {
			throw new Error(
				`The skill "${skill.frontmatter.name}" generates its files on demand, so they cannot be verified. Llama Chat does not load such skills.`
			);
		}

		// the SDK hashes with WebCrypto, which a page has only on https or localhost
		if (!globalThis.crypto?.subtle) {
			throw new Error(
				'Skills need a page served over https or from localhost: this browser cannot verify their files here.'
			);
		}
	}

	private async connect(serverId: string): Promise<MCPConnection> {
		const connection = await this.host.connectionFor(serverId);

		if (!connection) throw new Error('The MCP server of this skill is not connected.');

		return connection;
	}

	/** A skill's entry by its URI. A listing may be partial, so a skill it leaves out is asked for. */
	private async entry(serverId: string, uri: string): Promise<Skill> {
		const listed = (await this.list(serverId)).find((skill) => skill.uri === uri);

		return listed ?? MCPService.getSkill(await this.connect(serverId), uri);
	}

	private async fetchListing(serverId: string): Promise<Skill[]> {
		this.listings.set(serverId, {
			expiresAt: 0,
			isLoading: true,
			skills: this.listings.get(serverId)?.skills ?? []
		});

		try {
			const { skills, ttlMs } = await MCPService.listSkills(await this.connect(serverId));

			this.listings.set(serverId, {
				expiresAt: Date.now() + (ttlMs ?? MCP_SKILLS_DEFAULT_TTL_MS),
				isLoading: false,
				skills
			});

			return skills;
		} catch (error) {
			this.listings.set(serverId, {
				error: error instanceof Error ? error.message : String(error),
				expiresAt: 0,
				isLoading: false,
				skills: []
			});

			throw error;
		}
	}
}

// The skills MCP servers publish: listed on first need and kept for as long as
// the server allows, known by server and URI, loaded only when the user allowed
// them with the files they have, and read from the server they came from.

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

vi.mock('#lib/services/database.service.ts', () => ({
	DatabaseService: {}
}));

import type { Skill, SkillFile } from '@modelcontextprotocol/client/ext/skills';
import { MCPService } from '#lib/extensions/mcp/services/mcp.service.ts';
import type {
	SkillApprovalRecords,
	SkillApprovalStorage
} from '#lib/extensions/mcp/skills/approvals.ts';
import { MCP_SKILLS_DEFAULT_TTL_MS } from '#lib/extensions/mcp/skills/constants.ts';
import {
	McpSkillNotAllowedError,
	type McpSkillsHost,
	McpSkillsStore
} from '#lib/extensions/mcp/stores/skills.svelte.ts';
import type { MCPConnection } from '#lib/types/index.ts';

const DIGEST_A = `sha256:${'a'.repeat(64)}`;
const DIGEST_B = `sha256:${'b'.repeat(64)}`;
const SKILL_URI = 'skill://refunds/SKILL.md';
const TTL_MS = 60_000;

function skill(description: string, digest = DIGEST_A): Skill {
	return {
		frontmatter: { description, name: 'refunds' },
		resources: [{ digest, size: 120, uri: SKILL_URI }],
		uri: SKILL_URI
	};
}

// two servers publish a skill under the same name and URI
const BILLING_REFUNDS = skill('Refunds, by the billing server');
const SUPPORT_REFUNDS = skill('Refunds, by the support server', DIGEST_B);
const LISTINGS: Record<string, Skill[]> = {
	billing: [BILLING_REFUNDS],
	support: [SUPPORT_REFUNDS]
};

function connection(serverName: string): MCPConnection {
	return { serverName } as unknown as MCPConnection;
}

function memoryStorage(): SkillApprovalStorage {
	let saved: SkillApprovalRecords = {};

	return { load: () => saved, save: (records) => (saved = records) };
}

function makeStore(storage = memoryStorage()) {
	const host: McpSkillsHost = {
		connectionFor: vi.fn(async (serverId: string) => connection(serverId))
	};

	return { host, store: new McpSkillsStore(host, storage) };
}

let listSkills: MockInstance<typeof MCPService.listSkills>;
let readSkillFile: MockInstance<typeof MCPService.readSkillFile>;

beforeEach(() => {
	vi.restoreAllMocks();
	listSkills = vi.spyOn(MCPService, 'listSkills').mockImplementation(async ({ serverName }) => ({
		invalid: [],
		skills: LISTINGS[serverName],
		ttlMs: TTL_MS
	}));
	readSkillFile = vi
		.spyOn(MCPService, 'readSkillFile')
		.mockImplementation(async ({ serverName }, { uri }, ref) => {
			const text = `${serverName}: ${ref ?? 'SKILL.md'}`;

			return { bytes: new TextEncoder().encode(text), text, uri, verified: true } as SkillFile;
		});
});

afterEach(() => {
	vi.useRealTimers();
});

describe('listing skills', () => {
	it('lists nothing before the first need, and no file with the listing', async () => {
		const { host, store } = makeStore();

		expect(store.listingOf('billing')).toBeUndefined();
		expect(host.connectionFor).not.toHaveBeenCalled();

		await expect(store.list('billing')).resolves.toEqual([BILLING_REFUNDS]);

		expect(listSkills).toHaveBeenCalledTimes(1);
		expect(readSkillFile).not.toHaveBeenCalled();
		expect(store.listingOf('billing')).toMatchObject({
			isLoading: false,
			skills: [BILLING_REFUNDS]
		});
	});

	it('asks a server once for needs that come together', async () => {
		const { store } = makeStore();

		await Promise.all([store.list('billing'), store.list('billing')]);

		expect(listSkills).toHaveBeenCalledTimes(1);
	});

	it('keeps a listing for the time the server gives, then lists again', async () => {
		vi.useFakeTimers();

		const { store } = makeStore();

		await store.list('billing');
		vi.advanceTimersByTime(TTL_MS - 1);
		await store.list('billing');

		expect(listSkills).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await store.list('billing');

		expect(listSkills).toHaveBeenCalledTimes(2);
	});

	it('keeps a listing for a default time when the server gives none', async () => {
		vi.useFakeTimers();
		listSkills.mockImplementation(async () => ({ invalid: [], skills: [BILLING_REFUNDS] }));

		const { store } = makeStore();

		await store.list('billing');
		vi.advanceTimersByTime(MCP_SKILLS_DEFAULT_TTL_MS - 1);
		await store.list('billing');

		expect(listSkills).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await store.list('billing');

		expect(listSkills).toHaveBeenCalledTimes(2);
	});

	it('keeps the same skill name of two servers apart', async () => {
		const { store } = makeStore();

		await expect(store.list('billing')).resolves.toEqual([BILLING_REFUNDS]);
		await expect(store.list('support')).resolves.toEqual([SUPPORT_REFUNDS]);

		expect(store.listingOf('billing')?.skills).toEqual([BILLING_REFUNDS]);
		expect(store.listingOf('support')?.skills).toEqual([SUPPORT_REFUNDS]);
	});

	it('reports a failed listing and tries again on the next need', async () => {
		listSkills.mockRejectedValueOnce(new Error('server is down'));

		const { store } = makeStore();

		await expect(store.list('billing')).rejects.toThrow('server is down');
		expect(store.listingOf('billing')).toMatchObject({ error: 'server is down', skills: [] });

		await expect(store.list('billing')).resolves.toEqual([BILLING_REFUNDS]);
		expect(store.listingOf('billing')?.error).toBeUndefined();
	});

	it('lists again after its listings were dropped', async () => {
		const { store } = makeStore();

		await store.list('billing');
		store.clearListings();
		await store.list('billing');

		expect(listSkills).toHaveBeenCalledTimes(2);
	});
});

describe('loading a skill', () => {
	it('loads nothing the user did not allow, and fetches no file to find out', async () => {
		const { store } = makeStore();

		await expect(store.permissionFor('billing', SKILL_URI)).resolves.toEqual({
			hasChanged: false,
			isAllowed: false,
			skill: BILLING_REFUNDS
		});
		await expect(store.load('billing', SKILL_URI)).rejects.toBeInstanceOf(McpSkillNotAllowedError);
		expect(readSkillFile).not.toHaveBeenCalled();
	});

	it('reads an allowed skill from its own server, its other files too', async () => {
		const { store } = makeStore();

		store.allow('support', SUPPORT_REFUNDS, false);

		await expect(store.load('support', SKILL_URI)).resolves.toMatchObject({
			file: { text: 'support: SKILL.md' },
			skill: SUPPORT_REFUNDS
		});
		expect(readSkillFile).toHaveBeenCalledWith(connection('support'), SUPPORT_REFUNDS, undefined);

		await expect(store.load('support', SKILL_URI, 'references/guide.md')).resolves.toMatchObject({
			file: { text: 'support: references/guide.md' }
		});
	});

	it('does not take a yes to one server for the same skill of another', async () => {
		const { store } = makeStore();

		store.allow('billing', BILLING_REFUNDS, true);

		await expect(store.permissionFor('billing', SKILL_URI)).resolves.toMatchObject({
			isAllowed: true
		});
		await expect(store.permissionFor('support', SKILL_URI)).resolves.toMatchObject({
			hasChanged: false,
			isAllowed: false
		});
		await expect(store.load('support', SKILL_URI)).rejects.toBeInstanceOf(McpSkillNotAllowedError);
	});

	it('keeps a yes for good across sessions, and a yes for now only in this one', async () => {
		const storage = memoryStorage();
		const { store } = makeStore(storage);

		store.allow('billing', BILLING_REFUNDS, true);
		store.allow('support', SUPPORT_REFUNDS, false);

		const { store: later } = makeStore(storage);

		await expect(later.permissionFor('billing', SKILL_URI)).resolves.toMatchObject({
			isAllowed: true
		});
		await expect(later.permissionFor('support', SKILL_URI)).resolves.toMatchObject({
			hasChanged: false,
			isAllowed: false
		});
	});

	it('asks again when the files of an allowed skill changed', async () => {
		const storage = memoryStorage();
		const { store } = makeStore(storage);

		store.allow('billing', BILLING_REFUNDS, true);

		// later the server lists the skill with another digest
		const changed = skill('Refunds, by the billing server', DIGEST_B);

		listSkills.mockImplementation(async () => ({ invalid: [], skills: [changed], ttlMs: TTL_MS }));

		const { store: later } = makeStore(storage);

		await expect(later.permissionFor('billing', SKILL_URI)).resolves.toEqual({
			hasChanged: true,
			isAllowed: false,
			skill: changed
		});
		await expect(later.load('billing', SKILL_URI)).rejects.toBeInstanceOf(McpSkillNotAllowedError);

		later.allow('billing', changed, true);
		await expect(later.load('billing', SKILL_URI)).resolves.toMatchObject({ skill: changed });
	});

	it('takes a yes for now back when the files changed, too', async () => {
		const { store } = makeStore();

		store.allow('billing', BILLING_REFUNDS, false);

		const changed = skill('Refunds, by the billing server', DIGEST_B);

		listSkills.mockImplementation(async () => ({ invalid: [], skills: [changed], ttlMs: TTL_MS }));
		store.clearListings();

		await expect(store.permissionFor('billing', SKILL_URI)).resolves.toMatchObject({
			isAllowed: false
		});
	});

	it('declines a skill whose files cannot be verified, whatever was allowed', async () => {
		const dynamic: Skill = { ...BILLING_REFUNDS, resources: 'dynamic' };

		listSkills.mockImplementation(async () => ({ invalid: [], skills: [dynamic], ttlMs: TTL_MS }));

		const { store } = makeStore();

		store.allow('billing', dynamic, true);

		await expect(store.permissionFor('billing', SKILL_URI)).rejects.toThrow('cannot be verified');
		await expect(store.load('billing', SKILL_URI)).rejects.toThrow('cannot be verified');
		await expect(store.read('billing', dynamic)).rejects.toThrow('cannot be verified');
		expect(readSkillFile).not.toHaveBeenCalled();
	});

	it('asks the server for a skill its listing leaves out', async () => {
		const unlisted: Skill = {
			frontmatter: { description: 'Not in the listing', name: 'chargebacks' },
			resources: [{ digest: DIGEST_A, size: 10, uri: 'skill://chargebacks/SKILL.md' }],
			uri: 'skill://chargebacks/SKILL.md'
		};
		const getSkill = vi.spyOn(MCPService, 'getSkill').mockResolvedValue(unlisted);
		const { store } = makeStore();

		store.allow('billing', unlisted, false);

		await expect(store.load('billing', unlisted.uri)).resolves.toMatchObject({ skill: unlisted });
		expect(getSkill).toHaveBeenCalledWith(connection('billing'), unlisted.uri);
	});

	it('drops the listing of a skill whose file is not what the entry says', async () => {
		const { store } = makeStore();
		const mismatch = new Error('digest mismatch');

		readSkillFile.mockRejectedValueOnce(mismatch);
		vi.spyOn(MCPService, 'unverifiedSkillFile').mockImplementation((error) =>
			error === mismatch ? 'digest' : undefined
		);

		await expect(store.read('billing', BILLING_REFUNDS)).rejects.toThrow('changed on its server');
		expect(store.listingOf('billing')).toBeUndefined();
	});

	it('keeps the listing when the file asked for is not one of the skill', async () => {
		const { store } = makeStore();
		const unlisted = new Error('not a file of the skill');

		await store.list('billing');
		readSkillFile.mockRejectedValueOnce(unlisted);
		vi.spyOn(MCPService, 'unverifiedSkillFile').mockReturnValue('unlisted');

		await expect(store.read('billing', BILLING_REFUNDS, 'nope.md')).rejects.toBe(unlisted);
		expect(store.listingOf('billing')?.skills).toEqual([BILLING_REFUNDS]);
	});

	it('forgets a removed server: its listing and what was allowed of its skills', async () => {
		const { store } = makeStore();

		store.allow('billing', BILLING_REFUNDS, true);
		store.allow('support', SUPPORT_REFUNDS, false);
		await store.list('billing');

		store.forgetServer('billing');
		store.forgetServer('support');

		expect(store.listingOf('billing')).toBeUndefined();
		await expect(store.permissionFor('billing', SKILL_URI)).resolves.toMatchObject({
			isAllowed: false
		});
		await expect(store.permissionFor('support', SKILL_URI)).resolves.toMatchObject({
			isAllowed: false
		});
	});
});

// MCP prompts are offered as system messages through the systemPromptSources
// extension point: listed with their server, resolved to text, and, when they
// take arguments, handed to the prompt picker's argument form.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/extensions/mcp/stores/index.svelte', () => ({
	mcpStore: {
		ensureInitialized: vi.fn(),
		getAllPrompts: vi.fn(),
		getPrompt: vi.fn(),
		getServerFavicon: vi.fn(),
		getServerLabel: vi.fn(),
		getServers: vi.fn()
	}
}));
vi.mock('$lib/extensions/mcp/components/McpLogo.svelte', () => ({ default: () => {} }));
vi.mock('$lib/extensions/mcp/components/contributions/SystemPromptMcpCard.svelte', () => ({
	default: () => {}
}));
// the picker id comes from the composer glue, whose components do not load outside a browser
vi.mock('$lib/extensions/mcp/composer', () => ({ MCP_PROMPTS_PICKER_ID: 'mcp-prompts' }));

import type { ComposerHandle, ExtensionContext, SystemPromptSource } from '$lib/extensions';
import { pendingPromptArguments } from '$lib/extensions/mcp/prompt-arguments.svelte';
import { mcpStore } from '$lib/extensions/mcp/stores/index.svelte';
import { contributeSystemPrompts } from '$lib/extensions/mcp/system-prompts';
import type { MCPPromptInfo, MCPServerSettingsEntry } from '$lib/types';

const SERVER: MCPServerSettingsEntry = {
	enabled: true,
	id: 'srv-1',
	name: 'Docs',
	url: 'https://docs.example.com/mcp'
};
const PLAIN: MCPPromptInfo = {
	description: 'Reviews a change',
	name: 'code_review',
	serverName: 'srv-1',
	title: 'Code review'
};
const WITH_ARGUMENTS: MCPPromptInfo = {
	arguments: [{ name: 'topic', required: true }],
	name: 'explain',
	serverName: 'srv-gone'
};

function activate(): { cleanups: Array<() => void | Promise<void>>; source: SystemPromptSource } {
	const cleanups: Array<() => void | Promise<void>> = [];

	let source: SystemPromptSource | undefined;

	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'systemPromptSources') source = contribution as SystemPromptSource;
		},
		onDeactivate: (cleanup) => void cleanups.push(cleanup)
	};

	contributeSystemPrompts(ctx);

	if (!source) throw new Error('no source contributed');

	return { cleanups, source };
}

function makeComposer(): { composer: ComposerHandle; opened: string[] } {
	const opened: string[] = [];

	return {
		composer: {
			addUploadedFile: () => {},
			closePicker: () => {},
			focusInput: () => {},
			openPicker: (id) => void opened.push(id),
			updateUploadedFile: () => {}
		},
		opened
	};
}

describe('MCP as a source of system prompts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(true);
		vi.mocked(mcpStore.getAllPrompts).mockResolvedValue([PLAIN, WITH_ARGUMENTS]);
		vi.mocked(mcpStore.getServers).mockReturnValue([SERVER]);
		vi.mocked(mcpStore.getServerLabel).mockReturnValue('Docs');
		vi.mocked(mcpStore.getServerFavicon).mockReturnValue('https://docs.example.com/favicon.ico');
		vi.mocked(mcpStore.getPrompt).mockReset();
		pendingPromptArguments.clear();
	});

	it('lists the prompts with their server, title and argument count', async () => {
		const { source } = activate();

		expect(source.label).toBe('MCP Prompts');
		expect(await source.list()).toEqual([
			{
				argumentCount: 0,
				description: 'Reviews a change',
				iconUrl: 'https://docs.example.com/favicon.ico',
				id: 'mcp:srv-1:code_review',
				origin: 'Docs',
				title: 'Code review'
			},
			{
				argumentCount: 1,
				description: undefined,
				iconUrl: null,
				// a prompt whose server is no longer configured keeps the server's id as its origin
				id: 'mcp:srv-gone:explain',
				origin: 'srv-gone',
				title: 'explain'
			}
		]);
	});

	it('lists nothing when MCP could not initialize', async () => {
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(false);

		const { source } = activate();

		expect(await source.list()).toEqual([]);
		expect(mcpStore.getAllPrompts).not.toHaveBeenCalled();
	});

	it('gives the text of a prompt without arguments', async () => {
		vi.mocked(mcpStore.getPrompt).mockResolvedValue({
			messages: [
				{ content: { text: 'Review this change.', type: 'text' }, role: 'user' },
				{ content: { data: '', mimeType: 'image/png', type: 'image' }, role: 'user' },
				{ content: { text: 'Be brief.', type: 'text' }, role: 'user' }
			]
		});

		const { source } = activate();
		const [entry] = await source.list();
		const text = await source.resolve(entry);

		expect(mcpStore.getPrompt).toHaveBeenCalledWith('srv-1', 'code_review', {});
		expect(text).toContain('Review this change.');
		expect(text).toContain('Be brief.');
	});

	it('gives null for a prompt with no text, or one it did not list', async () => {
		vi.mocked(mcpStore.getPrompt).mockResolvedValue({ messages: [] });

		const { source } = activate();
		const [entry] = await source.list();

		expect(await source.resolve(entry)).toBeNull();
		expect(await source.resolve({ ...entry, id: 'mcp:other:unknown' })).toBeNull();
	});

	it('opens the prompt picker on the argument form of a prompt that takes arguments', async () => {
		const { source } = activate();
		const [, entry] = await source.list();
		const { composer, opened } = makeComposer();

		source.openArguments(entry, composer);

		expect(pendingPromptArguments.prompt).toEqual(WITH_ARGUMENTS);
		expect(opened).toEqual(['mcp-prompts']);
	});

	it('claims system messages made from MCP prompts, and no others', () => {
		const { source } = activate();

		expect(source.owns('mcp:srv-1:code_review')).toBe(true);
		expect(source.owns('2f1c9a4e-library-prompt')).toBe(false);
		expect(source.card).toBeDefined();
	});

	it('forgets a prompt waiting for its arguments when MCP is switched off', async () => {
		const { cleanups, source } = activate();
		const [, entry] = await source.list();

		source.openArguments(entry, makeComposer().composer);

		for (const cleanup of cleanups) await cleanup();

		expect(pendingPromptArguments.prompt).toBeNull();
	});
});

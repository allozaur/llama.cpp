// MCP servers are a source of prompts through the promptSources extension point:
// listed with their server, attached to a message as a chip, and resolved to text for
// a system message. A prompt that takes arguments asks for them in the chat form first.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/extensions/mcp/stores/index.svelte.ts', () => ({
	mcpStore: {
		ensureInitialized: vi.fn(),
		getAllPrompts: vi.fn(),
		getPrompt: vi.fn(),
		getServerDisplayName: vi.fn(),
		getServerFavicon: vi.fn(),
		getServers: vi.fn(),
		// Enable MCP is on
		isFeatureEnabled: true
	}
}));
vi.mock('#lib/extensions/mcp/components/McpLogo.svelte', () => ({ default: () => {} }));
vi.mock('#lib/extensions/mcp/components/contributions/PromptMcpCard.svelte', () => ({
	default: () => {}
}));
vi.mock('#lib/stores/index.ts', () => ({
	conversationsStore: {
		preferences: { isCategoryEnabled: () => true, isServerToolsEnabled: () => true }
	}
}));

import { SpecialFileType } from '#lib/enums/index.ts';
import type { ComposerHandle, ExtensionContext, PromptSource } from '#lib/extensions/index.ts';
import {
	MCP_PROMPT_ARGUMENTS_PICKER_ID,
	promptArguments
} from '#lib/extensions/mcp/prompt-arguments.svelte.ts';
import { contributePrompts } from '#lib/extensions/mcp/prompts.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import type { ChatUploadedFile, MCPPromptInfo, MCPServerSettingsEntry } from '#lib/types/index.ts';

const SERVERS: MCPServerSettingsEntry[] = [
	{ enabled: true, id: 'srv-1', name: 'Docs', url: 'https://docs.example.com/mcp' },
	{ enabled: true, id: 'srv-2', name: 'Git', url: 'https://git.example.com/mcp' }
];
const PLAIN: MCPPromptInfo = {
	description: 'Reviews a change',
	name: 'code_review',
	serverName: 'srv-1',
	title: 'Code review'
};
const WITH_ARGUMENTS: MCPPromptInfo = {
	arguments: [{ name: 'topic', required: true }],
	name: 'explain',
	serverName: 'srv-2'
};
const RESULT = {
	messages: [
		{ content: { text: 'Review this change.', type: 'text' as const }, role: 'user' as const },
		{
			content: { data: '', mimeType: 'image/png', type: 'image' as const },
			role: 'user' as const
		},
		{ content: { text: 'Be brief.', type: 'text' as const }, role: 'user' as const }
	]
};

function activate(): { cleanups: Array<() => void | Promise<void>>; source: PromptSource } {
	const cleanups: Array<() => void | Promise<void>> = [];

	let source: PromptSource | undefined;

	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'promptSources') source = contribution as PromptSource;
		},
		onDeactivate: (cleanup) => void cleanups.push(cleanup)
	};

	contributePrompts(ctx);

	if (!source) throw new Error('no source contributed');

	return { cleanups, source };
}

function makeComposer() {
	const opened: string[] = [];

	let files: ChatUploadedFile[] = [];

	const composer: ComposerHandle = {
		addUploadedFile: (file) => void (files = [...files, file]),
		closePicker: () => {},
		focusInput: () => {},
		openPicker: (id) => void opened.push(id),
		updateUploadedFile: (id, update) =>
			void (files = files.map((f) => (f.id === id ? update(f) : f)))
	};

	return { composer, files: () => files, opened };
}

/** Lets the promises a call left behind settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MCP as a source of prompts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(true);
		// out of the order of the servers
		vi.mocked(mcpStore.getAllPrompts).mockResolvedValue([WITH_ARGUMENTS, PLAIN]);
		vi.mocked(mcpStore.getServers).mockReturnValue(SERVERS);
		vi.mocked(mcpStore.getServerDisplayName).mockImplementation(
			(id) => SERVERS.find((server) => server.id === id)?.name ?? id
		);
		vi.mocked(mcpStore.getServerFavicon).mockImplementation((id) =>
			id === 'srv-1' ? 'https://docs.example.com/favicon.ico' : null
		);
		vi.mocked(mcpStore.getPrompt).mockResolvedValue(RESULT);
		promptArguments.answer(null);
	});

	it('lists the prompts in the order of the servers, each with its server', async () => {
		const { source } = activate();

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
				iconUrl: undefined,
				id: 'mcp:srv-2:explain',
				origin: 'Git',
				title: 'explain'
			}
		]);
	});

	it('lists nothing when MCP could not initialize or no server is in use', async () => {
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(false);

		const { source } = activate();

		expect(await source.list()).toEqual([]);

		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(true);
		vi.mocked(mcpStore.getServers).mockReturnValue([]);

		expect(await source.list()).toEqual([]);
		expect(mcpStore.getAllPrompts).not.toHaveBeenCalled();
	});

	it('attaches a prompt without arguments as a chip that loads, then holds its text', async () => {
		const { source } = activate();
		const [entry] = await source.list();
		const { composer, files, opened } = makeComposer();

		source.attach(entry, composer);
		await settle();

		expect(opened).toEqual([]);
		expect(mcpStore.getPrompt).toHaveBeenCalledWith('srv-1', 'code_review', {});
		expect(files()).toHaveLength(1);
		expect(files()[0]).toMatchObject({
			isLoading: false,
			mcpPrompt: { promptName: 'code_review', serverName: 'srv-1' },
			name: 'Code review',
			type: SpecialFileType.MCP_PROMPT
		});
		expect(files()[0].textContent).toContain('Review this change.');
		expect(files()[0].textContent).toContain('Be brief.');
	});

	it('keeps the chip with the error when the prompt fails to load', async () => {
		vi.mocked(mcpStore.getPrompt).mockRejectedValue(new Error('server went away'));

		const { source } = activate();
		const [entry] = await source.list();
		const { composer, files } = makeComposer();

		source.attach(entry, composer);
		await settle();

		expect(files()[0]).toMatchObject({ isLoading: false, loadError: 'server went away' });
	});

	it('asks for the arguments in the chat form before it attaches a prompt that takes some', async () => {
		const { source } = activate();
		const [, entry] = await source.list();
		const { composer, files, opened } = makeComposer();

		source.attach(entry, composer);
		await settle();

		expect(opened).toEqual([MCP_PROMPT_ARGUMENTS_PICKER_ID]);
		expect(promptArguments.prompt).toEqual(WITH_ARGUMENTS);
		expect(files()).toEqual([]);

		promptArguments.answer({ topic: 'quantization' });
		await settle();

		expect(mcpStore.getPrompt).toHaveBeenCalledWith('srv-2', 'explain', { topic: 'quantization' });
		expect(files()[0]).toMatchObject({
			mcpPrompt: { arguments: { topic: 'quantization' }, promptName: 'explain' }
		});
	});

	it('attaches nothing when the arguments form is closed', async () => {
		const { source } = activate();
		const [, entry] = await source.list();
		const { composer, files } = makeComposer();

		source.attach(entry, composer);
		promptArguments.answer(null);
		await settle();

		expect(mcpStore.getPrompt).not.toHaveBeenCalled();
		expect(files()).toEqual([]);
	});

	it('gives the text of a prompt for a system message', async () => {
		const { source } = activate();
		const [entry] = await source.list();
		const text = await source.resolve(entry, makeComposer().composer);

		expect(text).toContain('Review this change.');
		expect(text).toContain('Be brief.');
	});

	it('gives the text of a prompt with arguments once they are filled in, and null when not', async () => {
		const { source } = activate();
		const [, entry] = await source.list();
		const { composer, opened } = makeComposer();
		const answered = source.resolve(entry, composer);

		await settle();
		promptArguments.answer({ topic: 'sampling' });

		expect(await answered).toContain('Review this change.');
		expect(opened).toEqual([MCP_PROMPT_ARGUMENTS_PICKER_ID]);
		expect(mcpStore.getPrompt).toHaveBeenCalledWith('srv-2', 'explain', { topic: 'sampling' });

		const dropped = source.resolve(entry, composer);

		await settle();
		promptArguments.answer(null);

		expect(await dropped).toBeNull();
	});

	it('gives null for a prompt with no text, or one it did not list', async () => {
		vi.mocked(mcpStore.getPrompt).mockResolvedValue({ messages: [] });

		const { source } = activate();
		const [entry] = await source.list();
		const { composer } = makeComposer();

		expect(await source.resolve(entry, composer)).toBeNull();
		expect(await source.resolve({ ...entry, id: 'mcp:other:unknown' }, composer)).toBeNull();
	});

	it('claims system messages made from MCP prompts, and no others', () => {
		const { source } = activate();

		expect(source.owns('mcp:srv-1:code_review')).toBe(true);
		expect(source.owns('2f1c9a4e-library-prompt')).toBe(false);
		expect(source.card).toBeDefined();
	});

	it('drops a request for arguments when MCP is switched off', async () => {
		const { cleanups, source } = activate();
		const [, entry] = await source.list();
		const answered = source.resolve(entry, makeComposer().composer);

		await settle();

		for (const cleanup of cleanups) await cleanup();

		expect(await answered).toBeNull();
		expect(promptArguments.prompt).toBeNull();
	});
});

// Guards the chat form's extension points. Without extensions the form works with its
// built-in commands alone, and `/prompt` lists the library's prompts; with the MCP extension
// on, the same picker lists MCP's prompts too, a picked prompt becomes a chip, and attached
// resources show under the input. Switching the extension off takes all of that away again.

import ChatFormTestWrapper from './components/ChatFormTestWrapper.svelte';
import { EditorView } from '@codemirror/view';
import { EXTENSIONS_LOCALSTORAGE_KEY, SETTINGS_KEYS } from '#lib/constants/index.ts';
import { MimeTypeText } from '#lib/enums/index.ts';
import { BUILT_IN_EXTENSIONS } from '#lib/extensions/builtin.ts';
import { extensions } from '#lib/extensions/index.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { promptsStore } from '#lib/stores/prompts.svelte.ts';
import { settingsStore } from '#lib/stores/settings/index.svelte.ts';
import type { GetPromptResult, MCPPromptInfo, MCPResourceInfo } from '#lib/types/index.ts';
import { tick } from 'svelte';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const MCP_EXTENSION_ID = 'mcp';
const BUILT_IN_COMMANDS = ['/prompt', '/cwd', '/model', '/compact', '/system-message'];
/** With the MCP extension on: its `/skill` comes right after `/prompt`. */
const COMMANDS_WITH_MCP = ['/prompt', '/skill', '/cwd', '/model', '/compact', '/system-message'];
const LIBRARY_PROMPT = {
	content: 'Reply like a pirate.',
	id: 'p1',
	lastModified: 1,
	name: 'Pirate'
};
const SERVER = { enabled: true, id: 'github', name: 'GitHub', url: 'https://mcp.example.com/mcp' };
const PROMPTS: MCPPromptInfo[] = [
	{ description: 'Review a pull request', name: 'code_review', serverName: 'github' },
	{
		description: 'Summarize open issues by label',
		name: 'issue_summary',
		serverName: 'github',
		title: 'Issue summary'
	}
];
const PROMPT_RESULT = {
	messages: [{ content: { text: 'Summarize the open issues.', type: 'text' }, role: 'user' }]
} as GetPromptResult;
const RESOURCE: MCPResourceInfo = {
	mimeType: MimeTypeText.MARKDOWN,
	name: 'README.md',
	serverName: 'github',
	uri: 'repo://ggml-org/llama.cpp/README.md'
};

async function renderForm() {
	const onSubmit = vi.fn();
	const { container } = render(ChatFormTestWrapper, { onSubmit, singleRow: true });

	await tick();

	const content = container.querySelector<HTMLElement>('.cm-content');
	const editor = content && EditorView.findFromDOM(content);

	if (!editor) throw new Error('editor not rendered');

	await userEvent.click(editor.contentDOM);

	const card = container.querySelector<HTMLElement>('[data-slot="input-area"]')!;

	return {
		container,
		editor,
		isInputFocused: () => editor.contentDOM.contains(document.activeElement),
		isSingleRow: () => card.hasAttribute('data-single-row'),
		onSubmit
	};
}

const pickerRows = () =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button'));
const commandNames = () => pickerRows().map((row) => row.querySelector('.font-mono')?.textContent);

function seedPrompts() {
	settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, JSON.stringify([SERVER]));
	vi.spyOn(mcpStore, 'ensureInitialized').mockResolvedValue(true);
	vi.spyOn(mcpStore, 'getAllPrompts').mockResolvedValue(PROMPTS);
}

/** Type `/prompt <query>`, pick the command, and wait for the prompt picker. */
async function openPromptPicker(query: string) {
	await userEvent.keyboard(`/prompt ${query}`);
	await expect.poll(commandNames).toEqual(['/prompt', '/system-message']);
	await userEvent.keyboard('{Enter}');
	await expect.poll(() => pickerRows().map((row) => row.textContent)).toHaveLength(1);
}

afterEach(() => {
	vi.restoreAllMocks();
	promptsStore.prompts = [];
	mcpStore.resources.clearAttachments();
	settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, '[]');
});

describe('ChatForm without extensions', () => {
	it('lists only the built-in commands', async () => {
		await renderForm();
		await userEvent.keyboard('/');

		await expect.poll(commandNames).toEqual(BUILT_IN_COMMANDS);
	});

	it('lists the prompts of the library with /prompt, and turns the picked one into a chip', async () => {
		promptsStore.prompts = [LIBRARY_PROMPT];
		vi.spyOn(promptsStore, 'initialize').mockResolvedValue();

		const { container, editor, isInputFocused } = await renderForm();

		await openPromptPicker('pir');

		expect(editor.state.doc.toString()).toBe('');
		expect(pickerRows()[0].textContent).toContain('Library');
		expect(pickerRows()[0].textContent).toContain('Pirate');

		await userEvent.keyboard('{Enter}');

		await expect.poll(pickerRows).toHaveLength(0);
		await expect.poll(() => container.textContent).toContain('Reply like a pirate.');
		await expect.poll(isInputFocused).toBe(true);
	});

	it('draws no pending attachments and still sends', async () => {
		await page.viewport(1280, 900);
		mcpStore.resources.addAttachment(RESOURCE);

		const { container, isSingleRow, onSubmit } = await renderForm();

		expect(container.textContent).not.toContain(RESOURCE.name);
		expect(isSingleRow()).toBe(true);

		await userEvent.keyboard('hello{Enter}');
		await tick();

		expect(onSubmit).toHaveBeenCalledOnce();
	});
});

describe('ChatForm with the MCP extension', () => {
	beforeAll(async () => {
		// MCP is off until enabled: switch it on, as someone who uses it has
		settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, true);

		for (const manifest of BUILT_IN_EXTENSIONS) extensions.register(manifest);

		await extensions.activateEnabled();
	});

	afterAll(() => {
		settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, false);
		localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);
	});

	it('adds /skill right after /prompt', async () => {
		await renderForm();
		await userEvent.keyboard('/');

		await expect.poll(commandNames).toEqual(COMMANDS_WITH_MCP);
		expect(pickerRows()[0].disabled).toBe(false);
	});

	it('lists the prompts of MCP servers after those of the library, each with its source', async () => {
		seedPrompts();
		promptsStore.prompts = [LIBRARY_PROMPT];
		vi.spyOn(promptsStore, 'initialize').mockResolvedValue();

		await renderForm();
		await userEvent.keyboard('/prompt');
		await expect.poll(commandNames).toEqual(['/prompt', '/system-message']);
		await userEvent.keyboard('{Enter}');

		await expect.poll(pickerRows).toHaveLength(PROMPTS.length + 1);
		expect(pickerRows().map((row) => row.textContent)).toEqual([
			expect.stringMatching(/Library.*Pirate/s),
			expect.stringMatching(/GitHub.*code_review/s),
			expect.stringMatching(/GitHub.*Issue summary/s)
		]);
	});

	it('opens the prompt picker with the typed arguments and turns the picked prompt into a chip', async () => {
		seedPrompts();

		let resolvePrompt!: (result: GetPromptResult) => void;

		const getPrompt = vi.spyOn(mcpStore, 'getPrompt').mockReturnValue(
			new Promise<GetPromptResult>((resolve) => {
				resolvePrompt = resolve;
			})
		);
		const { container, editor, isInputFocused } = await renderForm();

		await openPromptPicker('iss');

		// the token is consumed, and the typed arguments are the picker's search
		expect(editor.state.doc.toString()).toBe('');
		expect(pickerRows()[0].textContent).toContain('Issue summary');

		await userEvent.keyboard('{Enter}');

		// the chip is there while the prompt loads, the picker is gone, the input has focus
		await expect.poll(() => container.textContent).toContain('Issue summary');
		await expect.poll(() => container.querySelector('.animate-pulse')).not.toBeNull();
		await expect.poll(pickerRows).toHaveLength(0);
		expect(getPrompt).toHaveBeenCalledWith('github', 'issue_summary', {});
		await expect.poll(isInputFocused).toBe(true);

		resolvePrompt(PROMPT_RESULT);

		await expect.poll(() => container.querySelector('.animate-pulse')).toBeNull();
		expect(container.textContent).toContain('Issue summary');
	});

	it('keeps the chip with the error when the prompt fails to load', async () => {
		seedPrompts();
		vi.spyOn(mcpStore, 'getPrompt').mockRejectedValue(new Error('Server is not connected'));

		const { container } = await renderForm();

		await openPromptPicker('iss');
		await userEvent.keyboard('{Enter}');

		await expect.poll(() => container.textContent).toContain('Server is not connected');
		expect(container.textContent).toContain('Issue summary');
		expect(container.querySelector('.animate-pulse')).toBeNull();
	});

	it('moves through the prompts with the arrows and closes the picker on Escape', async () => {
		seedPrompts();

		const getPrompt = vi.spyOn(mcpStore, 'getPrompt').mockResolvedValue(PROMPT_RESULT);
		const { editor, isInputFocused, onSubmit } = await renderForm();

		await userEvent.keyboard('/prompt');
		await expect.poll(commandNames).toEqual(['/prompt', '/system-message']);
		await userEvent.keyboard('{Enter}');
		await expect.poll(pickerRows).toHaveLength(PROMPTS.length);

		await userEvent.keyboard('{ArrowDown}{Escape}');

		await expect.poll(pickerRows).toHaveLength(0);
		await expect.poll(isInputFocused).toBe(true);
		expect(getPrompt).not.toHaveBeenCalled();
		expect(onSubmit).not.toHaveBeenCalled();
		expect(editor.state.doc.toString()).toBe('');
	});

	it('picks the prompt the arrows moved to', async () => {
		seedPrompts();

		const getPrompt = vi.spyOn(mcpStore, 'getPrompt').mockResolvedValue(PROMPT_RESULT);

		await renderForm();
		await userEvent.keyboard('/prompt');
		await expect.poll(commandNames).toEqual(['/prompt', '/system-message']);
		await userEvent.keyboard('{Enter}');
		await expect.poll(pickerRows).toHaveLength(PROMPTS.length);

		await userEvent.keyboard('{ArrowDown}{Enter}');

		await expect.poll(() => getPrompt.mock.calls).toEqual([['github', 'issue_summary', {}]]);
	});

	it('shows attached resources under the input, on two rows', async () => {
		await page.viewport(1280, 900);

		const { container, isSingleRow } = await renderForm();

		expect(isSingleRow()).toBe(true);

		mcpStore.resources.addAttachment(RESOURCE);

		await expect.poll(() => container.textContent).toContain(RESOURCE.name);
		await expect.poll(isSingleRow).toBe(false);

		mcpStore.resources.clearAttachments();

		await expect.poll(() => container.textContent).not.toContain(RESOURCE.name);
		await expect.poll(isSingleRow).toBe(true);
	});

	it('loses the command and the resources once the extension is off', async () => {
		await page.viewport(1280, 900);
		mcpStore.resources.addAttachment(RESOURCE);

		const { container, isSingleRow } = await renderForm();

		await expect.poll(() => container.textContent).toContain(RESOURCE.name);

		await extensions.setEnabled(MCP_EXTENSION_ID, false);

		await expect.poll(() => container.textContent).not.toContain(RESOURCE.name);
		await expect.poll(isSingleRow).toBe(true);

		await userEvent.keyboard('/');

		await expect.poll(commandNames).toEqual(BUILT_IN_COMMANDS);
	});
});

// An MCP prompt picked in the chat form shows as a chip right away: loading
// first, then with the prompt's text, or with the error when it failed.

import { FileExtensionText, MimeTypeText, SpecialFileType } from '$lib/enums';
import type { ComposerHandle } from '$lib/extensions';
import {
	addLoadingPrompt,
	failLoadingPrompt,
	fillLoadedPrompt
} from '$lib/extensions/mcp/composer-prompts';
import type { ChatUploadedFile, GetPromptResult, MCPPromptInfo } from '$lib/types';
import { describe, expect, it } from 'vitest';

const PROMPT: MCPPromptInfo = { name: 'code_review', serverName: 'github', title: 'Code review' };

/** A composer handle over a plain list of files, recording the order of the calls. */
function makeComposer(initial: ChatUploadedFile[] = []) {
	const calls: string[] = [];

	let files = initial;

	const composer: ComposerHandle = {
		addUploadedFile(file) {
			calls.push('addUploadedFile');
			files = [...files, file];
		},
		closePicker: () => void calls.push('closePicker'),
		focusInput: () => void calls.push('focusInput'),
		openPicker: () => void calls.push('openPicker'),
		updateUploadedFile(id, update) {
			calls.push('updateUploadedFile');
			files = files.map((f) => (f.id === id ? update(f) : f));
		}
	};

	return { calls, composer, files: () => files };
}

describe('MCP prompt attachment', () => {
	it('closes the picker, adds a loading chip and focuses the input', () => {
		const { calls, composer, files } = makeComposer();

		addLoadingPrompt(composer, 'p1', PROMPT, { repo: 'ggml-org/llama.cpp' });

		expect(calls).toEqual(['closePicker', 'addUploadedFile', 'focusInput']);
		expect(files()).toHaveLength(1);
		expect(files()[0]).toMatchObject({
			id: 'p1',
			isLoading: true,
			mcpPrompt: {
				arguments: { repo: 'ggml-org/llama.cpp' },
				promptName: 'code_review',
				serverName: 'github'
			},
			name: 'Code review',
			size: 0,
			type: SpecialFileType.MCP_PROMPT
		});
	});

	it('names the chip after the prompt when it has no title', () => {
		const { composer, files } = makeComposer();

		addLoadingPrompt(composer, 'p1', { name: 'release_notes', serverName: 'docs' });

		expect(files()[0].name).toBe('release_notes');
		expect(files()[0].mcpPrompt?.arguments).toBeUndefined();
	});

	it('fills the chip with the text of the loaded messages', async () => {
		const { composer, files } = makeComposer();
		const result = {
			messages: [
				{ content: { text: 'Review this pull request.', type: 'text' }, role: 'user' },
				{ content: { data: '', mimeType: 'image/png', type: 'image' }, role: 'user' },
				{ content: { text: 'List the main issues.', type: 'text' }, role: 'user' }
			]
		} as GetPromptResult;

		addLoadingPrompt(composer, 'p1', PROMPT);
		fillLoadedPrompt(composer, 'p1', result);

		const [file] = files();
		const text = 'Review this pull request.\n\nList the main issues.';

		expect(file).toMatchObject({
			id: 'p1',
			isLoading: false,
			name: 'Code review',
			size: text.length,
			textContent: text
		});
		expect(file.file.name).toBe(`Code review${FileExtensionText.TXT}`);
		expect(file.file.type).toBe(MimeTypeText.PLAIN);
		expect(await file.file.text()).toBe(text);
		// the prompt stays on the chip: the message is sent with it
		expect(file.mcpPrompt?.promptName).toBe('code_review');
	});

	it('keeps the chip with the error when the prompt fails to load', () => {
		const { composer, files } = makeComposer();

		addLoadingPrompt(composer, 'p1', PROMPT);
		failLoadingPrompt(composer, 'p1', 'Server is not connected');

		expect(files()).toHaveLength(1);
		expect(files()[0]).toMatchObject({
			id: 'p1',
			isLoading: false,
			loadError: 'Server is not connected'
		});
		expect(files()[0].textContent).toBeUndefined();
	});

	it('leaves the other files alone', () => {
		const other: ChatUploadedFile = {
			file: new File(['notes'], 'notes.txt'),
			id: 'other',
			name: 'notes.txt',
			size: 5,
			type: MimeTypeText.PLAIN
		};
		const { composer, files } = makeComposer([other]);

		addLoadingPrompt(composer, 'p1', PROMPT);
		fillLoadedPrompt(composer, 'p1', {
			messages: [{ content: { text: 'Hello', type: 'text' }, role: 'user' }]
		} as GetPromptResult);

		expect(files()[0]).toBe(other);
		expect(files()[1].textContent).toBe('Hello');
	});
});

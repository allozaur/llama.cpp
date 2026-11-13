// MCP prompts and resources are drawn by the renderers the MCP extension
// contributes. These pin both sides of that seam: with the renderers the chat
// shows MCP's own components, and without them (the extension is off, or an old
// conversation is opened without it) the same data still shows, as plain text
// attachments, instead of disappearing.

import RenderersHarness from './components/RenderersHarness.svelte';
import { EXTENSIONS_LOCALSTORAGE_KEY } from '$lib/constants';
import { AttachmentType, MessageRole, MessageType, SpecialFileType } from '$lib/enums';
import { extensions } from '$lib/extensions';
import { contributeRenderers } from '$lib/extensions/mcp/renderers';
import type {
	ChatUploadedFile,
	DatabaseMessage,
	DatabaseMessageExtraMcpPrompt,
	DatabaseMessageExtraMcpResource,
	DatabaseMessageExtraTextFile
} from '$lib/types';
import { getAttachmentDisplayItems } from '$lib/utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

const EXTENSION_ID = 'test-mcp-renderers';
const MCP_PROMPT_GROUP = 'MCP Prompt message with actions';
const USER_GROUP = 'User message with actions';
const mcpPrompt: DatabaseMessageExtraMcpPrompt = {
	arguments: { path: 'src/agentic.ts' },
	content: 'Review the file at src/agentic.ts and list the bugs first.',
	name: 'code_review',
	promptName: 'code_review',
	serverName: 'github',
	type: AttachmentType.MCP_PROMPT
};
const mcpResource: DatabaseMessageExtraMcpResource = {
	content: 'Inference of LLMs in pure C/C++.',
	mimeType: 'text/markdown',
	name: 'README.md',
	serverName: 'filesystem',
	type: AttachmentType.MCP_RESOURCE,
	uri: 'file:///workspace/README.md'
};
const textFile: DatabaseMessageExtraTextFile = {
	content: 'Plain notes.',
	name: 'notes.txt',
	type: AttachmentType.TEXT
};
const pendingMcpPrompt: ChatUploadedFile = {
	file: new File([], 'code_review'),
	id: 'pending-prompt',
	mcpPrompt: { promptName: 'code_review', serverName: 'github' },
	name: 'code_review',
	size: 0,
	type: SpecialFileType.MCP_PROMPT
};

function userMessage(fields: Partial<DatabaseMessage> = {}): DatabaseMessage {
	return {
		children: [],
		content: '',
		convId: 'conv-1',
		id: 'user-1',
		parent: null,
		role: MessageRole.USER,
		timestamp: 1,
		type: MessageType.TEXT,
		...fields
	};
}

describe('without a renderer', () => {
	it('draws MCP attachments as plain text chips with their names', async () => {
		const screen = render(RenderersHarness, { attachments: [mcpPrompt, mcpResource] });
		const promptChip = screen.getByRole('button', { name: 'Preview code_review' });
		const resourceChip = screen.getByRole('button', { name: 'Preview README.md' });

		await expect.element(promptChip).toBeVisible();
		await expect.element(promptChip).toHaveTextContent('code_review');
		await expect.element(promptChip).toHaveTextContent('list the bugs first');
		await expect.element(resourceChip).toBeVisible();
		await expect.element(resourceChip).toHaveTextContent('README.md');
	});

	it('shows MCP attachments in the built-in preview', async () => {
		const screen = render(RenderersHarness, { attachments: [mcpPrompt, mcpResource] });

		await screen.getByRole('button', { name: 'Preview README.md' }).click();

		const dialog = screen.getByRole('dialog');

		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveTextContent('Inference of LLMs in pure C/C++.');
		// both are in the carousel
		await expect.element(dialog.getByRole('button', { name: 'Go to README.md' })).toBeVisible();
		await expect.element(dialog.getByRole('button', { name: 'Go to code_review' })).toBeVisible();
	});

	it('draws a message that is only an MCP prompt as a user message with that chip', async () => {
		const screen = render(RenderersHarness, { message: userMessage({ extra: [mcpPrompt] }) });
		const group = screen.getByRole('group', { name: USER_GROUP });

		await expect.element(group).toBeVisible();
		await expect.element(group.getByRole('button', { name: 'Preview code_review' })).toBeVisible();
		await expect
			.element(screen.getByRole('group', { name: MCP_PROMPT_GROUP }))
			.not.toBeInTheDocument();
	});
});

describe("with MCP's renderers", () => {
	beforeAll(async () => {
		extensions.register({
			description: "MCP's renderers alone",
			id: EXTENSION_ID,
			load: async () => ({ default: { activate: contributeRenderers } }),
			name: 'MCP renderers'
		});

		await extensions.activateEnabled();
	});

	afterAll(async () => {
		await extensions.setEnabled(EXTENSION_ID, false);
		// switching it off stored the choice; leave nothing behind for other tests
		localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);
	});

	it('claims a user message whose only content is one MCP prompt, and nothing else', () => {
		const [renderer] = extensions.contributions('messageRenderers');

		expect(extensions.contributions('messageRenderers')).toHaveLength(1);
		expect(renderer.forkable).toBe(false);
		expect(renderer.match(userMessage({ extra: [mcpPrompt] }))).toBe(true);
		expect(renderer.match(userMessage({ content: '  \n', extra: [mcpPrompt] }))).toBe(true);
		expect(renderer.match(userMessage({ content: 'and this', extra: [mcpPrompt] }))).toBe(false);
		expect(renderer.match(userMessage({ extra: [mcpPrompt, textFile] }))).toBe(false);
		expect(renderer.match(userMessage({ extra: [mcpResource] }))).toBe(false);
		expect(renderer.match(userMessage())).toBe(false);
		expect(renderer.match(userMessage({ extra: [mcpPrompt], role: MessageRole.ASSISTANT }))).toBe(
			false
		);
	});

	it('claims MCP prompt and MCP resource attachments, stored or pending, and nothing else', () => {
		const renderers = extensions.contributions('attachmentRenderers');
		const [resourceItem, promptItem, textItem, pendingItem] = getAttachmentDisplayItems({
			attachments: [textFile, mcpPrompt, mcpResource],
			uploadedFiles: [pendingMcpPrompt]
		});
		const claims = (item: typeof promptItem) => renderers.map((renderer) => renderer.match(item));

		expect(renderers).toHaveLength(2);
		expect(claims(promptItem)).toEqual([true, false]);
		expect(claims(pendingItem)).toEqual([true, false]);
		expect(claims(resourceItem)).toEqual([false, true]);
		expect(claims(textItem)).toEqual([false, false]);
	});

	it('draws a message that is only an MCP prompt as an MCP prompt, without a fork action', async () => {
		const screen = render(RenderersHarness, { message: userMessage({ extra: [mcpPrompt] }) });
		const group = screen.getByRole('group', { name: MCP_PROMPT_GROUP });

		await expect.element(group).toBeVisible();
		await expect.element(group).toHaveTextContent('list the bugs first');
		await expect.element(group.getByRole('button', { name: 'Copy' })).toBeVisible();
		await expect
			.element(group.getByRole('button', { name: 'Fork conversation' }))
			.not.toBeInTheDocument();
		await expect.element(screen.getByRole('group', { name: USER_GROUP })).not.toBeInTheDocument();
	});

	it('leaves other user messages to the default, fork action included', async () => {
		const screen = render(RenderersHarness, {
			message: userMessage({ content: 'Hello', extra: [mcpPrompt] })
		});
		const group = screen.getByRole('group', { name: USER_GROUP });

		await expect.element(group).toBeVisible();
		await expect.element(group.getByRole('button', { name: 'Fork conversation' })).toBeVisible();
	});

	it('draws an MCP resource with its own preview dialog', async () => {
		const screen = render(RenderersHarness, { attachments: [mcpResource] });

		await expect
			.element(screen.getByRole('button', { name: 'Preview README.md' }))
			.not.toBeInTheDocument();

		// the chip is a button inside its tooltip trigger, itself a button
		await screen.getByRole('button', { name: 'README.md' }).last().click();

		const dialog = screen.getByRole('dialog');

		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveTextContent('file:///workspace/README.md');
		await expect.element(dialog).toHaveTextContent('Inference of LLMs in pure C/C++.');
	});

	it('keeps MCP attachments out of the built-in preview', async () => {
		const screen = render(RenderersHarness, { attachments: [textFile, mcpPrompt, mcpResource] });

		await screen.getByRole('button', { name: 'Preview notes.txt' }).click();

		const dialog = screen.getByRole('dialog');

		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveTextContent('Plain notes.');
		// the text file is alone in the carousel, so there is no thumbnail strip
		await expect
			.element(dialog.getByRole('button', { name: 'Go to notes.txt' }))
			.not.toBeInTheDocument();
		await expect
			.element(dialog.getByRole('button', { name: 'Go to README.md' }))
			.not.toBeInTheDocument();
	});
});

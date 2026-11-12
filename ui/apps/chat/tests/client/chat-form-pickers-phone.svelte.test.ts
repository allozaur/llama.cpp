// Guards the chat form's typed pickers on a phone: `@` opens a drawer with a search
// field of its own, since a list by the form can not be placed reliably around the
// on-screen keyboard, and `/` opens nothing. A desktop keeps its lists by the form.

import ChatFormPickersHarness from './components/ChatFormPickersHarness.svelte';
import ChatFormTestWrapper from './components/ChatFormTestWrapper.svelte';
import { EditorView } from '@codemirror/view';
import { BuiltInTool } from '$lib/enums';
import { ToolsService } from '$lib/services/tools.service';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { OpenAIToolDefinition } from '$lib/types';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const PHONE = { height: 844, width: 390 };
const DESKTOP = { height: 900, width: 1280 };
const FILE_SEARCH_DEF: OpenAIToolDefinition = {
	function: { description: '', name: BuiltInTool.SERVER_FILE_GLOB_SEARCH, parameters: {} },
	type: 'function'
};
// what the editor holds once `src/main.ts` under `/home/u` is picked
const MENTION = '[main.ts](file:///home/u/src/main.ts) ';
// long enough for a picker to have mounted, as it does when it opens
const PICKER_MOUNT_MS = 300;

// The store keeps its server tool list private; tests inject it through
// the reactive field so the derived gates recompute.
function setServerTools(defs: OpenAIToolDefinition[]) {
	(toolsStore as unknown as { _serverTools: OpenAIToolDefinition[] })._serverTools = defs;
}

async function renderForm(props: { expandable?: boolean } = {}) {
	const { container } = render(ChatFormTestWrapper, props);

	await tick();

	const content = container.querySelector<HTMLElement>('.cm-content');
	const editor = content && EditorView.findFromDOM(content);

	if (!editor) throw new Error('editor not rendered');

	// as while writing: the keyboard is in the message
	editor.focus();

	// as typing does: the text goes in at the caret, which ends up after it
	const type = async (text: string) => {
		editor.dispatch(editor.state.replaceSelection(text));
		await tick();
	};
	const text = () => editor.state.doc.toString();
	const caret = () => editor.state.selection.main.head;

	return { caret, container, editor, text, type };
}

const drawer = () => document.querySelector('[data-slot="drawer-content"]');
const popover = () => document.querySelector('[data-slot="popover-content"]');
const searchField = () => drawer()?.querySelector<HTMLInputElement>('input[type="search"]') ?? null;
const settle = () => new Promise((resolve) => setTimeout(resolve, PICKER_MOUNT_MS));

async function pickMainTs() {
	await userEvent.fill(searchField()!, 'main');
	await page.getByText('main.ts', { exact: true }).click();
}

describe('ChatForm pickers on a phone', () => {
	beforeEach(() => {
		setServerTools([FILE_SEARCH_DEF]);
		vi.spyOn(ToolsService, 'executeToolRaw').mockResolvedValue({
			base: '/home/u',
			entries: [{ path: 'src/main.ts', type: 'file' }]
		});
	});

	afterEach(async () => {
		setServerTools([]);
		vi.restoreAllMocks();
		await page.viewport(DESKTOP.width, DESKTOP.height);
	});

	it('opens the command picker on a desktop', async () => {
		await page.viewport(DESKTOP.width, DESKTOP.height);

		const { type } = await renderForm();

		await type('/');

		await expect.poll(popover).not.toBeNull();
	});

	it('searches mentions by the form on a desktop, once a character follows the @', async () => {
		await page.viewport(DESKTOP.width, DESKTOP.height);

		const { type } = await renderForm();

		await type('@');
		await settle();
		expect(popover()).toBeNull();

		await type('m');

		await expect.poll(popover).not.toBeNull();
		expect(drawer()).toBeNull();
		expect(popover()!.querySelector('input')).toBeNull();
	});

	it('opens no picker for a / on a phone', async () => {
		await page.viewport(PHONE.width, PHONE.height);

		const { type } = await renderForm();

		await type('/');
		await settle();

		expect(popover()).toBeNull();
		expect(drawer()).toBeNull();
	});

	it('opens a drawer with a search field for an @ on a phone', async () => {
		await page.viewport(PHONE.width, PHONE.height);

		const { type } = await renderForm();

		await type('@');

		await expect.poll(searchField).not.toBeNull();
		expect(popover()).toBeNull();
		// the query is typed in the drawer, not in the message: the focus moves there
		await expect.poll(() => document.activeElement).toBe(searchField());
	});

	it('opens no drawer for an @ on a phone when there is no file search to offer', async () => {
		setServerTools([]);
		await page.viewport(PHONE.width, PHONE.height);

		const { type } = await renderForm();

		await type('@');
		await settle();

		expect(drawer()).toBeNull();
	});

	it('inserts the mention picked in the drawer where the @ was', async () => {
		await page.viewport(PHONE.width, PHONE.height);

		const { caret, editor, text, type } = await renderForm();

		await type('see  now');
		// between the two spaces
		editor.dispatch({ selection: { anchor: 4 } });
		await type('@');
		await expect.poll(searchField).not.toBeNull();
		await pickMainTs();

		await expect.poll(text).toBe(`see ${MENTION} now`);
		expect(caret()).toBe(`see ${MENTION}`.length);
		await expect.poll(drawer).toBeNull();
	});

	it('leaves the message and the caret alone when the drawer is dismissed', async () => {
		await page.viewport(PHONE.width, PHONE.height);

		const { caret, editor, text, type } = await renderForm();

		await type('a  b');
		editor.dispatch({ selection: { anchor: 2 } });
		await type('@');
		await expect.poll(() => document.activeElement).toBe(searchField());
		await userEvent.fill(searchField()!, 'main');
		await userEvent.keyboard('{Escape}');

		await expect.poll(drawer).toBeNull();
		expect(text()).toBe('a @ b');
		expect(caret()).toBe(3);
		// writing goes on where it stopped
		await expect.poll(() => editor.hasFocus).toBe(true);

		// the dismissed @ is plain text from here on
		await type('alice');
		await settle();

		expect(drawer()).toBeNull();
		expect(text()).toBe('a @alice b');
	});

	it('opens the drawer from the expanded sheet too', async () => {
		await page.viewport(PHONE.width, PHONE.height);

		const { container, text, type } = await renderForm({ expandable: true });

		await type('one\ntwo\nthree\nfour ');
		expect(container.querySelector('.chat-form-input.expanded')).not.toBeNull();

		await type('@');
		await expect.poll(searchField).not.toBeNull();
		await pickMainTs();

		await expect.poll(text).toBe(`one\ntwo\nthree\nfour ${MENTION}`);
		await expect.poll(drawer).toBeNull();
	});
});

describe('picker routing on a phone', () => {
	it('opens the mention picker on a bare @ and seeds it with what follows', async () => {
		const screen = render(ChatFormPickersHarness, { phone: true });
		const pickers = screen.component.getPickers();

		screen.component.type('@');
		expect(pickers.isMentionPickerOpen).toBe(true);
		expect(pickers.mentionQuery).toBe('');

		pickers.handleMentionPickerClose();
		screen.component.type('');
		screen.component.type('@src');
		expect(pickers.isMentionPickerOpen).toBe(true);
		expect(pickers.mentionQuery).toBe('src');
	});

	it('keeps a dismissed @ literal until it is deleted', async () => {
		const screen = render(ChatFormPickersHarness, { phone: true });
		const pickers = screen.component.getPickers();

		screen.component.type('@');
		pickers.handleMentionPickerClose();

		screen.component.type('@a');
		screen.component.type('@al');
		expect(pickers.isMentionPickerOpen).toBe(false);

		screen.component.type('');
		screen.component.type('@');
		expect(pickers.isMentionPickerOpen).toBe(true);
	});

	it('treats a leading / as text, so an @ after it still opens the picker', async () => {
		const screen = render(ChatFormPickersHarness, { phone: true });
		const pickers = screen.component.getPickers();

		screen.component.type('/model');
		expect(pickers.isCommandPickerOpen).toBe(false);

		screen.component.type('/tmp/build fails, see @');
		expect(pickers.isMentionPickerOpen).toBe(true);
	});

	it('waits for a character after the @ where the chat input is the search field', async () => {
		const screen = render(ChatFormPickersHarness);
		const pickers = screen.component.getPickers();

		screen.component.type('@');
		expect(pickers.isMentionPickerOpen).toBe(false);

		screen.component.type('@s');
		expect(pickers.isMentionPickerOpen).toBe(true);
	});
});

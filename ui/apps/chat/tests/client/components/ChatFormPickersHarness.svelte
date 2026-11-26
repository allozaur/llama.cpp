<script lang="ts">
	import type { ComposerCommand, ComposerHandle } from '#lib/extensions/index.ts';
	import {
		useChatFormPickers,
		type UseChatFormPickersReturn
	} from '#lib/hooks/use-chat-form-pickers.svelte.ts';

	interface Props {
		/** The slash commands extensions contribute. */
		commands?: ComposerCommand[];
		cwd?: string | null;
		serverHome?: string | null;
	}

	let { commands = [], cwd = null, serverHome = null }: Props = $props();

	let value = $state('');
	let caretOffset = $state(0);
	const calls: string[] = [];

	const composer: ComposerHandle = {
		addUploadedFile: () => {},
		closePicker: () => pickers.closePicker(),
		focusInput: () => {},
		openPicker: (id, query) => pickers.openPicker(id, query),
		updateUploadedFile: () => {}
	};

	const pickers = useChatFormPickers({
		canCompact: () => true,
		canEditSystemMessage: () => true,
		editsCwdInline: () => true,
		focusInput: () => {},
		getCaretOffset: () => caretOffset,
		getComposer: () => composer,
		getContributedCommands: () => commands,
		getCwd: () => cwd,
		getPickersRef: () => undefined,
		getServerHome: () => serverHome,
		getShowModelSelector: () => true,
		getValue: () => value,
		hasCwdTools: () => true,
		hasSkills: () => true,
		onCompact: () => {
			calls.push('onCompact');
		},
		onSystemMessage: () => {
			calls.push('onSystemMessage');
		},
		openModelSelector: () => {
			calls.push('openModelSelector');
		},
		opensOnInput: () => true,
		setCaretOffset: (o) => {
			caretOffset = o;
		},
		setValue: (v) => {
			value = v;
			calls.push(`setValue:${v}`);
		}
	});

	// Simulate the user typing: update the buffer and run the input flow.
	export function type(text: string) {
		value = text;
		caretOffset = text.length;
		pickers.handleInput();
	}

	// The same, with the caret at `|` in `text`: an edit somewhere in the middle.
	export function typeAt(text: string) {
		value = text.replace('|', '');
		caretOffset = text.indexOf('|');
		pickers.handleInput();
	}

	export function getCaretOffset() {
		return caretOffset;
	}

	export function getValue() {
		return value;
	}

	export function getCalls() {
		return calls;
	}

	export function getPickers(): UseChatFormPickersReturn {
		return pickers;
	}
</script>

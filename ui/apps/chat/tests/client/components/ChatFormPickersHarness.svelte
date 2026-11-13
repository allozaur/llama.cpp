<script lang="ts">
	import type { ComposerCommand, ComposerHandle } from '$lib/extensions';
	import {
		useChatFormPickers,
		type UseChatFormPickersReturn
	} from '$lib/hooks/use-chat-form-pickers.svelte';

	interface Props {
		/** The slash commands extensions contribute. */
		commands?: ComposerCommand[];
	}

	let { commands = [] }: Props = $props();

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
		focusInput: () => {},
		getCaretOffset: () => caretOffset,
		getComposer: () => composer,
		getContributedCommands: () => commands,
		getCwd: () => null,
		getPickersRef: () => undefined,
		getServerHome: () => null,
		getShowModelSelector: () => true,
		getValue: () => value,
		hasCwdTools: () => true,
		onCompact: () => {
			calls.push('onCompact');
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

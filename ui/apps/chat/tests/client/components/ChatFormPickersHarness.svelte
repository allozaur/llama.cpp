<script lang="ts">
	import {
		useChatFormPickers,
		type UseChatFormPickersReturn
	} from '$lib/hooks/use-chat-form-pickers.svelte';

	interface Props {
		/** As on a phone: the mention picker has its own search field and `/` opens nothing. */
		phone?: boolean;
	}

	let { phone = false }: Props = $props();

	let value = $state('');
	let caretOffset = $state(0);
	const calls: string[] = [];

	const pickers = useChatFormPickers({
		canCompact: () => true,
		focusInput: () => {},
		getCaretOffset: () => caretOffset,
		getCwd: () => null,
		getPickersRef: () => undefined,
		getServerHome: () => null,
		getShowModelSelector: () => true,
		getValue: () => value,
		hasCwdTools: () => true,
		hasPrompts: () => true,
		mentionHasOwnSearch: () => phone,
		onCompact: () => {
			calls.push('onCompact');
		},
		openModelSelector: () => {
			calls.push('openModelSelector');
		},
		opensCommandsOnInput: () => !phone,
		opensMentionsOnInput: () => true,
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

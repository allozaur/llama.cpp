<script lang="ts">
	import type { ComposerPickerProps } from '../../../points/composer';
	import { promptArguments } from '../../prompt-arguments.svelte';
	import ChatFormPickerMcpPromptArguments from '../chat/ChatFormPickerMcpPrompts/ChatFormPickerMcpPromptArguments.svelte';

	let { anchor, isOpen, onClose }: ComposerPickerProps = $props();

	let pickerRef: ChatFormPickerMcpPromptArguments | undefined = $state(undefined);

	// closed any other way than by its Use Prompt button, the form gives no arguments
	$effect(() => {
		if (!isOpen) promptArguments.answer(null);
	});

	export function handleKeydown(event: KeyboardEvent): boolean {
		return pickerRef?.handleKeydown(event) ?? false;
	}
</script>

<ChatFormPickerMcpPromptArguments
	bind:this={pickerRef}
	customAnchor={anchor}
	{isOpen}
	{onClose}
	onSubmit={(args) => {
		promptArguments.answer(args);
		onClose();
	}}
	prompt={promptArguments.prompt}
/>

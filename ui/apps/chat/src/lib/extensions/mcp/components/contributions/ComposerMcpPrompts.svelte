<script lang="ts">
	import type { ComposerPickerProps } from '../../../points/composer';
	import { addLoadingPrompt, failLoadingPrompt, fillLoadedPrompt } from '../../composer-prompts';
	import { pendingPromptArguments } from '../../prompt-arguments.svelte';
	import ChatFormPickerMcpPrompts from '../chat/ChatFormPickerMcpPrompts/ChatFormPickerMcpPrompts.svelte';
	import { tick } from 'svelte';

	let { anchor, composer, isOpen, onClose, query }: ComposerPickerProps = $props();

	let pickerRef: ChatFormPickerMcpPrompts | undefined = $state(undefined);

	// a prompt chosen in the System message list opens the picker straight on its argument form
	$effect(() => {
		const prompt = pendingPromptArguments.prompt;

		if (!isOpen || !prompt) return;

		pendingPromptArguments.clear();
		void tick().then(() => pickerRef?.openArguments(prompt));
	});

	export function handleKeydown(event: KeyboardEvent): boolean {
		return pickerRef?.handleKeydown(event) ?? false;
	}
</script>

<ChatFormPickerMcpPrompts
	bind:this={pickerRef}
	customAnchor={anchor}
	{isOpen}
	{onClose}
	onPromptLoadComplete={(placeholderId, result) =>
		fillLoadedPrompt(composer, placeholderId, result)}
	onPromptLoadError={(placeholderId, error) => failLoadingPrompt(composer, placeholderId, error)}
	onPromptLoadStart={(placeholderId, promptInfo, args) =>
		addLoadingPrompt(composer, placeholderId, promptInfo, args)}
	searchQuery={query}
/>

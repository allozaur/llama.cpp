<script lang="ts">
	import type { ComposerPickerProps } from '../points/composer';
	import { addLoadingPrompt, failLoadingPrompt, fillLoadedPrompt } from './composer-prompts';
	import { ChatFormPickerMcpPrompts } from '$lib/components/app';

	let { anchor, composer, isOpen, onClose, query }: ComposerPickerProps = $props();

	let pickerRef: ChatFormPickerMcpPrompts | undefined = $state(undefined);

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

<script lang="ts">
	import { mcpStore } from '../../../stores/index.svelte';
	import ChatFormPickerItemHeader from '../ChatFormPickerItemHeader.svelte';
	import ChatFormPromptPickerArgumentForm from './ChatFormPromptPickerArgumentForm.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import { ChatFormPickerPopover } from '#lib/components/app/chat/index.ts';
	import { KeyboardKey } from '#lib/enums/index.ts';
	import type { MCPPromptInfo } from '#lib/types/index.ts';
	import { debounce } from '#lib/utils/index.ts';

	interface Props {
		class?: string;
		customAnchor?: HTMLElement | null;
		isOpen?: boolean;
		/** The prompt whose arguments are asked for. */
		prompt: MCPPromptInfo | null;
		/** Closed without the arguments: Cancel, Escape or a click outside. */
		onClose?: () => void;
		/** The arguments as filled in, the empty ones left out. */
		onSubmit?: (args: Record<string, string>) => void;
	}

	let {
		class: className = '',
		customAnchor = null,
		isOpen = false,
		onClose,
		onSubmit,
		prompt
	}: Props = $props();

	let promptArgs = $state<Record<string, string>>({});
	let suggestions = $state<Record<string, string[]>>({});
	let loadingSuggestions = $state<Record<string, boolean>>({});
	let activeAutocomplete = $state<string | null>(null);
	let autocompleteIndex = $state(0);

	let server = $derived(
		prompt ? mcpStore.getServers().find((s) => s.id === prompt.serverName) : undefined
	);

	// a fresh form every time it opens, with the first argument ready to type
	$effect(() => {
		if (!isOpen || !prompt) return;

		promptArgs = {};
		suggestions = {};
		activeAutocomplete = null;

		const first = prompt.arguments?.[0];

		if (first) {
			requestAnimationFrame(() => document.getElementById(`arg-${first.name}`)?.focus());
		}
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		onSubmit?.(
			Object.fromEntries(Object.entries(promptArgs).filter(([, value]) => value.trim() !== ''))
		);
	}

	const fetchCompletions = debounce(async (argName: string, value: string) => {
		if (!prompt || value.length < 1) {
			suggestions[argName] = [];

			return;
		}

		loadingSuggestions[argName] = true;

		try {
			const result = await mcpStore.getPromptCompletions(
				prompt.serverName,
				prompt.name,
				argName,
				value
			);
			// a server can send empty strings among its suggestions
			const values = result?.values.filter((v) => v.trim() !== '') ?? [];

			suggestions[argName] = values;

			if (values.length > 0) {
				activeAutocomplete = argName;
				autocompleteIndex = 0;
			}
		} catch (error) {
			console.error('[ChatFormPickerMcpPromptArguments] Failed to fetch completions:', error);
			suggestions[argName] = [];
		} finally {
			loadingSuggestions[argName] = false;
		}
	}, 200);

	function handleArgInput(argName: string, value: string) {
		promptArgs[argName] = value;
		fetchCompletions(argName, value);
	}

	function selectSuggestion(argName: string, value: string) {
		promptArgs[argName] = value;
		suggestions[argName] = [];
		activeAutocomplete = null;
	}

	function handleArgKeydown(event: KeyboardEvent, argName: string) {
		const argSuggestions = suggestions[argName] ?? [];

		if (event.key === KeyboardKey.ESCAPE) {
			event.preventDefault();
			event.stopPropagation();
			onClose?.();

			return;
		}

		if (argSuggestions.length === 0 || activeAutocomplete !== argName) return;

		if (event.key === KeyboardKey.ARROW_DOWN) {
			event.preventDefault();
			autocompleteIndex = Math.min(autocompleteIndex + 1, argSuggestions.length - 1);
		} else if (event.key === KeyboardKey.ARROW_UP) {
			event.preventDefault();
			autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
		} else if (event.key === KeyboardKey.ENTER && argSuggestions[autocompleteIndex]) {
			event.preventDefault();
			event.stopPropagation();
			selectSuggestion(argName, argSuggestions[autocompleteIndex]);
		}
	}

	function handleArgBlur(argName: string) {
		// Delay to allow click on suggestion
		setTimeout(() => {
			if (activeAutocomplete === argName) {
				suggestions[argName] = [];
				activeAutocomplete = null;
			}
		}, 150);
	}

	function handleArgFocus(argName: string) {
		if ((suggestions[argName]?.length ?? 0) > 0) {
			activeAutocomplete = argName;
		}
	}

	export function handleKeydown(event: KeyboardEvent): boolean {
		if (!isOpen || event.key !== KeyboardKey.ESCAPE) return false;

		event.preventDefault();
		onClose?.();

		return true;
	}
</script>

<ChatFormPickerPopover
	bind:isOpen
	class={className}
	{customAnchor}
	{onClose}
	onKeydown={handleKeydown}
	srLabel="Open prompt arguments"
>
	{#if prompt}
		<div class="p-4">
			<ChatFormPickerItemHeader
				description={prompt.description}
				{server}
				serverLabel={server ? mcpStore.getServerLabel(server) : prompt.serverName}
				title={prompt.title || prompt.name}
			>
				{#snippet titleExtra()}
					{#if prompt.arguments?.length}
						<Badge variant="secondary">
							{prompt.arguments.length} arg{prompt.arguments.length > 1 ? 's' : ''}
						</Badge>
					{/if}
				{/snippet}
			</ChatFormPickerItemHeader>

			<ChatFormPromptPickerArgumentForm
				{activeAutocomplete}
				{autocompleteIndex}
				{loadingSuggestions}
				onArgBlur={handleArgBlur}
				onArgFocus={handleArgFocus}
				onArgInput={handleArgInput}
				onArgKeydown={handleArgKeydown}
				onCancel={() => onClose?.()}
				onSelectSuggestion={selectSuggestion}
				onSubmit={handleSubmit}
				{prompt}
				{promptArgs}
				promptError={null}
				{suggestions}
			/>
		</div>
	{/if}
</ChatFormPickerPopover>

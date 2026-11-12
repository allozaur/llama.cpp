<script lang="ts">
	import ChatFormPickerCommand from './ChatFormPickerCommand.svelte';
	import ChatFormPickerMention from './ChatFormPickerMention.svelte';
	import type { ComposerHandle, ComposerPicker, ComposerPickerExports } from '$lib/extensions';
	import type { ChatFormCommand, FileMentionEntry } from '$lib/types';

	interface Props {
		/** What every picker's popover floats by. */
		anchor?: HTMLElement | null;
		isCommandPickerOpen?: boolean;
		commandQuery?: string;
		commands?: ChatFormCommand[];
		/** Handed to the pickers extensions contribute. */
		composer: ComposerHandle;
		/** The pickers extensions contribute. */
		pickers?: ComposerPicker[];
		/** The contributed picker that is open, if any. */
		openPickerId?: string | null;
		pickerQuery?: string;
		isMentionPickerOpen?: boolean;
		mentionQuery?: string;
		scopePath?: string | null;
		onCommandPickerClose?: () => void;
		onCommandSelect?: (command: ChatFormCommand) => void;
		onPickerClose?: () => void;
		onMentionPickerClose?: () => void;
		onMentionOpened?: () => void;
		onMentionSelect?: (entry: FileMentionEntry) => void;
	}

	let {
		anchor,
		commandQuery,
		commands = [],
		composer,
		isCommandPickerOpen,
		isMentionPickerOpen,
		mentionQuery,
		onCommandPickerClose,
		onCommandSelect,
		onMentionOpened,
		onMentionPickerClose,
		onMentionSelect,
		onPickerClose,
		openPickerId = null,
		pickerQuery,
		pickers = [],
		scopePath
	}: Props = $props();

	let commandPickerRef: ChatFormPickerCommand | undefined = $state(undefined);
	let contributedPickerRefs: Record<string, ComposerPickerExports | undefined> = $state({});
	let mentionPickerRef: ChatFormPickerMention | undefined = $state(undefined);

	/** Delegate keyboard events to the active picker child; true if handled. */
	export function handleKeydown(event: KeyboardEvent): boolean {
		if (isCommandPickerOpen && commandPickerRef?.handleKeydown(event)) {
			return true;
		}

		if (openPickerId !== null && contributedPickerRefs[openPickerId]?.handleKeydown(event)) {
			return true;
		}

		if (isMentionPickerOpen && mentionPickerRef?.handleKeydown(event)) {
			return true;
		}

		return false;
	}
</script>

<ChatFormPickerCommand
	bind:this={commandPickerRef}
	{commands}
	customAnchor={anchor}
	isOpen={isCommandPickerOpen ?? false}
	onClose={onCommandPickerClose ?? (() => {})}
	onSelect={onCommandSelect ?? (() => {})}
	query={commandQuery ?? ''}
/>

{#each pickers as picker (picker.id)}
	{@const isOpen = openPickerId === picker.id}

	<picker.component
		bind:this={contributedPickerRefs[picker.id]}
		anchor={anchor ?? null}
		{composer}
		{isOpen}
		onClose={onPickerClose ?? (() => {})}
		query={isOpen ? (pickerQuery ?? '') : ''}
	/>
{/each}

<ChatFormPickerMention
	bind:this={mentionPickerRef}
	customAnchor={anchor}
	isOpen={isMentionPickerOpen ?? false}
	onClose={onMentionPickerClose ?? (() => {})}
	onOpened={onMentionOpened}
	onSelect={onMentionSelect ?? (() => {})}
	query={mentionQuery ?? ''}
	scopePath={scopePath ?? null}
/>

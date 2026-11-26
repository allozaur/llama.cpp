<script lang="ts">
	import ChatFormPickerPromptOrigin from './ChatFormPickerPromptOrigin.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import {
		ChatFormPickerList,
		ChatFormPickerListItem,
		ChatFormPickerListItemSkeleton,
		ChatFormPickerPopover
	} from '#lib/components/app/chat/index.ts';
	import { SKILL_SEARCH_MIN_ITEMS } from '#lib/constants/index.ts';
	import type { ComposerPickerProps } from '#lib/extensions/index.ts';
	import { usePickerNavigation } from '#lib/hooks/use-picker-navigation.svelte.ts';
	import { SkillToolsService, type SourcedSkill } from '#lib/services/skill-tools.service.ts';
	import { untrack } from 'svelte';

	/**
	 * The skill picker `/skill` opens: the skills of the machine's folders and the
	 * ones extensions offer, such as an MCP server's, each with where it comes
	 * from. Picking one attaches it to the message being written.
	 */
	let { anchor, composer, isOpen, onClose, query }: ComposerPickerProps = $props();

	let skills = $state.raw<SourcedSkill[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');

	let items = $derived.by(() => {
		const search = searchQuery.trim().toLowerCase();

		if (!search) return skills;

		return skills.filter(
			({ entry }) =>
				entry.name.toLowerCase().includes(search) ||
				entry.description.toLowerCase().includes(search) ||
				entry.origin.toLowerCase().includes(search)
		);
	});

	const nav = usePickerNavigation({
		count: () => items.length,
		isOpen: () => isOpen,
		onClose: () => onClose(),
		onSelect: (index) => pick(items[index])
	});

	// opening the picker is the need for the listings
	$effect(() => {
		if (!isOpen) return;

		untrack(() => {
			nav.reset(0);
			void load();
		});
	});

	// what is typed after `/skill` searches the list, like its own search field does
	$effect(() => {
		if (isOpen) searchQuery = query;
	});

	$effect(() => {
		if (nav.hoveredIndex >= items.length) nav.reset(0);
	});

	async function load() {
		isLoading = true;
		// in the order of the sources; one that fails to list leaves the others' skills
		skills = (await SkillToolsService.listings()).flatMap((listing) => listing.skills);
		isLoading = false;
	}

	function pick({ entry, source }: SourcedSkill) {
		onClose();
		void source.attach(entry, composer);
	}

	export function handleKeydown(event: KeyboardEvent): boolean {
		return nav.handleKeydown(event);
	}
</script>

<ChatFormPickerPopover
	bind:isOpen
	customAnchor={anchor}
	{onClose}
	onKeydown={handleKeydown}
	srLabel="Open skill picker"
>
	<ChatFormPickerList
		bind:searchQuery
		emptyMessage={skills.length === 0 ? 'No skills available' : 'No matching skill'}
		{isLoading}
		itemKey={({ entry, source }) => `${source.id}:${entry.id}`}
		{items}
		scrollTrigger={nav.scrollTrigger}
		searchPlaceholder="Search skills..."
		selectedIndex={nav.hoveredIndex}
		showSearchInput={skills.length >= SKILL_SEARCH_MIN_ITEMS}
	>
		{#snippet item(skill, index, isSelected)}
			<ChatFormPickerListItem
				dataIndex={index}
				{isSelected}
				onclick={() => pick(skill)}
				onhover={() => nav.setHover(index)}
			>
				<div class="min-w-0 flex-1">
					<ChatFormPickerPromptOrigin class="mb-0.5" entry={skill.entry} source={skill.source} />

					<div class="flex items-center gap-2">
						<span class="truncate font-medium">{skill.entry.name}</span>

						{#if skill.entry.isUnverified}
							<Badge variant="secondary">Cannot be verified</Badge>
						{/if}
					</div>

					{#if skill.entry.description}
						<p class="mt-0.5 truncate text-body-sm text-muted-foreground">
							{skill.entry.description}
						</p>
					{/if}
				</div>
			</ChatFormPickerListItem>
		{/snippet}

		{#snippet skeleton()}
			<ChatFormPickerListItemSkeleton titleWidth="w-32" />
		{/snippet}
	</ChatFormPickerList>
</ChatFormPickerPopover>

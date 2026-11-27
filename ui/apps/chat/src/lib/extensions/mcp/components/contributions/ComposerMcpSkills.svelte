<script lang="ts">
	import type { ComposerPickerProps } from '../../../points/composer';
	import { attachSkill } from '../../composer-skills';
	import { MCP_SKILL_DYNAMIC_RESOURCES } from '../../skills/constants';
	import { mcpStore } from '../../stores/index.svelte';
	import { skillServersInUse } from '../../tools';
	import ChatFormPickerItemHeader from '../chat/ChatFormPickerItemHeader.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import type { Skill } from '@modelcontextprotocol/client/ext/skills';
	import {
		ChatFormPickerList,
		ChatFormPickerListItem,
		ChatFormPickerListItemSkeleton,
		ChatFormPickerPopover
	} from '#lib/components/app/chat/index.ts';
	import { KeyboardKey } from '#lib/enums/index.ts';
	import { untrack } from 'svelte';

	/** A skill with the server it is from: a name or a URI alone does not say which skill. */
	interface PickableSkill {
		serverId: string;
		skill: Skill;
	}

	/** Between the server id and the URI in an item's key. */
	const ITEM_KEY_SEPARATOR = ' ';
	/** A listing this long gets a search field. */
	const SEARCH_INPUT_MIN_ITEMS = 4;

	let { anchor, isOpen, onClose, query }: ComposerPickerProps = $props();

	let skills = $state.raw<PickableSkill[]>([]);
	let isLoading = $state(false);
	let selectedIndex = $state(0);
	let internalSearchQuery = $state('');
	// bumped on ArrowUp/ArrowDown only, so the list scrolls on keyboard nav but not on hover
	let scrollTrigger = $state(0);

	let filteredSkills = $derived.by(() => {
		const search = (query || internalSearchQuery).toLowerCase();

		if (!search) return skills;

		return skills.filter(
			({ skill }) =>
				skill.frontmatter.name.toLowerCase().includes(search) ||
				skill.frontmatter.description.toLowerCase().includes(search)
		);
	});

	// opening the picker is the need for the listings
	$effect(() => {
		if (!isOpen) return;

		selectedIndex = 0;
		untrack(() => void loadSkills());
	});

	$effect(() => {
		if (selectedIndex >= filteredSkills.length) selectedIndex = 0;
	});

	async function loadSkills() {
		isLoading = true;

		// in the order of the servers; a server that fails to list leaves the others' skills
		const serverIds = skillServersInUse();
		const listings = await Promise.allSettled(
			serverIds.map((serverId) => mcpStore.skills.list(serverId))
		);

		skills = listings.flatMap((listing, index) =>
			listing.status === 'fulfilled'
				? listing.value.map((skill) => ({ serverId: serverIds[index], skill }))
				: []
		);
		isLoading = false;
	}

	function pick({ serverId, skill }: PickableSkill) {
		onClose();
		void attachSkill(serverId, skill);
	}

	export function handleKeydown(event: KeyboardEvent): boolean {
		if (!isOpen) return false;

		if (event.key === KeyboardKey.ESCAPE) {
			event.preventDefault();
			onClose();

			return true;
		}

		if (event.key === KeyboardKey.ARROW_DOWN || event.key === KeyboardKey.ARROW_UP) {
			event.preventDefault();

			if (filteredSkills.length > 0) {
				const step = event.key === KeyboardKey.ARROW_DOWN ? 1 : -1;

				selectedIndex = (selectedIndex + step + filteredSkills.length) % filteredSkills.length;
				scrollTrigger++;
			}

			return true;
		}

		if (event.key === KeyboardKey.ENTER) {
			event.preventDefault();

			if (filteredSkills[selectedIndex]) pick(filteredSkills[selectedIndex]);

			return true;
		}

		return false;
	}
</script>

<ChatFormPickerPopover
	customAnchor={anchor}
	{isOpen}
	{onClose}
	onKeydown={handleKeydown}
	srLabel="Open skill picker"
>
	<ChatFormPickerList
		bind:searchQuery={internalSearchQuery}
		emptyMessage="No MCP skills available"
		{isLoading}
		itemKey={({ serverId, skill }) => `${serverId}${ITEM_KEY_SEPARATOR}${skill.uri}`}
		items={filteredSkills}
		{scrollTrigger}
		searchPlaceholder="Search skills..."
		{selectedIndex}
		showSearchInput={skills.length >= SEARCH_INPUT_MIN_ITEMS}
	>
		{#snippet item(pickable, index, isSelected)}
			<ChatFormPickerListItem dataIndex={index} {isSelected} onclick={() => pick(pickable)}>
				<ChatFormPickerItemHeader
					description={pickable.skill.frontmatter.description}
					server={mcpStore.getServerById(pickable.serverId)}
					serverLabel={mcpStore.getServerDisplayName(pickable.serverId)}
					title={pickable.skill.frontmatter.name}
				>
					{#snippet titleExtra()}
						{#if pickable.skill.resources === MCP_SKILL_DYNAMIC_RESOURCES}
							<Badge variant="secondary">Cannot be verified</Badge>
						{/if}
					{/snippet}
				</ChatFormPickerItemHeader>
			</ChatFormPickerListItem>
		{/snippet}

		{#snippet skeleton()}
			<ChatFormPickerListItemSkeleton titleWidth="w-32" />
		{/snippet}
	</ChatFormPickerList>
</ChatFormPickerPopover>

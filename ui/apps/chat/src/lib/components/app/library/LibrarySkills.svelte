<script lang="ts">
	import LibrarySkillRow from './LibrarySkillRow.svelte';
	import * as Empty from '@ggml-org/llama-ui/ui/empty';
	import { Skeleton } from '@ggml-org/llama-ui/ui/skeleton';
	import { SearchX } from '@lucide/svelte';
	import { DialogSkill } from '#lib/components/app/index.ts';
	import { LOCAL_SKILL_FOLDERS, SKILL_ICON } from '#lib/constants/index.ts';
	import type { SkillEntry, SkillSource } from '#lib/extensions/index.ts';
	import { skillsStore, toolsStore } from '#lib/stores/index.ts';
	import { untrack } from 'svelte';

	interface Props {
		query?: string;
	}

	let { query = '' }: Props = $props();

	/** A skill with the source that offers it. */
	interface SkillItem {
		entry: SkillEntry;
		source: SkillSource;
	}

	/** Placeholder rows while the sources are asked. */
	const SKILL_ROW_SKELETONS = 5;

	let items = $state.raw<SkillItem[]>([]);
	let isLoading = $state(true);
	let opened = $state.raw<SkillItem | null>(null);
	let isDialogOpen = $state(false);
	// a list asked for again while one loads makes that one stale
	let run = 0;

	const shown = $derived.by(() => {
		const search = query.trim().toLowerCase();

		if (!search) return items;

		return items.filter(
			({ entry }) =>
				entry.name.toLowerCase().includes(search) ||
				entry.description.toLowerCase().includes(search) ||
				entry.origin.toLowerCase().includes(search)
		);
	});

	/** Asks every source for its skills. A source that fails leaves the others' skills. */
	async function load(sources: SkillSource[]) {
		const current = ++run;

		isLoading = true;

		const listings = await Promise.allSettled(sources.map((source) => source.list()));

		if (current !== run) return;

		items = listings.flatMap((listing, index) => {
			if (listing.status === 'rejected') {
				console.error(`Failed to list the skills of ${sources[index].id}:`, listing.reason);

				return [];
			}

			return listing.value.map((entry) => ({ entry, source: sources[index] }));
		});
		isLoading = false;
	}

	// showing the tab is the need for the lists; they are read again when a source comes or
	// goes, or llama-server's file tools arrive
	$effect(() => {
		const sources = skillsStore.sources;

		void skillsStore.canReadLocalSkills;

		untrack(() => void load(sources));
	});

	function open(item: SkillItem) {
		opened = item;
		isDialogOpen = true;
	}
</script>

<!-- llama-server's tools may still be on their way: until they are known, no skills is not an answer -->
{#if (isLoading || toolsStore.loading) && items.length === 0}
	<div class="flex flex-col gap-1">
		{#each { length: SKILL_ROW_SKELETONS } as _, index (index)}
			<div class="flex items-center gap-3 px-2 py-2.5">
				<Skeleton class="size-10 shrink-0 rounded-lg" />

				<div class="flex flex-1 flex-col gap-1.5">
					<Skeleton class="h-4 w-40" />

					<Skeleton class="h-4 w-3/5" />
				</div>
			</div>
		{/each}
	</div>
{:else if items.length === 0}
	<Empty.Root class="border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<SKILL_ICON />
			</Empty.Media>

			<Empty.Title>No skills found</Empty.Title>

			<Empty.Description>
				{#if skillsStore.canReadLocalSkills}
					Skills are folders with a SKILL.md, looked for in {LOCAL_SKILL_FOLDERS.join(' and ')}. The
					skills of MCP servers are listed here too.
				{:else}
					Skills in {LOCAL_SKILL_FOLDERS.join(' and ')} are listed when llama-server runs with its tools
					on, and the skills of MCP servers when MCP is enabled.
				{/if}
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else if shown.length === 0}
	<Empty.Root class="border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<SearchX />
			</Empty.Media>

			<Empty.Title>No skills match</Empty.Title>

			<Empty.Description>Try another search.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else}
	<ul class="flex flex-col divide-y divide-border/40">
		{#each shown as item (`${item.source.id}:${item.entry.id}`)}
			<li class="py-0.5">
				<LibrarySkillRow entry={item.entry} onOpen={() => open(item)} source={item.source} />
			</li>
		{/each}
	</ul>
{/if}

<DialogSkill
	bind:open={isDialogOpen}
	entry={opened?.entry ?? null}
	read={(entry) => opened?.source.read(entry) ?? Promise.resolve('')}
/>

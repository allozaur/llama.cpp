<script lang="ts">
	import { MCP_SKILL_DYNAMIC_RESOURCES } from '../../skills/constants';
	import { mcpStore } from '../../stores/index.svelte';
	import McpSkillReadButton from '../skills/McpSkillReadButton.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import * as Collapsible from '@ggml-org/llama-ui/ui/collapsible';
	import { ChevronDown, ChevronRight } from '@lucide/svelte';
	import { untrack } from 'svelte';

	interface Props {
		/** The app's id of a connected server that publishes skills. */
		serverId: string;
	}

	let { serverId }: Props = $props();

	let isExpanded = $state(false);
	let listing = $derived(mcpStore.skills.listingOf(serverId));
	let skills = $derived(listing?.skills ?? []);

	// the card shows how many skills there are, so showing it is the first need for the listing
	$effect(() => {
		const id = serverId;

		// the listing reports its own failure
		untrack(() => void mcpStore.skills.list(id).catch(() => {}));
	});
</script>

{#if listing?.error}
	<p class="text-caption text-muted-foreground">
		The skills could not be listed: {listing.error}
	</p>
{:else if skills.length > 0}
	<Collapsible.Root bind:open={isExpanded}>
		<Collapsible.Trigger
			class="flex w-full items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
		>
			{#if isExpanded}
				<ChevronDown class="size-icon-sm" />
			{:else}
				<ChevronRight class="size-icon-sm" />
			{/if}

			<span>{skills.length} skills available · Show details</span>
		</Collapsible.Trigger>

		<Collapsible.Content>
			<div class="mt-2 max-h-64 space-y-3 overflow-y-auto">
				{#each skills as skill (skill.uri)}
					<div>
						<div class="flex items-center justify-between gap-2">
							<Badge variant="secondary">{skill.frontmatter.name}</Badge>

							{#if skill.resources === MCP_SKILL_DYNAMIC_RESOURCES}
								<!-- no digests to verify its files against: the app does not load it -->
								<span class="text-caption text-muted-foreground">Cannot be verified</span>
							{:else}
								<McpSkillReadButton {serverId} {skill} />
							{/if}
						</div>

						<p class="mt-1 text-caption text-muted-foreground">{skill.frontmatter.description}</p>
					</div>
				{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{:else if listing?.isLoading}
	<p class="text-caption text-muted-foreground">Listing skills...</p>
{/if}

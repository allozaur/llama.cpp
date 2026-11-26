<script lang="ts">
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import * as Dialog from '@ggml-org/llama-ui/ui/dialog';
	import { Skeleton } from '@ggml-org/llama-ui/ui/skeleton';
	import { MarkdownContent } from '#lib/components/app/index.ts';
	import { SKILL_MANIFEST_NAME } from '#lib/constants/index.ts';
	import type { SkillEntry } from '#lib/extensions/index.ts';
	import { skillInstructions } from '#lib/utils/index.ts';
	import { untrack } from 'svelte';

	interface Props {
		open: boolean;
		/** The skill to show. */
		entry: SkillEntry | null;
		/** Reads the skill's SKILL.md. Called each time the dialog opens. */
		read: (entry: SkillEntry) => Promise<string>;
	}

	let { entry, open = $bindable(false), read }: Props = $props();

	/** Placeholder lines while the SKILL.md is read. */
	const SKELETON_WIDTH_CLASSES = ['w-2/5', 'w-full', 'w-11/12', 'w-4/5'];

	let instructions = $state<string | null>(null);
	let error = $state<string | null>(null);

	// the file is read when the dialog opens: looking at a skill is the need for it
	$effect(() => {
		if (!open || !entry) return;

		const shown = entry;

		untrack(() => {
			instructions = null;
			error = null;

			read(shown).then(
				(text) => {
					if (entry === shown) instructions = skillInstructions(text);
				},
				(reason) => {
					if (entry === shown) error = reason instanceof Error ? reason.message : String(reason);
				}
			);
		});
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-3xl"
	>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 pr-8">
				<span class="truncate">{entry?.name}</span>

				{#if entry}
					<Badge class="shrink-0" variant="secondary">{entry.origin}</Badge>
				{/if}
			</Dialog.Title>

			<Dialog.Description>{entry?.description}</Dialog.Description>
		</Dialog.Header>

		<div aria-label={SKILL_MANIFEST_NAME} class="overflow-y-auto pr-1" role="region">
			{#if error}
				<p class="text-body-sm text-destructive" role="alert">{error}</p>
			{:else if instructions === null}
				<div aria-busy="true" class="flex flex-col gap-3">
					{#each SKELETON_WIDTH_CLASSES as width (width)}
						<Skeleton class="h-4 {width}" />
					{/each}
				</div>
			{:else}
				<MarkdownContent content={instructions} />
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

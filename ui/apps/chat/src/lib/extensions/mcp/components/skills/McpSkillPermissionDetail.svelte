<script lang="ts">
	import McpSkillReadButton from './McpSkillReadButton.svelte';
	import type { Skill } from '@modelcontextprotocol/client/ext/skills';
	import { formatFileSize } from '#lib/utils/index.ts';

	/** What the permission card shows about a skill before the user answers. */
	interface Props {
		/** The user allowed the skill for good before, with other files than it has now. */
		hasChanged: boolean;
		/** The app's id of the server the skill is from. */
		serverId: string;
		skill: Skill;
	}

	let { hasChanged, serverId, skill }: Props = $props();

	let files = $derived(Array.isArray(skill.resources) ? skill.resources : []);
	let totalSize = $derived(files.reduce((size, file) => size + file.size, 0));
</script>

<div class="flex flex-col gap-2 text-caption text-muted-foreground">
	{#if hasChanged}
		<p class="text-foreground">This skill changed since you allowed it.</p>
	{/if}

	<p>Its instructions go to the model, which can act on them with the tools you allow.</p>

	<p class="line-clamp-4">{skill.frontmatter.description}</p>

	<div class="flex items-center justify-between gap-2">
		<span>{files.length} {files.length === 1 ? 'file' : 'files'}, {formatFileSize(totalSize)}</span>

		<McpSkillReadButton {serverId} {skill} />
	</div>
</div>

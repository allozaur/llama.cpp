<script lang="ts">
	/** What the permission card shows about a skill from a folder before the user answers. */
	interface Props {
		description: string;
		/** The user allowed the skill for good before, with another text than it has now. */
		hasChanged: boolean;
		/** Where its SKILL.md is on the machine. */
		path: string;
	}

	let { description, hasChanged, path }: Props = $props();
</script>

<div class="flex flex-col gap-2 text-caption text-muted-foreground">
	{#if hasChanged}
		<p class="text-foreground">This skill changed since you allowed it.</p>
	{/if}

	<p>Its instructions go to the model, which can act on them with the tools you allow.</p>

	{#if description}
		<p class="line-clamp-4">{description}</p>
	{/if}

	<p class="truncate font-mono" title={path}>{path}</p>
</div>

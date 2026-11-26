<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Plus } from '@lucide/svelte';
	import { LibraryPrompts, SearchInput } from '#lib/components/app/index.ts';
	import { APP_NAME } from '#lib/constants/index.ts';

	let query = $state('');
	let creatingPrompt = $state(false);
</script>

<svelte:head>
	<title>Library - {APP_NAME}</title>
</svelte:head>

<div
	class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-(--page-top) pb-16 max-md:pb-safe-24 md:px-8 md:pt-6"
>
	<div class="flex flex-wrap items-start gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-heading tracking-tight">Library</h1>

			<p class="text-body-sm text-muted-foreground">
				The prompts you reuse: send one in a chat, or use it as a chat's system message.
			</p>
		</div>

		<Button class="ml-auto shrink-0 gap-1.5" onclick={() => (creatingPrompt = true)} size="sm">
			<Plus class="size-icon-md" />

			New prompt
		</Button>
	</div>

	<SearchInput bind:value={query} class="w-full sm:w-64" placeholder="Search prompts" size="sm" />

	<LibraryPrompts bind:creating={creatingPrompt} {query} />
</div>

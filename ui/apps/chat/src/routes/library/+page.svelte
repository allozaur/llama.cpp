<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Tabs from '@ggml-org/llama-ui/ui/tabs';
	import { Plus } from '@lucide/svelte';
	import { LibraryAttachments, LibraryPrompts, SearchInput } from '#lib/components/app/index.ts';
	import { APP_NAME, LIBRARY_TABS } from '#lib/constants/index.ts';
	import { LibraryTab } from '#lib/enums/index.ts';

	let tab = $state(LibraryTab.PROMPTS);
	let query = $state('');
	let creatingPrompt = $state(false);

	const searchPlaceholder = $derived(LIBRARY_TABS.find((entry) => entry.value === tab)?.search);
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
				The prompts you reuse and the files of your chats, in one place.
			</p>
		</div>

		{#if tab === LibraryTab.PROMPTS}
			<Button class="ml-auto shrink-0 gap-1.5" onclick={() => (creatingPrompt = true)} size="sm">
				<Plus class="size-icon-md" />

				New prompt
			</Button>
		{/if}
	</div>

	<Tabs.Root class="gap-6" onValueChange={(value) => (tab = value as LibraryTab)} value={tab}>
		<div class="flex flex-wrap items-center gap-2">
			<Tabs.List>
				{#each LIBRARY_TABS as entry (entry.value)}
					<Tabs.Trigger value={entry.value}>{entry.label}</Tabs.Trigger>
				{/each}
			</Tabs.List>

			<SearchInput
				bind:value={query}
				class="ml-auto w-full sm:w-64"
				placeholder={searchPlaceholder}
				size="sm"
			/>
		</div>

		<Tabs.Content value={LibraryTab.PROMPTS}>
			<LibraryPrompts bind:creating={creatingPrompt} {query} />
		</Tabs.Content>

		<!-- a panel stays in the page while its tab is not shown, so what it holds is mounted only
		     while it is: the files are read when the tab opens and dropped when it closes -->
		<Tabs.Content value={LibraryTab.ATTACHMENTS}>
			{#if tab === LibraryTab.ATTACHMENTS}
				<LibraryAttachments {query} />
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

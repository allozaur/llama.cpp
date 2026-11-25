<!--
	Pick a model to download: the catalog's suggestions and a Hugging Face search, built from the
	Discover components and their store. A picked row opens the same details pane Discover shows,
	whose download buttons are the app's one download path. With `audioOnly` it lists the catalog
	models that take audio input, for the voice step.
-->
<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { ArrowLeft, CheckCircle } from '@lucide/svelte';
	import { DialogConfirmDownload } from '#lib/components/app/dialogs/index.ts';
	import {
		ModelsDiscoverDetailsContainer,
		ModelsDiscoverList,
		ModelsDiscoverListItem,
		ModelsDiscoverListSearch
	} from '#lib/components/app/models/discover/index.ts';
	import {
		ICON_CLASS_DEFAULT,
		ONBOARDING_EMBEDDING_PIPELINE_TAGS,
		SETTINGS_KEYS
	} from '#lib/constants/index.ts';
	import { ModelDownloadConfirmAction } from '#lib/enums/index.ts';
	import { HuggingFaceService } from '#lib/services/index.ts';
	import { modelsDiscoverStore, modelsStore, settingsStore, uiStore } from '#lib/stores/index.ts';
	import type { HfModelInfo } from '#lib/types/index.ts';
	import { repoOf } from '#lib/utils/index.ts';
	import { onDestroy, untrack } from 'svelte';

	const SEARCH_DEBOUNCE_MS = 300;

	interface Props {
		/** List only the catalog models that take audio input, with no search. */
		audioOnly?: boolean;
		/** Says what was started, for the conversation to keep as the user's answer. */
		onAnswer?: (answer: string | undefined) => void;
	}

	let { audioOnly = false, onAnswer }: Props = $props();

	let selectedId = $state<string | null>(null);
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// the download a row asked to cancel, kept while its confirm dialog closes
	let pendingCancel = $state('');
	let cancelOpen = $state(false);

	// the suggestions and the search read llama.app and Hugging Face, which wait behind these settings
	let isOnline = $derived(uiStore.isDiscoverEnabled && HuggingFaceService.isEnabled());

	let downloadEntries = $derived(modelsStore.status.getDownloadEntries());

	let models = $derived.by(() => {
		if (!audioOnly) return modelsDiscoverStore.models;

		const minSize = (model: HfModelInfo) =>
			modelsDiscoverStore.cachedSizeRangeFor(model.id)?.min ?? Number.POSITIVE_INFINITY;

		// smallest first: transcribing needs no large model
		return modelsDiscoverStore.catalogModels
			.filter(
				(model) =>
					modelsDiscoverStore.catalogSupportsAudio(model.id) &&
					!ONBOARDING_EMBEDDING_PIPELINE_TAGS.includes(model.pipeline_tag ?? '')
			)
			.sort((a, b) => minSize(a) - minSize(b));
	});

	let readyCount = $derived(
		audioOnly
			? modelsStore.models.filter((model) => modelsStore.props.modelSupportsAudio(model.model))
					.length
			: modelsStore.models.length
	);

	// the same three settings Settings > General turns on with "Enable Discover Models"
	function goOnline() {
		settingsStore.updateMultipleConfig({
			[SETTINGS_KEYS.ENABLE_DISCOVER_MODELS]: true,
			[SETTINGS_KEYS.SHOW_MODELS_MANAGER]: true,
			[SETTINGS_KEYS.USE_HUGGING_FACE_HUB]: true
		});
	}

	function handleSearch(query: string) {
		if (searchTimeout) clearTimeout(searchTimeout);

		searchTimeout = setTimeout(() => void modelsDiscoverStore.search(query), SEARCH_DEBOUNCE_MS);
	}

	/** Record of a downloading repo: the list's own, else a bare one so its row still renders. */
	function recordOf(repo: string): HfModelInfo {
		return (
			modelsDiscoverStore.models.find((model) => model.id === repo) ??
			modelsDiscoverStore.catalogModels.find((model) => model.id === repo) ?? {
				_id: repo,
				downloads: 0,
				id: repo,
				library_name: null,
				likes: 0,
				modelId: repo,
				pipeline_tag: null,
				private: false,
				tags: []
			}
		);
	}

	// a download started from the details pane is the answer; the pane has no callback for it
	$effect(() => {
		const names = downloadEntries.map((entry) => entry.repoWithTag);

		untrack(() => onAnswer?.(names.length > 0 ? `Download ${names.join(', ')}` : undefined));
	});

	// untracked: fetch() flips its loading flag, which must not run this again
	$effect(() => {
		if (!isOnline) return;

		untrack(() => void modelsDiscoverStore.fetch());
	});

	// the store is shared with Discover, which expects the default list when it opens
	onDestroy(() => {
		if (searchTimeout) clearTimeout(searchTimeout);

		void modelsDiscoverStore.search('');
	});
</script>

{#if readyCount > 0}
	<p class="flex items-center gap-2 text-body-sm text-fg-success">
		<CheckCircle class={ICON_CLASS_DEFAULT} />

		{readyCount === 1 ? '1 model is' : `${readyCount} models are`} on the server.
	</p>
{/if}

{#if !isOnline}
	<div class="space-y-3 rounded-lg border border-border/60 p-4">
		<p class="text-body-sm text-muted-foreground">
			Suggestions come from llama.app and Hugging Face, so showing them takes this browser online.
			It turns on Discover Models, which you can turn off again in Settings, under General.
		</p>

		<Button onclick={goOnline} variant="outline">Show suggestions</Button>
	</div>
{:else if selectedId}
	<div>
		<Button onclick={() => (selectedId = null)} size="sm" variant="ghost">
			<ArrowLeft class="size-icon-md" />

			All models
		</Button>

		<!-- the pane pads itself for Discover's two columns; here it sits flush -->
		<div class="-ml-6 -mt-2">
			<ModelsDiscoverDetailsContainer modelId={selectedId} />
		</div>
	</div>
{:else}
	<div class="space-y-3">
		{#if !audioOnly}
			<ModelsDiscoverListSearch bind:value={searchQuery} onSearch={handleSearch} />
		{/if}

		{#if downloadEntries.length > 0}
			<ul class="space-y-0.5">
				{#each downloadEntries as entry (entry.repoWithTag)}
					<ModelsDiscoverListItem
						download={{
							isPaused: entry.isPaused,
							onRequestCancel: (repoWithTag) => {
								pendingCancel = repoWithTag;
								cancelOpen = true;
							},
							progress: entry.progress,
							repoWithTag: entry.repoWithTag
						}}
						model={recordOf(repoOf(entry.repoWithTag))}
						onSelect={(id) => (selectedId = id)}
						showBaseModelAvatar
					/>
				{/each}
			</ul>
		{/if}

		{#if modelsDiscoverStore.error}
			<div class="flex flex-col items-start gap-2">
				<p class="text-body-sm text-destructive">{modelsDiscoverStore.error}</p>

				<Button onclick={() => void modelsDiscoverStore.fetch()} size="sm" variant="outline">
					Retry
				</Button>
			</div>
		{:else if !modelsDiscoverStore.loading && !modelsDiscoverStore.searching && models.length === 0}
			<p class="text-body-sm text-muted-foreground">No models found</p>
		{:else}
			<ModelsDiscoverList
				loading={(modelsDiscoverStore.loading && models.length === 0) ||
					modelsDiscoverStore.searching}
				loadingSkeletonRowsCount={5}
				{models}
				onSelect={(id) => (selectedId = id)}
				showBaseModelAvatar
			/>
		{/if}
	</div>
{/if}

<DialogConfirmDownload
	action={ModelDownloadConfirmAction.CANCEL}
	onClose={() => (cancelOpen = false)}
	onConfirm={() => void modelsStore.status.cancelDownload(pendingCancel)}
	open={cancelOpen}
	repoWithTag={pendingCancel}
/>

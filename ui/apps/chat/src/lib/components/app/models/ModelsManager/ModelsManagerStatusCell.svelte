<script lang="ts">
	import ModelLoadControl from '../ModelLoadControl.svelte';
	import ModelsManagerDownloadControl from './ModelsManagerDownloadControl.svelte';
	import { canLoadOption } from './utils';
	import { LOCAL_BACKEND_ID } from '#lib/constants/index.ts';
	import type { ModelRowDownloadState } from '#lib/enums/index.ts';
	import { ServerModelStatus } from '#lib/enums/index.ts';
	import { modelsStore, serverStore } from '#lib/stores/index.ts';
	import type { ModelOption } from '#lib/types/models.js';

	interface Props {
		class?: string;
		/** Download state, when the row stands for a tracked download. */
		download?: ModelRowDownloadState | null;
		option: ModelOption;
	}

	let { class: className = '', download = null, option }: Props = $props();

	let status = $derived(modelsStore.getModelStatus(option.model));
	let isOperationInProgress = $derived(modelsStore.status.isOperationInProgress(option.model));
	let isLoaded = $derived(modelsStore.isModelRunning(option.model));
	// a llama-compat row loads through its own server: the local one takes load
	// requests in router mode only, whatever backend is active, and a provider
	// row never reports a load state
	let canToggleLoad = $derived(
		canLoadOption(option) &&
			(!option.backendId || option.backendId === LOCAL_BACKEND_ID
				? serverStore.localIsRouter
				: true)
	);
</script>

{#if download}
	<ModelsManagerDownloadControl class="justify-self-center {className}" {option} state={download} />
{:else if canToggleLoad}
	<ModelLoadControl
		canLoad
		class="justify-self-center {className}"
		isFailed={status === ServerModelStatus.FAILED}
		{isLoaded}
		isLoading={status === ServerModelStatus.LOADING || isOperationInProgress}
		isSleeping={status === ServerModelStatus.SLEEPING}
		{option}
	/>
{:else if option.backendId && option.backendId !== LOCAL_BACKEND_ID}
	<ModelLoadControl
		canLoad={false}
		class="justify-self-center {className}"
		isLoaded={false}
		{option}
		showRemoteMark
	/>
{:else}
	<span
		class="justify-self-center text-body-sm text-muted-foreground {className}"
		title="Served by this server"
	>
		-
	</span>
{/if}

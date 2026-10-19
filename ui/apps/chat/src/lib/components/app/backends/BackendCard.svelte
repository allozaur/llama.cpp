<script lang="ts">
	import BackendIcon from './BackendIcon.svelte';
	import { Pencil, Radio, RotateCw, Server, Trash2, WifiOff } from '@lucide/svelte';
	import { DialogConfirmation } from '$lib/components/app/dialogs';
	import Logo from '$lib/components/app/misc/Logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { TunnelStatus } from '$lib/enums';
	import { backendsModelsStore, remoteAccessStore } from '$lib/stores';
	import type { Backend } from '$lib/types';
	import { isRemoteBackend } from '$lib/utils/backend';

	const CARD_ICON_CLASS = 'h-5 w-5';

	interface Props {
		backend: Backend;
		isLocal?: boolean;
		onConnect?: (backend: Backend) => void;
		onDelete?: () => void;
		onDisconnect?: (backend: Backend) => void;
		onEdit?: () => void;
		onToggle?: (enabled: boolean) => void;
	}

	let {
		backend,
		isLocal = false,
		onConnect,
		onDelete,
		onDisconnect,
		onEdit,
		onToggle
	}: Props = $props();

	let showDelete = $state(false);
	let remote = $derived(isRemoteBackend(backend));
	let showCode = $state(false);

	/**
	 * A remote provider has two things that can fail: its tunnel and the server
	 * behind it. The tunnel wins, since a closed tunnel makes the listing
	 * meaningless. A remote provider nobody connected to yet is idle, which is a
	 * choice the user made, not a failure.
	 */
	let tunnel = $derived(remote ? remoteAccessStore.statusOf(backend.id) : TunnelStatus.IDLE);
	let tunnelError = $derived(remote ? remoteAccessStore.errorOf(backend.id) : '');
	let modelsState = $derived(backendsModelsStore.get(backend.id));
	let isConnecting = $derived(remote && tunnel === TunnelStatus.CONNECTING);
	let isIdle = $derived(
		remote &&
			tunnel === TunnelStatus.IDLE &&
			!modelsState.loading &&
			!modelsState.loaded &&
			!modelsState.error
	);
	let isChecking = $derived(
		backend.enabled &&
			!isConnecting &&
			!isIdle &&
			!modelsState.loaded &&
			!modelsState.error &&
			!tunnelError
	);
	let isOnline = $derived(
		backend.enabled &&
			modelsState.loaded &&
			!modelsState.error &&
			(!remote || tunnel === TunnelStatus.CONNECTED)
	);
	let isOffline = $derived(
		backend.enabled && (tunnel === TunnelStatus.ERROR || (!isIdle && !!modelsState.error))
	);
	let hasStatus = $derived(isChecking || isConnecting || isOnline || isOffline || isIdle);
	let modelCount = $derived(modelsState.models.length);
	let displayUrl = $derived(backend.baseUrl || 'This server');
	let metaText = $derived(isLocal ? 'Built-in' : remote ? 'Peer-to-peer' : 'llama.cpp server');
	/** What the failure is about: the tunnel, or the server behind it. */
	let errorText = $derived(tunnelError || modelsState.error || '');

	$effect(() => {
		// kick off the probe for providers the prefetch has not covered yet; a remote
		// provider is left alone until its tunnel is open, which is a user action
		if (isChecking && !remote && !modelsState.loading) {
			void backendsModelsStore.ensureLoaded(backend.id);
		}
	});

	function handleRetry() {
		if (remote) {
			onConnect?.(backend);

			return;
		}

		backendsModelsStore.clear(backend.id);
		void backendsModelsStore.ensureLoaded(backend.id);
	}
</script>

<Card.Root class="!gap-3 bg-muted/30 p-4">
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2">
			<BackendIcon {backend} class={CARD_ICON_CLASS}>
				{#snippet fallback()}
					{#if isLocal}
						<Logo class={CARD_ICON_CLASS} style="--size: 1.25rem" />
					{:else if remote}
						<Radio class={CARD_ICON_CLASS} />
					{:else}
						<Server class={CARD_ICON_CLASS} />
					{/if}
				{/snippet}
			</BackendIcon>

			<div class="min-w-0">
				<p class="truncate leading-5 font-medium">{backend.name}</p>

				{#if remote}
					<button
						class="truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:underline"
						onclick={() => (showCode = !showCode)}
						title={showCode ? 'Hide the access code' : 'Show the access code'}
					>
						{showCode ? (backend.code ?? '') : '•'.repeat(backend.code?.length ?? 40)}
					</button>
				{:else}
					<p class="truncate text-xs text-muted-foreground">{displayUrl}</p>
				{/if}
			</div>
		</div>

		<Switch
			aria-label={backend.enabled ? 'Disable backend' : 'Enable backend'}
			checked={backend.enabled}
			onCheckedChange={(value) => onToggle?.(value)}
		/>
	</div>

	{#if isOffline && errorText}
		<Tooltip.Root>
			<Tooltip.Trigger>
				<p class="max-w-full truncate text-left text-xs text-destructive">{errorText}</p>
			</Tooltip.Trigger>

			<Tooltip.Content>
				<p class="max-w-80 break-words">{errorText}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{/if}

	<div class="mt-auto flex items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			{#if isConnecting}
				<span class="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"></span>

				<span class="shrink-0">Connecting</span>
			{:else if isChecking}
				<span class="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"></span>

				<span class="shrink-0">Checking</span>
			{:else if isOnline}
				<span class="size-1.5 shrink-0 rounded-full bg-emerald-500"></span>

				<span class="shrink-0">{modelCount === 1 ? '1 model' : `${modelCount} models`}</span>
			{:else if isOffline}
				<span class="size-1.5 shrink-0 rounded-full bg-destructive"></span>

				<span class="shrink-0">{remote ? 'Disconnected' : 'Unreachable'}</span>

				<button
					aria-label={remote ? 'Reconnect' : 'Retry connection'}
					class="shrink-0 rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
					onclick={handleRetry}
				>
					<RotateCw class="h-3 w-3" />
				</button>
			{:else if isIdle}
				<span class="size-1.5 shrink-0 rounded-full bg-muted-foreground/40"></span>

				<span class="shrink-0">Not connected</span>
			{/if}

			{#if hasStatus}
				<span class="shrink-0 opacity-50">·</span>
			{/if}

			<span class="truncate">{metaText}</span>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			{#if isIdle}
				<Button class="h-7 px-2" onclick={() => onConnect?.(backend)} size="sm" variant="secondary">
					Connect
				</Button>
			{/if}

			{#if remote && tunnel === TunnelStatus.CONNECTED}
				<Button
					aria-label="Disconnect this provider"
					class="relative h-7 w-7 after:absolute after:-inset-0.5 after:content-['']"
					onclick={() => onDisconnect?.(backend)}
					size="icon"
					variant="ghost"
				>
					<WifiOff />
				</Button>
			{/if}

			{#if !isLocal}
				<Button
					aria-label="Edit backend"
					class="relative h-7 w-7 after:absolute after:-inset-0.5 after:content-['']"
					onclick={() => onEdit?.()}
					size="icon"
					variant="ghost"
				>
					<Pencil />
				</Button>

				<Button
					aria-label="Delete backend"
					class="hover:text-destructive-foreground relative h-7 w-7 text-destructive after:absolute after:-inset-0.5 after:content-[''] hover:bg-destructive/10"
					onclick={() => (showDelete = true)}
					size="icon"
					variant="ghost"
				>
					<Trash2 />
				</Button>
			{/if}
		</div>
	</div>
</Card.Root>

<DialogConfirmation
	bind:open={showDelete}
	confirmText="Delete"
	description={remote
		? 'This removes the provider and forgets its access code.'
		: 'This removes the provider and its stored API key.'}
	onCancel={() => (showDelete = false)}
	onConfirm={() => {
		showDelete = false;
		onDelete?.();
	}}
	title={remote ? 'Forget this provider?' : 'Delete provider?'}
	variant="destructive"
/>

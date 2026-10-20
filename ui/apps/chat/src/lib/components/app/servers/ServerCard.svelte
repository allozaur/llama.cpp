<script lang="ts">
	import ServerIcon from './ServerIcon.svelte';
	import { Button } from '@ggml/llama-ui/ui/button';
	import * as Card from '@ggml/llama-ui/ui/card';
	import { Switch } from '@ggml/llama-ui/ui/switch';
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';
	import {
		Copy,
		Pencil,
		QrCode,
		Radio,
		RotateCw,
		Server as ServerGlyph,
		Trash2,
		WifiOff
	} from '@lucide/svelte';
	import { DialogConfirmation } from '$lib/components/app/dialogs';
	import Logo from '$lib/components/app/misc/Logo.svelte';
	import { ServerCardState, TunnelStatus } from '$lib/enums';
	import { remoteAccessStore, serversModelsStore, serverStore } from '$lib/stores';
	import type { Server } from '$lib/types';
	import { copyToClipboard } from '$lib/utils';
	import { qrCodeDataUrl } from '$lib/utils/qr-code';
	import { isRemoteServer, normalizeShareCode } from '$lib/utils/server';
	import { serverCardStatusOf } from '$lib/utils/server-status';

	const CARD_ICON_CLASS = 'h-5 w-5';

	interface Props {
		server: Server;
		isLocal?: boolean;
		onConnect?: (server: Server) => void;
		onDelete?: () => void;
		onDisconnect?: (server: Server) => void;
		onEdit?: () => void;
		/** Pair this machine's own host, by the access code it advertises. */
		onPair?: (code: string) => void;
		onToggle?: (enabled: boolean) => void;
	}

	let {
		isLocal = false,
		onConnect,
		onDelete,
		onDisconnect,
		onEdit,
		onPair,
		onToggle,
		server
	}: Props = $props();

	let showCode = $state(false);
	let showDelete = $state(false);
	/** Whether the host's code is shown as a QR, ready to be scanned off this screen. */
	let showHostQr = $state(false);
	let remote = $derived(isRemoteServer(server));

	let modelsState = $derived(serversModelsStore.get(server.id));
	let tunnel = $derived(remote ? remoteAccessStore.statusOf(server.id) : TunnelStatus.IDLE);
	let status = $derived(
		serverCardStatusOf({
			enabled: server.enabled,
			modelCount: modelsState.models.length,
			modelsError: modelsState.error ?? '',
			modelsLoaded: modelsState.loaded,
			modelsLoading: modelsState.loading,
			remote,
			tunnel,
			tunnelError: remote ? remoteAccessStore.errorOf(server.id) : ''
		})
	);

	let isConnecting = $derived(status.state === ServerCardState.CONNECTING);
	let isChecking = $derived(status.state === ServerCardState.CHECKING);
	let isIdle = $derived(status.state === ServerCardState.IDLE);
	let isOnline = $derived(status.state === ServerCardState.ONLINE);
	let isOffline = $derived(
		status.state === ServerCardState.CHANNEL_DOWN || status.state === ServerCardState.UNREACHABLE
	);
	let hasStatus = $derived(status.state !== ServerCardState.NONE);
	/** Access code of the host running on this machine, when it offers one. */
	let hostCode = $derived(
		isLocal ? normalizeShareCode(serverStore.localProps?.connect_code ?? '') : ''
	);
	let hostQr = $derived(hostCode ? qrCodeDataUrl(hostCode) : null);
	let displayUrl = $derived(server.baseUrl || 'This server');
	let metaText = $derived(isLocal ? 'Built-in' : remote ? 'Peer-to-peer' : 'llama.cpp server');

	$effect(() => {
		// kick off the probe for servers the prefetch has not covered yet; a remote
		// server is left alone until its tunnel is open, which is a user action
		if (isChecking && !remote && !modelsState.loading) {
			void serversModelsStore.ensureLoaded(server.id);
		}
	});

	function handleCopy(text: string, message: string) {
		void copyToClipboard(text, message);
	}

	function handleRetry() {
		if (remote) {
			onConnect?.(server);

			return;
		}

		serversModelsStore.clear(server.id);
		void serversModelsStore.ensureLoaded(server.id);
	}
</script>

<Card.Root class="!gap-3 bg-muted/30 p-4">
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2">
			<ServerIcon class={CARD_ICON_CLASS} {server}>
				{#snippet fallback()}
					{#if isLocal}
						<Logo class={CARD_ICON_CLASS} style="--size: 1.25rem" />
					{:else if remote}
						<Radio class={CARD_ICON_CLASS} />
					{:else}
						<ServerGlyph class={CARD_ICON_CLASS} />
					{/if}
				{/snippet}
			</ServerIcon>

			<div class="min-w-0">
				<p class="truncate leading-5 font-medium">{server.name}</p>

				{#if remote}
					<div class="flex min-w-0 items-center gap-1">
						<button
							class="truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:underline"
							onclick={() => (showCode = !showCode)}
							title={showCode ? 'Hide the access code' : 'Show the access code'}
						>
							{showCode ? (server.code ?? '') : '•'.repeat(server.code?.length ?? 40)}
						</button>

						<button
							aria-label="Copy the access code"
							class="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
							onclick={() => handleCopy(server.code ?? '', 'Access code copied')}
						>
							<Copy class="h-3 w-3" />
						</button>
					</div>
				{:else}
					<p class="truncate text-xs text-muted-foreground">{displayUrl}</p>
				{/if}
			</div>
		</div>

		{#if remote}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Switch
							{...props}
							aria-label={server.enabled ? 'Disable server' : 'Enable server'}
							checked={server.enabled}
							onCheckedChange={(value) => onToggle?.(value)}
						/>
					{/snippet}
				</Tooltip.Trigger>

				<Tooltip.Content>
					<p class="max-w-80 break-words">Disabling also closes this server's tunnel.</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{:else}
			<Switch
				aria-label={server.enabled ? 'Disable server' : 'Enable server'}
				checked={server.enabled}
				onCheckedChange={(value) => onToggle?.(value)}
			/>
		{/if}
	</div>

	{#if hostCode}
		<div class="space-y-2 rounded-lg border border-border/60 p-2.5">
			<div class="flex items-center justify-between gap-2">
				<div class="min-w-0">
					<p class="text-xs font-medium">Remote access: on</p>

					<p class="text-xs text-muted-foreground">
						This server can be reached through its access code.
					</p>
				</div>

				<div class="flex shrink-0 items-center gap-1">
					<Button
						aria-label={showHostQr
							? 'Hide the access code QR code'
							: 'Show the access code as a QR code'}
						class="relative h-6 w-6 after:absolute after:-inset-0.5 after:content-['']"
						onclick={() => (showHostQr = !showHostQr)}
						size="icon"
						variant="ghost"
					>
						<QrCode class="h-3 w-3" />
					</Button>

					<Button
						aria-label="Copy the access code"
						class="relative h-6 w-6 after:absolute after:-inset-0.5 after:content-['']"
						onclick={() => handleCopy(hostCode, 'Access code copied')}
						size="icon"
						variant="ghost"
					>
						<Copy class="h-3 w-3" />
					</Button>

					<Button class="h-6 px-2" onclick={() => onPair?.(hostCode)} size="sm" variant="secondary">
						Pair
					</Button>
				</div>
			</div>

			{#if showHostQr && hostQr}
				<div class="flex flex-col items-center gap-1.5">
					<img alt="Access code QR code" class="size-40" src={hostQr} />

					<p class="text-xs text-muted-foreground">Scan it with the other device.</p>
				</div>
			{/if}
		</div>
	{/if}

	{#if status.detail}
		<p
			class="line-clamp-2 text-xs break-words {isOffline
				? 'text-destructive'
				: 'text-muted-foreground'}"
		>
			{status.detail}
		</p>
	{/if}

	<div class="mt-auto flex items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			{#if isConnecting || isChecking}
				<span class="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"></span>
			{:else if isOnline}
				<span class="size-1.5 shrink-0 rounded-full bg-emerald-500"></span>
			{:else if isOffline}
				<span class="size-1.5 shrink-0 rounded-full bg-destructive"></span>
			{:else if isIdle}
				<span class="size-1.5 shrink-0 rounded-full bg-muted-foreground/40"></span>
			{/if}

			{#if hasStatus}
				<span class="shrink-0">{status.label}</span>

				{#if isOffline}
					<button
						aria-label={remote ? 'Reconnect to the host' : 'Retry connection'}
						class="shrink-0 rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
						onclick={handleRetry}
					>
						<RotateCw class="h-3 w-3" />
					</button>
				{/if}

				<span class="shrink-0 opacity-50">·</span>
			{/if}

			<span class="truncate">{metaText}</span>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			{#if isIdle}
				<Button class="h-7 px-2" onclick={() => onConnect?.(server)} size="sm" variant="secondary">
					Connect
				</Button>
			{/if}

			{#if remote && tunnel !== TunnelStatus.IDLE}
				<Button
					aria-label="Disconnect this server"
					class="relative h-7 w-7 after:absolute after:-inset-0.5 after:content-['']"
					onclick={() => onDisconnect?.(server)}
					size="icon"
					title={tunnel === TunnelStatus.CONNECTED
						? 'Close the tunnel to this server'
						: 'Stop trying to reach this server'}
					variant="ghost"
				>
					<WifiOff />
				</Button>
			{/if}

			{#if !isLocal}
				<Button
					aria-label="Edit server"
					class="relative h-7 w-7 after:absolute after:-inset-0.5 after:content-['']"
					onclick={() => onEdit?.()}
					size="icon"
					variant="ghost"
				>
					<Pencil />
				</Button>

				<Button
					aria-label={remote ? 'Forget server' : 'Delete server'}
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
	confirmText={remote ? 'Forget' : 'Delete'}
	description={remote
		? 'This removes the server and forgets its access code.'
		: 'This removes the server and its stored API key.'}
	onCancel={() => (showDelete = false)}
	onConfirm={() => {
		showDelete = false;
		onDelete?.();
	}}
	title={remote ? 'Forget this server?' : 'Delete server?'}
	variant="destructive"
/>

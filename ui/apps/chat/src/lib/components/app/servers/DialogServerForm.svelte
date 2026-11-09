<script lang="ts">
	import DialogServerCodeScanner from './DialogServerCodeScanner.svelte';
	import ServerForm from './ServerForm.svelte';
	import { CheckCircle2, Loader2, PlugZap, QrCode, XCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerFooter,
		DrawerHeader,
		DrawerTitle
	} from '$lib/components/ui/drawer';
	import { CODE_LENGTHS, SERVER_ID_PREFIX } from '$lib/constants';
	import { ServerKind } from '$lib/enums';
	import { ServersService } from '$lib/services';
	import type { ServerTestResult } from '$lib/services/servers.service';
	import { deviceStore, remoteAccessStore, serversStore } from '$lib/stores';
	import type { Server } from '$lib/types';
	import { uuid } from '$lib/utils';
	import { supportsQrScan } from '$lib/utils/qr-scan';
	import {
		createUrlServer,
		hostOf,
		isHttpUrl,
		isRemoteServer,
		normalizeShareCode
	} from '$lib/utils/server';

	interface Props {
		server?: Server | null;
		/** Kind a new server starts on; the form still switches between them. */
		defaultKind?: ServerKind;
		/** Access code a new pairing starts from, e.g. the one this machine advertises. */
		defaultCode?: string;
		onOpenChange?: (open: boolean) => void;
		/** A remote server was paired; its tunnel is open. */
		onPaired?: (server: Server) => void;
		onSaved?: (server: Server) => void;
		open?: boolean;
	}

	let {
		defaultCode,
		defaultKind,
		onOpenChange,
		onPaired,
		onSaved,
		open = $bindable(false),
		server = null
	}: Props = $props();

	let draft = $state<Server>(createServer());
	let testResult = $state<ServerTestResult | null>(null);
	let testing = $state(false);
	let apiKeyRequired = $state(false);
	let pairing = $state(false);
	let pairError = $state('');
	let showScanner = $state(false);
	/** Verdict of the last /props probe: false when the endpoint is not a llama.cpp server. */
	let llamaCpp = $state<boolean | null>(null);

	let isEdit = $derived(server !== null);
	let isRemote = $derived(isRemoteServer(draft));
	// pairing is experimental and off by default; a remote server already saved
	// still opens as one, so it can be edited or forgotten
	let canPair = $derived(remoteAccessStore.isEnabled || (isEdit && isRemoteServer(server)));
	let canScan = $derived(supportsQrScan());
	let code = $derived(normalizeShareCode(draft.code ?? ''));
	let title = $derived(
		isEdit ? 'Edit Server' : isRemote ? 'Pair a remote server' : 'Add New Server'
	);
	let description = $derived(
		isRemote
			? 'Point at a llama-server started with --connect, by its access code.'
			: 'Point at another llama-server.'
	);
	let urlError = $derived.by(() => {
		const url = draft.baseUrl.trim();

		if (isRemote) return null;

		if (!url) return 'Base URL is required';

		return isHttpUrl(url) ? null : 'Invalid URL format';
	});
	let codeError = $derived(
		isRemote && !code ? `The code is ${CODE_LENGTHS.SHARE} characters, exactly as printed` : null
	);
	// what the endpoint turned out to be: a server of another kind is not one this
	// UI can drive, so it is not worth saving
	let endpointError = $derived(
		!isRemote && !isEdit && llamaCpp === false
			? 'Not a llama.cpp server: /props answered something else'
			: null
	);
	// a remote server is its code and names itself "Remote server" when left
	// blank, so only the URL server is held to a name it has to be able to
	// reach; either way a key the endpoint asked for is mandatory
	let canSave = $derived(
		(isRemote ? Boolean(code) : Boolean(draft.name.trim()) && !urlError) &&
			!endpointError &&
			(!apiKeyRequired || Boolean(draft.apiKey?.trim()))
	);

	// reset the draft each time the dialog opens
	$effect(() => {
		if (!open) return;

		draft = server
			? { ...server }
			: {
					...createServer(remoteAccessStore.isEnabled ? defaultKind : ServerKind.URL),
					code: normalizeShareCode(defaultCode ?? '')
				};
		testResult = null;
		testing = false;
		pairing = false;
		pairError = '';
		apiKeyRequired = false;
		llamaCpp = null;
	});

	// Once the URL settles, ask the endpoint whether it guards /props with a key, the
	// way the MCP dialog previews a server. A refused probe is retried once a key is
	// typed, which is the answer the API-key field waits for. The same answer says
	// whether the endpoint is a llama.cpp server at all. A remote server has nothing
	// to probe: its code is answered by pairing.
	$effect(() => {
		const url = draft.baseUrl.trim();
		const apiKey = draft.apiKey?.trim();

		if (!open || isEdit || isRemote || urlError || !url) {
			apiKeyRequired = false;
			llamaCpp = null;

			return;
		}

		const timer = setTimeout(async () => {
			const probe = await ServersService.probe({ ...draft, apiKey, baseUrl: url });

			apiKeyRequired = probe.authRequired;
			llamaCpp = probe.llamaCpp;
		}, 600);

		return () => clearTimeout(timer);
	});

	function createServer(kind: ServerKind = ServerKind.URL): Server {
		return {
			baseUrl: '',
			code: '',
			enabled: true,
			id: uuid() || `${SERVER_ID_PREFIX}-${Date.now()}`,
			kind,
			name: ''
		};
	}

	function handleChange(patch: Partial<Server>) {
		draft = { ...draft, ...patch };
		testResult = null;
		pairError = '';
	}

	function handleOpenChange(value: boolean) {
		open = value;
		onOpenChange?.(value);
	}

	async function handleTest() {
		if (isRemote) {
			await handlePair();

			return;
		}

		if (urlError) return;

		testing = true;
		testResult = null;

		try {
			testResult = await ServersService.test(draft);
		} finally {
			testing = false;
		}
	}

	/**
	 * Save the server and open its tunnel.
	 *
	 * The tunnel lives on the server, so pairing has to register it first: the
	 * card keeps the state either way, which is why a failed handshake leaves the
	 * server in place with Reconnect on it rather than rolling the pair back.
	 */
	async function handlePair() {
		if (!code) return;

		const id = isEdit && server ? server.id : draft.id;
		const name = draft.name.trim() || 'Remote server';

		if (isEdit) {
			serversStore.updateServer(id, { ...draft, code, kind: ServerKind.REMOTE, name });
		} else {
			serversStore.addRemoteServer(code, name, id, draft.apiKey?.trim() || undefined);
		}

		draft = { ...draft, code, kind: ServerKind.REMOTE, name };

		pairing = true;
		pairError = '';

		try {
			await remoteAccessStore.connect(id);
			handleOpenChange(false);
			onPaired?.(serversStore.list.find((candidate) => candidate.id === id) ?? draft);
		} catch (error: unknown) {
			pairError = error instanceof Error ? error.message : String(error);
		} finally {
			pairing = false;
		}
	}

	function handleSave() {
		if (!canSave) return;

		if (isRemote) {
			void handlePair();

			return;
		}

		// built through the constructor so a pasted URL and a blank name land in
		// the list the same way a stored one is read back
		const next = createUrlServer(draft.baseUrl, draft.id, draft.name, draft.apiKey, draft.headers);

		if (isEdit && server) {
			serversStore.updateServer(server.id, next);
		} else {
			serversStore.addServer(next);
		}

		onSaved?.(next);
		handleOpenChange(false);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		handleSave();
	}
</script>

{#snippet fields()}
	<div class="space-y-4 py-4">
		<ServerForm
			{apiKeyRequired}
			{canPair}
			{canScan}
			{codeError}
			{endpointError}
			id="server"
			onChange={handleChange}
			onScan={() => (showScanner = true)}
			server={draft}
			{urlError}
		/>
	</div>

	<DialogServerCodeScanner
		bind:open={showScanner}
		onCode={(scanned) => handleChange({ code: scanned })}
	/>

	<!-- the last thing before the actions: what the endpoint said when asked -->
	<div
		aria-live="polite"
		class="mb-3 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-3"
	>
		{#if pairing}
			<Loader2 class="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />

			<div class="min-w-0">
				<p class="text-sm font-medium">Pairing</p>

				<p class="text-xs text-muted-foreground">Opening the tunnel to that server.</p>
			</div>
		{:else if testing}
			<Loader2 class="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />

			<div class="min-w-0">
				<p class="text-sm font-medium">Testing connection</p>

				<p class="text-xs text-muted-foreground">
					Asking {hostOf(draft.baseUrl)} for the models it serves.
				</p>
			</div>
		{:else if pairError}
			<XCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

			<div class="min-w-0">
				<p class="text-sm font-medium text-destructive">Pairing failed</p>

				<p class="text-xs break-words text-muted-foreground">{pairError}</p>

				<p class="mt-1 text-xs text-muted-foreground">The server is saved; retry from its card.</p>
			</div>
		{:else if testResult?.ok}
			<CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

			<div class="min-w-0">
				<p class="text-sm font-medium">Connected</p>

				<p class="text-xs text-muted-foreground">
					{testResult.modelCount ?? 0}
					model{(testResult.modelCount ?? 0) === 1 ? '' : 's'} available.
				</p>
			</div>
		{:else if testResult}
			<XCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

			<div class="min-w-0">
				<p class="text-sm font-medium text-destructive">Connection failed</p>

				<p class="text-xs break-words text-muted-foreground">
					{testResult.error ?? 'The endpoint did not answer.'}{testResult.status
						? ` (HTTP ${testResult.status})`
						: ''}
				</p>
			</div>
		{:else}
			{#if isRemote}
				<QrCode class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			{:else}
				<PlugZap class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			{/if}

			<div class="min-w-0">
				<p class="text-sm font-medium">
					{isRemote ? 'Not paired yet' : 'Connection not tested'}
				</p>

				<p class="text-xs text-muted-foreground">
					{isRemote
						? 'Pairing saves the server and connects to it.'
						: 'Test it to list the models this server serves.'}
				</p>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet actions()}
	<Button onclick={() => handleOpenChange(false)} size="sm" variant="secondary">Cancel</Button>

	{#if isRemote}
		<Button disabled={!canSave || pairing} onclick={handlePair} size="sm" type="button">
			{isEdit ? 'Save and reconnect' : 'Pair'}
		</Button>
	{:else}
		<Button
			disabled={testing || Boolean(urlError)}
			onclick={handleTest}
			size="sm"
			type="button"
			variant="outline"
		>
			Test connection
		</Button>

		<Button disabled={!canSave} size="sm" type="submit">
			{isEdit ? 'Save' : 'Add'}
		</Button>
	{/if}
{/snippet}

{#if deviceStore.isMobile}
	<!--
		A form this tall is a bottom sheet on a phone: it keeps the field the
		keyboard covers out of the way, and the actions within thumb reach.
	-->
	<Drawer bind:open onOpenChange={handleOpenChange}>
		<DrawerContent class="overflow-hidden">
			<DrawerHeader>
				<DrawerTitle class="select-none">{title}</DrawerTitle>

				<DrawerDescription>{description}</DrawerDescription>
			</DrawerHeader>

			<form class="contents" onsubmit={handleSubmit}>
				<div class="min-h-0 flex-1 overflow-y-auto px-4">
					{@render fields()}
				</div>

				<DrawerFooter>{@render actions()}</DrawerFooter>
			</form>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog.Root onOpenChange={handleOpenChange} {open}>
		<Dialog.Content class="max-w-2xl!">
			<Dialog.Header>
				<Dialog.Title class="select-none">{title}</Dialog.Title>

				<Dialog.Description>{description}</Dialog.Description>
			</Dialog.Header>

			<form class="contents" onsubmit={handleSubmit}>
				{@render fields()}

				<Dialog.Footer>{@render actions()}</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

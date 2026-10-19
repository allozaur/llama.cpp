<script lang="ts">
	import BackendForm from './BackendForm.svelte';
	import DialogBackendCodeScanner from './DialogBackendCodeScanner.svelte';
	import { Button } from '@ggml/llama-ui/ui/button';
	import * as Dialog from '@ggml/llama-ui/ui/dialog';
	import { CheckCircle2, Loader2, PlugZap, QrCode, XCircle } from '@lucide/svelte';
	import { BACKEND_ID_PREFIX, CODE_LENGTHS } from '$lib/constants';
	import { BackendKind } from '$lib/enums';
	import { BackendsService } from '$lib/services';
	import type { BackendTestResult } from '$lib/services/backends.service';
	import { backendsStore, remoteAccessStore } from '$lib/stores';
	import type { Backend } from '$lib/types';
	import { uuid } from '$lib/utils';
	import {
		createUrlBackend,
		hostOf,
		isHttpUrl,
		isRemoteBackend,
		normalizeShareCode
	} from '$lib/utils/backend';
	import { supportsQrScan } from '$lib/utils/qr-scan';

	interface Props {
		backend?: Backend | null;
		/** Kind a new provider starts on; the form still switches between them. */
		defaultKind?: BackendKind;
		onOpenChange?: (open: boolean) => void;
		/** A remote provider was paired; its tunnel is open. */
		onPaired?: (backend: Backend) => void;
		onSaved?: (backend: Backend) => void;
		open?: boolean;
	}

	let {
		backend = null,
		defaultKind,
		onOpenChange,
		onPaired,
		onSaved,
		open = $bindable(false)
	}: Props = $props();

	let draft = $state<Backend>(createBackend());
	let testResult = $state<BackendTestResult | null>(null);
	let testing = $state(false);
	let apiKeyRequired = $state(false);
	let pairing = $state(false);
	let pairError = $state('');
	let showScanner = $state(false);

	let isEdit = $derived(backend !== null);
	let isRemote = $derived(isRemoteBackend(draft));
	let canScan = $derived(supportsQrScan());
	let code = $derived(normalizeShareCode(draft.code ?? ''));
	let urlError = $derived.by(() => {
		const url = draft.baseUrl.trim();

		if (isRemote) return null;

		if (!url) return 'Base URL is required';

		return isHttpUrl(url) ? null : 'Invalid URL format';
	});
	let codeError = $derived(
		isRemote && !code ? `The code is ${CODE_LENGTHS.SHARE} characters, exactly as printed` : null
	);
	// a remote provider is its code and names itself "Remote server" when left
	// blank, so only the URL provider is held to a name it has to be able to
	// reach; either way a key the endpoint asked for is mandatory
	let canSave = $derived(
		(isRemote ? Boolean(code) : Boolean(draft.name.trim()) && !urlError) &&
			(!apiKeyRequired || Boolean(draft.apiKey?.trim()))
	);

	// reset the draft each time the dialog opens
	$effect(() => {
		if (!open) return;

		draft = backend ? { ...backend } : createBackend(defaultKind);
		testResult = null;
		testing = false;
		pairing = false;
		pairError = '';
		apiKeyRequired = false;
	});

	// Once the URL settles, ask the endpoint whether it guards /props with a key, the
	// way the MCP dialog previews a server. A refused probe is retried once a key is
	// typed, which is the answer the API-key field waits for. A remote provider has
	// nothing to probe: its code is answered by pairing.
	$effect(() => {
		const url = draft.baseUrl.trim();
		const apiKey = draft.apiKey?.trim();

		if (!open || isEdit || isRemote || urlError || !url) {
			apiKeyRequired = false;

			return;
		}

		const timer = setTimeout(async () => {
			const probe = await BackendsService.probe({ ...draft, apiKey, baseUrl: url });

			apiKeyRequired = probe.authRequired;
		}, 600);

		return () => clearTimeout(timer);
	});

	function createBackend(kind: BackendKind = BackendKind.URL): Backend {
		return {
			baseUrl: '',
			code: '',
			enabled: true,
			id: uuid() || `${BACKEND_ID_PREFIX}-${Date.now()}`,
			kind,
			name: ''
		};
	}

	function handleChange(patch: Partial<Backend>) {
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
			testResult = await BackendsService.test(draft);
		} finally {
			testing = false;
		}
	}

	/**
	 * Save the provider and open its tunnel.
	 *
	 * The tunnel lives on the provider, so pairing has to register it first: the
	 * card keeps the state either way, which is why a failed handshake leaves the
	 * provider in place with Reconnect on it rather than rolling the pair back.
	 */
	async function handlePair() {
		if (!code) return;

		const id = isEdit && backend ? backend.id : draft.id;
		const name = draft.name.trim() || 'Remote server';

		if (isEdit) {
			backendsStore.updateBackend(id, { ...draft, code, kind: BackendKind.REMOTE, name });
		} else {
			backendsStore.addRemoteBackend(code, name, id);
		}

		draft = { ...draft, code, kind: BackendKind.REMOTE, name };

		pairing = true;
		pairError = '';

		try {
			await remoteAccessStore.connect(id);
			handleOpenChange(false);
			onPaired?.(backendsStore.list.find((candidate) => candidate.id === id) ?? draft);
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
		const next = createUrlBackend(draft.baseUrl, draft.id, draft.name, draft.apiKey, draft.headers);

		if (isEdit && backend) {
			backendsStore.updateBackend(backend.id, next);
		} else {
			backendsStore.addBackend(next);
		}

		onSaved?.(next);
		handleOpenChange(false);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		handleSave();
	}
</script>

<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<Dialog.Content class="max-w-2xl!">
		<Dialog.Header>
			<Dialog.Title class="select-none">
				{isEdit ? 'Edit Provider' : isRemote ? 'Pair a remote server' : 'Add New Provider'}
			</Dialog.Title>

			<Dialog.Description>
				{isRemote
					? 'Point at a llama-server started with --connect, by its access code.'
					: 'Point at another llama-server.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="contents" onsubmit={handleSubmit}>
			<div class="space-y-4 py-4">
				<BackendForm
					{apiKeyRequired}
					backend={draft}
					{canScan}
					{codeError}
					id="backend"
					onChange={handleChange}
					onScan={() => (showScanner = true)}
					{urlError}
				/>
			</div>

			<DialogBackendCodeScanner
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

						<p class="mt-1 text-xs text-muted-foreground">
							The provider is saved; retry from its card.
						</p>
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
								? 'Pairing saves the provider and connects to it.'
								: 'Test it to list the models this provider serves.'}
						</p>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button onclick={() => handleOpenChange(false)} size="sm" variant="secondary">
					Cancel
				</Button>

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
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

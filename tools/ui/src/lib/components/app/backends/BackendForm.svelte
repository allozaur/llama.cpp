<script lang="ts">
	import { QrCode } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { CODE_LENGTHS } from '$lib/constants';
	import { BackendKind } from '$lib/enums';
	import type { Backend } from '$lib/types';

	interface Props {
		backend: Backend;
		/** The endpoint refused the probe for want of a key. */
		apiKeyRequired?: boolean;
		/** Whether the browser can decode a camera frame; hides the scan affordance. */
		canScan?: boolean;
		/** Invalid access code, when the draft carries one. */
		codeError?: string | null;
		id: string;
		onChange: (patch: Partial<Backend>) => void;
		onScan?: () => void;
		urlError?: string | null;
	}

	let {
		apiKeyRequired = false,
		backend,
		canScan = false,
		codeError = null,
		id,
		onChange,
		onScan,
		urlError = null
	}: Props = $props();

	let isRemote = $derived(backend.kind === BackendKind.REMOTE);
</script>

<div class="grid gap-5">
	<div class="grid grid-cols-2 gap-2">
		{#each [BackendKind.URL, BackendKind.REMOTE] as kind (kind)}
			<Button
				aria-pressed={backend.kind === kind}
				class="justify-center"
				onclick={() => onChange({ kind })}
				size="sm"
				variant={backend.kind === kind ? 'secondary' : 'ghost'}
			>
				{kind === BackendKind.REMOTE ? 'Remote server' : 'Server URL'}
			</Button>
		{/each}
	</div>

	{#if isRemote}
		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="backend-code-{id}">
				Access code <span class="text-destructive">*</span>
			</label>

			<div class="flex items-start gap-2">
				<Input
					autocomplete="off"
					class={['font-mono', codeError ? 'border-destructive' : ''].join(' ')}
					id="backend-code-{id}"
					oninput={(e) => onChange({ code: e.currentTarget.value })}
					placeholder="Paste the {CODE_LENGTHS.SHARE}-character code"
					spellcheck="false"
					type="text"
					value={backend.code ?? ''}
				/>

				{#if canScan}
					<Button onclick={() => onScan?.()} size="sm" type="button" variant="outline">
						<QrCode />

						Scan
					</Button>
				{/if}
			</div>

			{#if codeError}
				<p class="mt-1.5 text-xs text-destructive">{codeError}</p>
			{:else}
				<p class="mt-1.5 text-xs text-muted-foreground">
					Printed by <span class="font-mono">llama-server --connect</span>. It is a credential:
					anyone who has it can use that server.
				</p>
			{/if}
		</div>
	{:else}
		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="backend-url-{id}">
				Base URL <span class="text-destructive">*</span>
			</label>

			<Input
				class={urlError ? 'border-destructive' : ''}
				id="backend-url-{id}"
				oninput={(e) => onChange({ baseUrl: e.currentTarget.value })}
				placeholder="https://api.example.com"
				type="url"
				value={backend.baseUrl}
			/>

			{#if urlError}
				<p class="mt-1.5 text-xs text-destructive">{urlError}</p>
			{/if}
		</div>
	{/if}

	<div class="grid gap-5 sm:grid-cols-2">
		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="backend-name-{id}">
				Display name
			</label>

			<Input
				id="backend-name-{id}"
				oninput={(e) => onChange({ name: e.currentTarget.value })}
				placeholder="Name shown in the model selector"
				type="text"
				value={backend.name}
			/>
		</div>

		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="backend-key-{id}">
				API key{#if apiKeyRequired}<span class="text-destructive"> *</span>{/if}
			</label>

			<Input
				autocomplete="off"
				id="backend-key-{id}"
				oninput={(e) => onChange({ apiKey: e.currentTarget.value || undefined })}
				placeholder="Optional"
				type="password"
				value={backend.apiKey ?? ''}
			/>

			<p class="mt-1.5 text-xs text-muted-foreground">
				{#if apiKeyRequired}
					Required by this endpoint.
				{:else}
					Sent as a Bearer token.
				{/if}
			</p>
		</div>
	</div>
</div>

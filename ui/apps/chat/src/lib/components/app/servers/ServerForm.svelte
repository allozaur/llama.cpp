<script lang="ts">
	import { Button } from '@ggml/llama-ui/ui/button';
	import { Input } from '@ggml/llama-ui/ui/input';
	import * as Tabs from '@ggml/llama-ui/ui/tabs';
	import { QrCode } from '@lucide/svelte';
	import { CODE_LENGTHS } from '$lib/constants';
	import { ServerKind } from '$lib/enums';
	import type { Server } from '$lib/types';

	interface Props {
		server: Server;
		/** The endpoint refused the probe for want of a key. */
		apiKeyRequired?: boolean;
		/** Whether the browser can decode a camera frame; hides the scan affordance. */
		canScan?: boolean;
		/** Invalid access code, when the draft carries one. */
		codeError?: string | null;
		id: string;
		onChange: (patch: Partial<Server>) => void;
		onScan?: () => void;
		urlError?: string | null;
	}

	let {
		apiKeyRequired = false,
		canScan = false,
		codeError = null,
		id,
		onChange,
		onScan,
		server,
		urlError = null
	}: Props = $props();

	let isRemote = $derived(server.kind === ServerKind.REMOTE);
</script>

<div class="grid gap-5">
	<!--
	  The kind switcher is a tablist: a trough with a pill over the selected kind,
	  and the pill keeps the border and shadow the two hand-rolled buttons drew.
	  Its fill is the panel's own surface rather than the secondary button's
	  translucent muted one - that fill is the trough's own colour, so the selected
	  kind used to disappear into the trough it was meant to sit above.
	-->
	<Tabs.Root
		class="w-full"
		onValueChange={(value) => onChange({ kind: value as ServerKind })}
		value={server.kind}
	>
		<Tabs.List class="bg-muted-foreground/10 w-full gap-1">
			{#each [ServerKind.URL, ServerKind.REMOTE] as kind (kind)}
				<Tabs.Trigger
					class="data-[state=active]:border-muted hover:bg-muted-foreground/10"
					value={kind}
				>
					{kind === ServerKind.REMOTE ? 'Remote server' : 'Server URL'}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>

	{#if isRemote}
		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="server-code-{id}">
				Access code <span class="text-destructive">*</span>
			</label>

			<div class="flex items-start gap-2">
				<Input
					autocomplete="off"
					class={['font-mono', codeError ? 'border-destructive' : ''].join(' ')}
					id="server-code-{id}"
					oninput={(e) => onChange({ code: e.currentTarget.value })}
					placeholder="Paste the {CODE_LENGTHS.SHARE}-character code"
					spellcheck="false"
					type="text"
					value={server.code ?? ''}
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
			<label class="mb-2 block text-xs font-medium select-none" for="server-url-{id}">
				Base URL <span class="text-destructive">*</span>
			</label>

			<Input
				class={urlError ? 'border-destructive' : ''}
				id="server-url-{id}"
				oninput={(e) => onChange({ baseUrl: e.currentTarget.value })}
				placeholder="https://api.example.com"
				type="url"
				value={server.baseUrl}
			/>

			{#if urlError}
				<p class="mt-1.5 text-xs text-destructive">{urlError}</p>
			{/if}
		</div>
	{/if}

	<div class="grid gap-5 sm:grid-cols-2">
		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="server-name-{id}">
				Display name
			</label>

			<Input
				id="server-name-{id}"
				oninput={(e) => onChange({ name: e.currentTarget.value })}
				placeholder="Name shown in the model selector"
				type="text"
				value={server.name}
			/>
		</div>

		<div>
			<label class="mb-2 block text-xs font-medium select-none" for="server-key-{id}">
				API key{#if apiKeyRequired}<span class="text-destructive"> *</span>{/if}
			</label>

			<Input
				autocomplete="off"
				id="server-key-{id}"
				oninput={(e) => onChange({ apiKey: e.currentTarget.value || undefined })}
				placeholder="Optional"
				type="password"
				value={server.apiKey ?? ''}
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

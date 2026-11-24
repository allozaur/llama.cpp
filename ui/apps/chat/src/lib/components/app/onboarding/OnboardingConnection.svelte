<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Input } from '@ggml-org/llama-ui/ui/input';
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import { CheckCircle, RefreshCw } from '@lucide/svelte';
	import { HEADERS, ICON_CLASS_DEFAULT, ROUTES, SETTINGS_KEYS } from '#lib/constants/index.ts';
	import { MimeTypeApplication } from '#lib/enums/index.ts';
	import { serverStore, settingsStore } from '#lib/stores/index.ts';
	import { withBase } from '#lib/utils/base-path.ts';
	import { goto } from '$app/navigation';

	interface Props {
		/** Says what was done, for the conversation to keep as the user's answer. */
		onAnswer?: (answer: string) => void;
	}

	let { onAnswer }: Props = $props();

	let apiKey = $state('');
	let status = $state<'idle' | 'validating' | 'connected'>('idle');
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const key = apiKey.trim();

		if (!key || status === 'validating') return;

		status = 'validating';
		error = '';

		try {
			const response = await fetch(withBase('/props'), {
				headers: {
					[HEADERS.AUTHORIZATION]: `${HEADERS.BEARER}${key}`,
					[HEADERS.CONTENT_TYPE]: MimeTypeApplication.JSON
				}
			});

			if (!response.ok) {
				status = 'idle';
				error =
					response.status === 401 || response.status === 403
						? 'The server did not accept this key.'
						: `The server answered with status ${response.status}.`;

				return;
			}

			// stored only once the server took it
			settingsStore.updateConfig(SETTINGS_KEYS.API_KEY, key);
			status = 'connected';
			onAnswer?.('Connected with my API key');

			// leaves the access-denied page under the dialog, and loads what the key unlocks
			await goto(ROUTES.START, { invalidateAll: true });
			await serverStore.fetch();
		} catch {
			status = 'idle';
			error = 'Cannot reach the server. Check that it is running.';
		}
	}
</script>

{#if status === 'connected'}
	<p class="flex items-center gap-2 text-body-sm text-fg-success">
		<CheckCircle class={ICON_CLASS_DEFAULT} />

		Connected. The key is saved in Settings, under General.
	</p>
{:else}
	<form class="space-y-3" onsubmit={handleSubmit}>
		<div class="space-y-2">
			<Label for="onboarding-api-key">API key</Label>

			<Input
				bind:value={apiKey}
				aria-invalid={error ? true : undefined}
				autocomplete="off"
				disabled={status === 'validating'}
				id="onboarding-api-key"
				placeholder="Enter the server's API key"
				type="password"
			/>

			{#if error}
				<p class="text-body-sm text-destructive" role="alert">{error}</p>
			{/if}
		</div>

		<Button disabled={!apiKey.trim() || status === 'validating'} type="submit">
			{#if status === 'validating'}
				<RefreshCw class="{ICON_CLASS_DEFAULT} animate-spin" />

				Checking...
			{:else}
				Connect
			{/if}
		</Button>
	</form>
{/if}

<script lang="ts">
	import { HUGGING_FACE_TOKEN_ALSO_SENT_TO } from './constants';
	import { huggingFace } from './huggingface.svelte';
	import { HfAccountDialog } from '@ggml-org/llama-huggingface/svelte';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Lock } from '@lucide/svelte';
	import { HuggingFaceService } from '#lib/services/huggingface.service.ts';
	import { onMount } from 'svelte';

	interface Props {
		/** Whether the repo asks for access before a download: the notice shows only then. */
		isGated: boolean;
		/** Full HuggingFace model id, e.g. `google/gemma-3-4b-it-qat-q4_0-gguf`. */
		modelId: string;
	}

	let { isGated, modelId }: Props = $props();

	let isAccountOpen = $state(false);

	let user = $derived(huggingFace.user);

	onMount(() => void huggingFace.restoreSession());
</script>

{#if isGated}
	<section
		class="flex items-center gap-3 rounded-3xl bg-muted/60 px-4 py-3 text-body-sm elevated-control"
	>
		<Lock class="size-4 shrink-0 text-muted-foreground" />

		<p class="min-w-0 flex-1 text-muted-foreground">
			{#if user}
				Gated model. It downloads with your Hugging Face account,
				<span class="font-medium text-foreground">{user.name}</span>, once you have access on
			{:else}
				Gated model. Sign in to Hugging Face to download it, once you have access on
			{/if}

			<!-- eslint-disable svelte/no-navigation-without-resolve -- an external link, to the model's page on Hugging Face -->
			<a
				class="underline"
				href={HuggingFaceService.getModelUrl(modelId)}
				rel="noopener noreferrer"
				target="_blank">its page</a
			>.
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</p>

		{#if !user}
			<Button onclick={() => (isAccountOpen = true)} size="sm" variant="outline">Sign in</Button>
		{/if}
	</section>
{/if}

<HfAccountDialog
	bind:open={isAccountOpen}
	account={huggingFace}
	description="Sign in to download the gated models you have access to."
	tokenAlsoSentTo={HUGGING_FACE_TOKEN_ALSO_SENT_TO}
/>

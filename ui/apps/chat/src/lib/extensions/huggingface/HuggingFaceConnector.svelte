<script lang="ts">
	import { HUGGING_FACE_TOKEN_ALSO_SENT_TO } from './constants';
	import { huggingFace, huggingFaceTools } from './huggingface.svelte';
	import { HfAccountPanel, HfLogo } from '@ggml-org/llama-huggingface/svelte';
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { Check } from '@lucide/svelte';
	import SettingsConnectorCard from '#lib/components/app/settings/SettingsConnectorCard.svelte';
	import { extensions } from '#lib/extensions/index.ts';
	import { onMount } from 'svelte';

	/** The extension that connects MCP servers: without it the Hugging Face tools have nowhere to run. */
	const MCP_EXTENSION_ID = 'mcp';

	onMount(() => void huggingFace.restoreSession());
</script>

<SettingsConnectorCard
	description="One sign-in for Hugging Face tools in chats, sharing conversations as agent traces, and gated model downloads."
	isConnected={!!huggingFace.user}
	name="Hugging Face"
>
	{#snippet logo()}
		<HfLogo class="size-6" />
	{/snippet}

	<div class="flex flex-col gap-4">
		<HfAccountPanel account={huggingFace} tokenAlsoSentTo={HUGGING_FACE_TOKEN_ALSO_SENT_TO} />

		{#if huggingFace.user}
			<!-- what the one sign-in covers; only the tools can be left out -->
			<ul class="flex flex-col gap-3 text-body-sm">
				{#if huggingFaceTools.isAvailable && extensions.isActive(MCP_EXTENSION_ID)}
					<li class="flex items-start gap-3">
						<div class="flex min-w-0 flex-1 flex-col">
							<span>Hugging Face tools</span>

							<span class="text-caption text-muted-foreground">
								Search models, datasets, Spaces and docs from a chat, through the Hugging Face MCP
								server. It is signed in with this account.
							</span>
						</div>

						<Switch
							aria-label="Use Hugging Face tools"
							checked={huggingFaceTools.isOn}
							onCheckedChange={(isOn) => huggingFaceTools.setOn(isOn)}
						/>
					</li>
				{/if}

				<li class="flex items-start gap-3">
					<div class="flex min-w-0 flex-1 flex-col">
						<span>Share conversations</span>

						<span class="text-caption text-muted-foreground">
							Upload a conversation to one of your datasets as an agent trace.
						</span>
					</div>

					<Check class="mt-0.5 size-4 text-muted-foreground" />
				</li>

				<li class="flex items-start gap-3">
					<div class="flex min-w-0 flex-1 flex-col">
						<span>Gated model downloads</span>

						<span class="text-caption text-muted-foreground">
							Download the gated models your account has access to.
						</span>
					</div>

					<Check class="mt-0.5 size-4 text-muted-foreground" />
				</li>
			</ul>

			<p class="text-caption text-muted-foreground">
				The sign-in stays in this browser. It goes to huggingface.co, and a model download passes it
				to your llama-server.
			</p>
		{/if}
	</div>
</SettingsConnectorCard>

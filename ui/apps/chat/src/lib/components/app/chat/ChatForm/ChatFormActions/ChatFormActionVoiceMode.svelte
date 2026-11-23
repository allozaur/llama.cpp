<!--
	The chat form's main button while the message is empty: opens voice mode, a spoken conversation with the model.
	The microphone beside it records into the message instead.
-->
<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import { AudioLines } from '@lucide/svelte';
	import { ICON_CLASS_DEFAULT, VOICE_CONVERSATION_MESSAGE } from '#lib/constants/index.ts';

	interface Props {
		class?: string;
		disabled?: boolean;
		/** Why voice mode cannot listen; disables the button and says why. */
		unavailableReason?: string | null;
		onClick?: () => void;
	}

	let {
		class: className = '',
		disabled = false,
		onClick,
		unavailableReason = null
	}: Props = $props();
</script>

<div class="flex items-center {className}">
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button
				class="size-8 rounded-full p-0 max-md:size-9"
				disabled={disabled || !!unavailableReason}
				onclick={onClick}
				type="button"
			>
				<span class="sr-only">{VOICE_CONVERSATION_MESSAGE.open}</span>

				<AudioLines class={ICON_CLASS_DEFAULT} />
			</Button>
		</Tooltip.Trigger>

		<Tooltip.Content class="max-w-64">
			<p>{unavailableReason ?? VOICE_CONVERSATION_MESSAGE.open}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</div>

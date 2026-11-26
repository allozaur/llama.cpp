<script lang="ts">
	import { X } from '@lucide/svelte';
	import { ActionIcon, ChatMessagePromptContent } from '#lib/components/app/index.ts';
	import type { ChatAttachmentDisplayItem } from '#lib/types/index.ts';

	interface Props {
		class?: string;
		item: ChatAttachmentDisplayItem;
		onRemove?: (id: string) => void;
		readonly?: boolean;
	}

	let { class: className = '', item, onRemove, readonly = false }: Props = $props();
</script>

<!-- a prompt of the library, pending in the chat form or sent with a message -->
<div class="group relative max-w-75 min-w-50 flex-shrink-0 {className}">
	<ChatMessagePromptContent compact content={item.textContent ?? ''} name={item.name} />

	{#if !readonly && onRemove}
		<div
			class="absolute top-10 right-2 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
		>
			<ActionIcon
				icon={X}
				onclick={() => onRemove?.(item.id)}
				stopPropagationOnClick
				tooltip="Remove"
			/>
		</div>
	{/if}
</div>

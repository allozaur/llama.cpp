<script lang="ts">
	import * as Select from '@ggml-org/llama-ui/ui/select';
	import { serverStore } from '#lib/stores/llama-server.svelte.ts';

	interface Props {
		disabled?: boolean;
	}

	let { disabled = false }: Props = $props();
</script>

{#if serverStore.isRouter}
	<Select.Root
		{disabled}
		onValueChange={(id) => serverStore.selectModel(id)}
		type="single"
		value={serverStore.selectedModel ?? ''}
	>
		<Select.Trigger aria-label="Model" class="max-w-48 min-w-0" size="xs">
			<span class="truncate">{serverStore.selectedModel ?? 'Select model'}</span>
		</Select.Trigger>

		<Select.Content>
			{#each serverStore.models as id (id)}
				<Select.Item label={id} value={id}>{id}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
{:else if serverStore.modelName}
	<span class="max-w-48 truncate text-xs text-muted-foreground" title={serverStore.modelName}>
		{serverStore.modelName}
	</span>
{/if}

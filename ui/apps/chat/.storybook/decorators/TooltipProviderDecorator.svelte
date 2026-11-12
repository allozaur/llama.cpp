<script lang="ts">
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';

	interface Props {
		children: any;
	}

	let { children }: Props = $props();
</script>

<Tooltip.Provider>
	{@render children()}
</Tooltip.Provider>

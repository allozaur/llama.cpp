<script lang="ts">
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';
	import { DialogServers } from '$lib/components/app';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(true) }: Props = $props();
</script>

<!-- The cards mount tooltips, which need the server +layout.svelte supplies. -->
<Tooltip.Provider>
	<DialogServers bind:open />
</Tooltip.Provider>

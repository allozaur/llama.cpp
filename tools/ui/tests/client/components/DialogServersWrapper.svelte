<script lang="ts">
	import { DialogServers } from '$lib/components/app';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(true) }: Props = $props();
</script>

<!-- The cards mount tooltips, which need the server +layout.svelte supplies. -->
<Tooltip.Provider>
	<DialogServers bind:open />
</Tooltip.Provider>

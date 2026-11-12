<script lang="ts">
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';
	import { ServerCard } from '$lib/components/app/servers';
	import type { Server } from '$lib/types';

	interface Props {
		server: Server;
		isLocal?: boolean;
		onPair?: (code: string) => void;
	}

	let { isLocal = false, onPair, server }: Props = $props();
</script>

<!-- The card mounts tooltips, which need the server +layout.svelte supplies. -->
<Tooltip.Provider>
	<ServerCard {isLocal} {onPair} {server} />
</Tooltip.Provider>

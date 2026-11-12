<script lang="ts">
	import Page from '../../../src/routes/(chat)/+page.svelte';
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';
</script>

<!--
	Test wrapper that provides necessary context servers for component testing.
	This mirrors the servers from +layout.svelte.
-->
<Tooltip.Provider>
	<Page />
</Tooltip.Provider>

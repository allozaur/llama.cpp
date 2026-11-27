<script lang="ts">
	import { extensions } from '#lib/extensions/index.ts';
</script>

<div class="space-y-4">
	<p class="text-body-sm text-muted-foreground">
		Accounts and services Llama Chat is connected to. One sign-in covers everything a connector
		does. A connector belongs to an extension: switch it off under Extensions.
	</p>

	{#each extensions.contributions('connectors') as connector (connector.id)}
		<connector.card />
	{/each}
</div>

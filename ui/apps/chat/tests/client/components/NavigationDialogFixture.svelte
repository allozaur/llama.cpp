<script lang="ts">
	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
</script>

<!-- a dialog as an extension gives it to the sidebar: all the sidebar knows is its bindable `open` -->
{#if open}
	<div data-testid="navigation-dialog" role="dialog">
		<button onclick={() => (open = false)} type="button">Close fixture dialog</button>
	</div>
{/if}

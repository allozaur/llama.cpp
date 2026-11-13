<script lang="ts">
	import { Switch } from '@ggml/llama-ui/ui/switch';
	import { type ExtensionRegistry, extensions } from '$lib/extensions';

	interface Props {
		/** The registry to list and switch. The app's own by default; stories and tests pass another. */
		registry?: ExtensionRegistry;
	}

	let { registry = extensions }: Props = $props();
</script>

<div class="space-y-6">
	<p class="text-sm text-muted-foreground">
		Features you can switch off. An extension that is off does not run.
	</p>

	{#if registry.extensions.length === 0}
		<div class="py-8 text-center text-sm text-muted-foreground">No extensions available</div>
	{:else}
		<ul class="space-y-6">
			{#each registry.extensions as extension (extension.id)}
				{@const switchId = `extension-${extension.id}`}
				{@const descriptionId = `${switchId}-description`}

				<li class="flex items-start justify-between gap-4">
					<div class="min-w-0 space-y-1">
						<label
							class="block cursor-pointer pt-0.5 pb-0.5 text-sm leading-none font-medium"
							for={switchId}
						>
							{extension.name}
						</label>

						<p class="text-xs text-muted-foreground" id={descriptionId}>
							{extension.description}
						</p>

						{#if extension.state === 'failed'}
							<p class="flex items-start gap-1.5 pt-1 text-xs text-destructive" role="alert">
								<span
									aria-hidden="true"
									class="status-lamp orb-danger mt-1 size-2 shrink-0 rounded-full"
								></span>

								<span class="min-w-0 break-words">
									{extension.name} did not start: {extension.error ?? 'unknown error'}. Switch it
									off and on to try again.
								</span>
							</p>
						{/if}
					</div>

					<Switch
						aria-describedby={descriptionId}
						checked={extension.enabled}
						id={switchId}
						onCheckedChange={(checked) => void registry.setEnabled(extension.id, checked)}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>

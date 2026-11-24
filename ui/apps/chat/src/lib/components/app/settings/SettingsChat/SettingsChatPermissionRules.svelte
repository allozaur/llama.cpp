<script lang="ts">
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { X } from '@lucide/svelte';
	import { PermissionEffect } from '#lib/enums/index.ts';
	import { permissionsStore, toolsStore } from '#lib/stores/index.ts';
	import type { PermissionRule } from '#lib/types/index.ts';

	const EFFECT_LABELS: Record<PermissionEffect, string> = {
		[PermissionEffect.ALLOW]: 'Allow',
		[PermissionEffect.ASK]: 'Ask',
		[PermissionEffect.DENY]: 'Deny'
	};

	// rules a checkbox above already shows: a tool allowed everywhere, for every call
	let rules = $derived(
		permissionsStore.rules.filter(
			(rule) => rule.pattern || rule.cwd || rule.effect !== PermissionEffect.ALLOW
		)
	);

	function toolName(rule: PermissionRule): string {
		return (
			toolsStore.allTools.find((entry) => entry.key === rule.tool)?.definition.function.name ??
			rule.tool
		);
	}
</script>

<section class="space-y-2 pt-4">
	<div class="space-y-1">
		<h3 class="text-body-sm font-medium">Permission rules</h3>

		<p class="text-caption text-muted-foreground">
			Added when you allow a command or a tool in its prompt for good, everywhere or in one folder.
			Deny wins over ask, and ask over allow. Rules spare prompts; what tools may do is still set by
			llama-server.
		</p>
	</div>

	{#if rules.length === 0}
		<p class="py-3 text-center text-body-sm text-muted-foreground">No rules yet</p>
	{:else}
		<ul class="divide-y divide-border/50 rounded-lg border border-border/50">
			{#each rules as rule (rule.id)}
				<li class="flex items-center gap-2 px-3 py-2 text-body-sm">
					<Badge
						class="shrink-0"
						variant={rule.effect === PermissionEffect.DENY ? 'destructive' : 'secondary'}
					>
						{EFFECT_LABELS[rule.effect]}
					</Badge>

					<span class="flex min-w-0 flex-1 flex-col">
						<span class="truncate font-mono text-caption" title={rule.pattern ?? toolName(rule)}>
							{rule.pattern ?? toolName(rule)}
						</span>

						<span class="truncate text-caption text-muted-foreground" title={rule.cwd}>
							{rule.pattern ? `${toolName(rule)} · ` : ''}{rule.cwd ?? 'Everywhere'}
						</span>
					</span>

					<Button
						aria-label="Remove rule"
						class="shrink-0"
						onclick={() => permissionsStore.removeRule(rule.id)}
						size="icon-sm"
						variant="ghost"
					>
						<X class="size-icon-sm" />
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

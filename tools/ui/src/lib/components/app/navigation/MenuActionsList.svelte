<script lang="ts">
	import { KeyboardShortcutInfo } from '$lib/components/app';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MenuKind } from '$lib/enums';
	import type { MenuAction } from '$lib/types';
	import type { Component } from 'svelte';

	interface Props {
		actions: MenuAction[];
		kind: MenuKind;
		/** Closes the menu, e.g. after a pick in a submenu. */
		onClose: () => void;
	}

	let { actions, kind, onClose }: Props = $props();

	// both kits wrap the same bits-ui menu parts, so the rows render alike
	let Menu = $derived(kind === MenuKind.CONTEXT ? ContextMenu : DropdownMenu);
</script>

{#each actions as action, index (action.label)}
	{#if action.separator && index > 0}
		<Menu.Separator />
	{/if}

	{#if action.submenu}
		{@render action.submenu({ close: onClose, kind })}
	{:else}
		<Menu.Item
			class="flex items-center justify-between hover:[&>kbd]:opacity-100"
			disabled={action.disabled}
			onclick={action.onclick}
			variant={action.variant}
		>
			<div class="flex items-center gap-2">
				{@render iconComponent(
					action.icon,
					`h-4 w-4 ${action.variant === 'destructive' ? 'text-destructive' : ''}`
				)}
				{action.label}
			</div>

			{#if action.shortcut}
				<KeyboardShortcutInfo keys={action.shortcut} variant={action.variant} />
			{/if}
		</Menu.Item>
	{/if}
{/each}

{#snippet iconComponent(IconComponent: Component, className: string)}
	<IconComponent class={className} />
{/snippet}

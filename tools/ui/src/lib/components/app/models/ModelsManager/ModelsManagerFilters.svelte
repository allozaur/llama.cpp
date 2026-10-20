<script lang="ts">
	import { ChevronDown, Server as ServerGlyph } from '@lucide/svelte';
	import { Logo, ScrollCarousel } from '$lib/components/app';
	import { ServerIcon } from '$lib/components/app/servers';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import {
		CAPABILITY_ICONS,
		CAPABILITY_LABELS,
		FILTER_TOGGLE_ITEM_CLASS,
		FILTER_TRIGGER_CLASS,
		LOCAL_BACKEND_ID,
		MODALITY_FLAG_KEYS,
		MODALITY_ICONS,
		MODALITY_KEYS,
		MODALITY_LABELS,
		MODALITY_ORDER,
		type ModalityKey
	} from '$lib/constants';
	import { ModelCapability } from '$lib/enums';
	import { modelsStore } from '$lib/stores';
	import type { Server } from '$lib/types/server';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		/** Servers the filter can offer: the enabled ones. */
		availableServers: Server[];
		/** Capabilities a model must have every one of. */
		capabilities?: ModelCapability[];
		/** Smallest context a model must support; 0 keeps every model. */
		contextLimit?: number;
		/** Modalities a model must support at least one of. */
		modalities?: ModalityKey[];
		/** Server ids to keep; empty keeps every server. */
		servers?: string[];
		/** Repos each server contributes to the current search, shown in the menu. */
		serverCounts?: Record<string, number>;
	}

	let {
		availableServers,
		capabilities = $bindable<ModelCapability[]>([]),
		contextLimit = $bindable(0),
		modalities = $bindable<ModalityKey[]>([]),
		serverCounts = {},
		servers = $bindable<string[]>([])
	}: Props = $props();

	const CONTEXT_STEPS: { label: string; value: number }[] = [
		{ label: 'Any context', value: 0 },
		{ label: '8K or more', value: 8192 },
		{ label: '32K or more', value: 32768 },
		{ label: '128K or more', value: 131_072 },
		{ label: '256K or more', value: 262_144 },
		{ label: '1M or more', value: 1_048_576 }
	];

	const CAPABILITY_TOGGLES = [ModelCapability.TOOL_USE, ModelCapability.REASONING].map((value) => ({
		icon: CAPABILITY_ICONS[value],
		label: CAPABILITY_LABELS[value],
		value
	}));

	// only the modalities the models at hand actually carry: a toggle for something
	// none of them supports could only ever empty the table
	let detectedModalities = $derived.by(() => {
		const keys = new SvelteSet<ModalityKey>();

		for (const option of modelsStore.models) {
			for (const key of MODALITY_KEYS) {
				if (option.modalities?.[key]) keys.add(key);
			}
		}

		return keys;
	});
	let modalityToggles = $derived(
		MODALITY_ORDER.filter((modality) => detectedModalities.has(MODALITY_FLAG_KEYS[modality])).map(
			(modality) => ({
				icon: MODALITY_ICONS[modality],
				label: MODALITY_LABELS[modality],
				value: MODALITY_FLAG_KEYS[modality]
			})
		)
	);

	// one group holds what a model can do and what it can accept
	let toggles = $derived([...CAPABILITY_TOGGLES, ...modalityToggles]);
	const CAPABILITY_VALUES = new Set<string>(CAPABILITY_TOGGLES.map((entry) => entry.value));
	// every flag value, so a choice made before a model disappeared still round-trips
	const MODALITY_VALUES = new Set<string>(MODALITY_KEYS);

	// the group holds one flat list, so a change splits back into the two filters
	function setToggles(values: string[]): void {
		capabilities = values.filter((value): value is ModelCapability => CAPABILITY_VALUES.has(value));
		modalities = values.filter((value): value is ModalityKey => MODALITY_VALUES.has(value));
	}

	// none selected means every server, so the label names the selection
	let serverLabel = $derived(
		servers.length === 0
			? 'All servers'
			: servers.length === 1
				? (availableServers.find((server) => server.id === servers[0])?.name ?? '1 server')
				: `${servers.length} servers`
	);
	let contextLabel = $derived(
		CONTEXT_STEPS.find((step) => step.value === contextLimit)?.label ?? CONTEXT_STEPS[0].label
	);

	function toggleServer(id: string, checked: boolean | 'indeterminate'): void {
		servers = checked === true ? [...servers, id] : servers.filter((entry) => entry !== id);
	}
</script>

{#snippet serverMark(server: Server)}
	{#if server.id === LOCAL_BACKEND_ID}
		<ServerIcon class="h-3.5 w-3.5" {server}>
			{#snippet fallback()}
				<Logo class="shrink-0" style="--size: 0.875rem" />
			{/snippet}
		</ServerIcon>
	{:else}
		<ServerIcon class="h-3.5 w-3.5" {server} />
	{/if}
{/snippet}

<!-- below md the carousel keeps a row of its own: a toolbar that also holds a call to
     action would otherwise squeeze the filters out of sight. The scroll box clips on
     both axes, so it gets room for the controls' shadows and gives it back outside -->
<ScrollCarousel
	alwaysShowArrows
	class="min-w-0 flex-1 max-md:w-full max-md:flex-none"
	containerClass="-m-1 p-1"
	gapSize="2"
	innerClass="items-center"
>
	{#if availableServers.length > 1}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="inline-flex items-center whitespace-nowrap {FILTER_TRIGGER_CLASS}"
						type="button"
					>
						<ServerGlyph class="h-3.5 w-3.5" />

						{serverLabel}

						<ChevronDown class="h-3.5 w-3.5 opacity-60" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>

			<DropdownMenu.Content align="start" class="min-w-48">
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Servers</DropdownMenu.GroupHeading>

					{#each availableServers as server (server.id)}
						<DropdownMenu.CheckboxItem
							checked={servers.includes(server.id)}
							onCheckedChange={(checked) => toggleServer(server.id, checked)}
						>
							{@render serverMark(server)}

							{server.name}

							<DropdownMenu.Shortcut>{serverCounts[server.id] ?? 0}</DropdownMenu.Shortcut>
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Group>

				{#if servers.length > 0}
					<DropdownMenu.Separator />

					<DropdownMenu.Item onSelect={() => (servers = [])}>Show every server</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}

	<Select.Root
		onValueChange={(value) => (contextLimit = Number(value))}
		type="single"
		value={String(contextLimit)}
	>
		<Select.Trigger class={FILTER_TRIGGER_CLASS} size="sm">
			<span class="text-muted-foreground">Context:</span>

			{contextLabel}
		</Select.Trigger>

		<Select.Content>
			{#each CONTEXT_STEPS as step (step.value)}
				<Select.Item label={step.label} value={String(step.value)}>{step.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<ToggleGroup.Root
		onValueChange={setToggles}
		size="icon-sm"
		type="multiple"
		value={[...capabilities, ...modalities]}
	>
		{#each toggles as toggle (toggle.value)}
			<ToggleGroup.Item
				aria-label={toggle.label}
				class={FILTER_TOGGLE_ITEM_CLASS}
				title={toggle.label}
				value={toggle.value}
			>
				<toggle.icon class="size-icon-md" />
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
</ScrollCarousel>

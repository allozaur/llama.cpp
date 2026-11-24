<!--
	The Tools settings as the phone sheet's pages: the tool groups, one group's tools, and one tool's
	switches and the argument its calls show. The desktop draws the same as one table.
-->
<script lang="ts" module>
	import { ToolSource } from '#lib/enums/tools.enums.ts';
	import type { ToolEntry } from '#lib/types/index.ts';
	import { getToolUi } from '#lib/utils/index.ts';

	export type SettingsToolsView =
		| { id: 'tools' }
		| { groupKey: string; id: 'tool-group' }
		| { id: 'tool'; toolKey: string };

	/** The name and icon a tool is shown with: built-in tools have friendlier ones than their function names. */
	export function toolDisplay(entry: ToolEntry) {
		const name = entry.definition.function.name;
		const ui =
			entry.source === ToolSource.SERVER || entry.source === ToolSource.BROWSER
				? getToolUi(name)
				: null;

		return { icon: ui?.icon ?? null, label: ui?.label ?? name };
	}
</script>

<script lang="ts">
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { Check, ChevronRight, Server } from '@lucide/svelte';
	import {
		ICON_CLASS_DEFAULT,
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		SETTINGS_KEYS,
		TOOL_CALL_SHOWN_ARG_NONE
	} from '#lib/constants/index.ts';
	import {
		conversationsStore,
		mcpStore,
		permissionsStore,
		settingsStore,
		toolsStore
	} from '#lib/stores/index.ts';
	import type { OpenAIToolDefinition, ToolGroup } from '#lib/types/index.ts';
	import { parseToolCallShownArgOverrides } from '#lib/utils/index.ts';

	interface Props {
		view: SettingsToolsView;
		onOpen: (view: SettingsToolsView) => void;
	}

	let { onOpen, view }: Props = $props();

	// the shown-argument picks: a tool follows the global setting until it gets one of its own
	const SHOWN_ARG_DEFAULT = '__default__';
	const SHOWN_ARG_NONE = '__none__';

	let groups = $derived(toolsStore.toolGroups);
	let shownArgOverrides = $derived(
		parseToolCallShownArgOverrides(
			settingsStore.config[SETTINGS_KEYS.TOOL_CALL_SHOWN_ARG_OVERRIDES]
		)
	);
	let globalShownArg = $derived(
		String(settingsStore.config[SETTINGS_KEYS.TOOL_CALL_SHOWN_ARG] ?? '').trim()
	);

	let currentGroup = $derived(
		view.id === 'tool-group' ? groups.find((group) => group.key === view.groupKey) : undefined
	);
	let currentTool = $derived(
		view.id === 'tool'
			? groups.flatMap((group) => group.tools).find((entry) => entry.key === view.toolKey)
			: undefined
	);

	let scopeNote = $derived(
		conversationsStore.activeConversation
			? 'Applies to this conversation.'
			: 'Applies to new conversations. Tool picks inside a chat only affect that chat.'
	);

	function argNames(definition: OpenAIToolDefinition): string[] {
		const properties = (definition.function.parameters as { properties?: object } | undefined)
			?.properties;

		return properties ? Object.keys(properties) : [];
	}

	function shownArgPick(toolName: string): string {
		const own = shownArgOverrides[toolName];

		if (own === undefined) return SHOWN_ARG_DEFAULT;

		return own === TOOL_CALL_SHOWN_ARG_NONE ? SHOWN_ARG_NONE : own;
	}

	function shownArgLabel(pick: string): string {
		if (pick === SHOWN_ARG_NONE) return 'None';

		if (pick === SHOWN_ARG_DEFAULT)
			return globalShownArg ? `Default (${globalShownArg})` : 'Default';

		return pick;
	}

	function setShownArg(toolName: string, pick: string) {
		const next = { ...shownArgOverrides };

		if (pick === SHOWN_ARG_DEFAULT) delete next[toolName];
		else next[toolName] = pick === SHOWN_ARG_NONE ? TOOL_CALL_SHOWN_ARG_NONE : pick;

		settingsStore.updateConfig(SETTINGS_KEYS.TOOL_CALL_SHOWN_ARG_OVERRIDES, JSON.stringify(next));
	}

	function enabledCount(group: ToolGroup): number {
		return group.tools.filter((entry) => conversationsStore.preferences.isToolEnabled(entry.key))
			.length;
	}
</script>

{#if view.id === 'tools'}
	{#if groups.length === 0}
		<section class="{INSET_GROUP_CLASS} px-4 py-4 text-center text-body-sm text-muted-foreground">
			No tools available
		</section>
	{:else}
		<div class="flex flex-col gap-1.5">
			<section class={INSET_GROUP_CLASS}>
				{#each groups as group (group.key)}
					{@const favicon = group.serverId ? mcpStore.getServerFavicon(group.serverId) : null}

					<div class="group/row flex min-h-12 items-center px-4">
						<button
							class="flex min-h-12 min-w-0 flex-1 items-center gap-3 self-stretch text-left text-body"
							onclick={() => onOpen({ groupKey: group.key, id: 'tool-group' })}
							type="button"
						>
							{#if favicon}
								<img alt="" class="{ICON_CLASS_DEFAULT} shrink-0 rounded-sm" src={favicon} />
							{:else}
								<Server class="{ICON_CLASS_DEFAULT} shrink-0" />
							{/if}

							<span class={INSET_ROW_BODY_CLASS}>
								<span class="min-w-0 flex-1 truncate">{group.label}</span>

								<span class="text-body-sm text-muted-foreground tabular-nums">
									{enabledCount(group)}/{group.tools.length}
								</span>

								<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
							</span>
						</button>

						<span
							class="flex items-center self-stretch border-t border-border/60 pl-3 group-first/row:border-t-0"
						>
							<Switch
								aria-label="{group.label} tools"
								checked={conversationsStore.preferences.isGroupChecked(group)}
								onCheckedChange={() => void conversationsStore.preferences.toggleGroup(group)}
							/>
						</span>
					</div>
				{/each}
			</section>

			<p class={INSET_GROUP_CAPTION_CLASS}>{scopeNote}</p>
		</div>
	{/if}
{:else if view.id === 'tool-group' && currentGroup}
	{@const group = currentGroup}

	<section class={INSET_GROUP_CLASS}>
		<label class="{INSET_ROW_CLASS} cursor-pointer">
			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">All tools</span>

				<Switch
					checked={conversationsStore.preferences.isGroupChecked(group)}
					onCheckedChange={() => void conversationsStore.preferences.toggleGroup(group)}
				/>
			</span>
		</label>
	</section>

	<div class="flex flex-col gap-1.5">
		<section class={INSET_GROUP_CLASS}>
			{#each group.tools as entry (entry.key)}
				{@const display = toolDisplay(entry)}

				<div class="group/row flex min-h-12 items-center px-4">
					<button
						class="flex min-h-12 min-w-0 flex-1 items-center gap-3 self-stretch text-left text-body"
						onclick={() => onOpen({ id: 'tool', toolKey: entry.key })}
						type="button"
					>
						{#if display.icon}
							<display.icon class="{ICON_CLASS_DEFAULT} shrink-0" />
						{/if}

						<span class={INSET_ROW_BODY_CLASS}>
							<span class="min-w-0 flex-1 truncate">{display.label}</span>

							{#if permissionsStore.hasTool(entry.key)}
								<span class="text-body-sm text-muted-foreground">Always allowed</span>
							{/if}

							<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
						</span>
					</button>

					<span
						class="flex items-center self-stretch border-t border-border/60 pl-3 group-first/row:border-t-0"
					>
						<Switch
							aria-label={display.label}
							checked={conversationsStore.preferences.isToolEnabled(entry.key)}
							onCheckedChange={() => void conversationsStore.preferences.toggleTool(entry.key)}
						/>
					</span>
				</div>
			{/each}
		</section>

		<p class={INSET_GROUP_CAPTION_CLASS}>{scopeNote}</p>
	</div>
{:else if view.id === 'tool' && currentTool}
	{@const entry = currentTool}
	{@const toolName = entry.definition.function.name}
	{@const pick = shownArgPick(toolName)}

	<div class="flex flex-col gap-1.5">
		<section class={INSET_GROUP_CLASS}>
			<label class="{INSET_ROW_CLASS} cursor-pointer">
				<span class={INSET_ROW_BODY_CLASS}>
					<span class="flex-1">Enabled</span>

					<Switch
						checked={conversationsStore.preferences.isToolEnabled(entry.key)}
						onCheckedChange={() => void conversationsStore.preferences.toggleTool(entry.key)}
					/>
				</span>
			</label>

			<label class="{INSET_ROW_CLASS} cursor-pointer">
				<span class={INSET_ROW_BODY_CLASS}>
					<span class="flex-1">Always allow</span>

					<Switch
						checked={permissionsStore.hasTool(entry.key)}
						onCheckedChange={(checked) =>
							checked
								? permissionsStore.allowTool(entry.key)
								: permissionsStore.revokeTool(entry.key)}
					/>
				</span>
			</label>
		</section>

		<p class={INSET_GROUP_CAPTION_CLASS}>
			An always allowed tool runs without asking first. <span class="font-mono">{toolName}</span>
		</p>
	</div>

	<div class="flex flex-col gap-1.5">
		<h3 class={INSET_GROUP_CAPTION_CLASS}>Shown argument</h3>

		<section class={INSET_GROUP_CLASS}>
			{#each [SHOWN_ARG_DEFAULT, SHOWN_ARG_NONE, ...argNames(entry.definition)] as option (option)}
				<button
					aria-pressed={option === pick}
					class={INSET_ROW_CLASS}
					onclick={() => setShownArg(toolName, option)}
					type="button"
				>
					<span class={INSET_ROW_BODY_CLASS}>
						<span
							class="min-w-0 flex-1 truncate {option === SHOWN_ARG_DEFAULT ||
							option === SHOWN_ARG_NONE
								? ''
								: 'font-mono text-body-sm'}"
						>
							{shownArgLabel(option)}
						</span>

						{#if option === pick}
							<Check class="size-4 text-(--action-primary)" />
						{/if}
					</span>
				</button>
			{/each}
		</section>

		<p class={INSET_GROUP_CAPTION_CLASS}>The argument a call's line shows when the call has it.</p>
	</div>
{/if}

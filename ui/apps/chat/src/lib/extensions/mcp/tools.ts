/**
 * MCP's side of the `tools` and `flow` extension points: the tools of the MCP
 * servers the browser connects to, listed and run through mcpStore, the tools
 * of the MCP servers llama-server runs (see `llama-server.ts`), the tools that
 * list and load the skills servers publish (see `skills/tools.ts`), and the
 * hold an agentic flow takes on the connections.
 */

import type { FlowHook, ToolProvider, ToolProviderEntry } from '../points/tools';
import type { ExtensionContext } from '../types';
import McpToolGroupIdentity from './components/contributions/McpToolGroupIdentity.svelte';
import {
	executeLlamaServerMcpTool,
	isLlamaServerMcpTool,
	llamaServerMcpServers
} from './llama-server';
import { executeSkillTool, isSkillTool, skillToolEntries } from './skills/tools';
import { mcpStore } from './stores/index.svelte';
import {
	HealthCheckStatus,
	JsonSchemaType,
	ServerToolType,
	ToolCallType,
	ToolSource
} from '#lib/enums/index.ts';
// direct imports of the stores, not via the barrel, to avoid circular deps
import { conversationsStore } from '#lib/stores/conversations/index.svelte.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';

function inferTypeFromDefault(value: unknown): string | undefined {
	if (typeof value === 'string') return 'string';

	if (typeof value === 'boolean') return 'boolean';

	if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';

	if (Array.isArray(value)) return 'array';

	if (value !== null && typeof value === 'object') return 'object';

	return undefined;
}

/**
 * Recursively normalize a JSON Schema object: infers `type` from `default`
 * for properties / items that omit it, and descends into nested `properties`
 * and `items`. Returns a new object -- does not mutate the input.
 */
function normalizeJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
	if (!schema || typeof schema !== 'object') return schema;

	const normalized: Record<string, unknown> = { ...schema };

	if (normalized.properties && typeof normalized.properties === 'object') {
		const props = normalized.properties as Record<string, Record<string, unknown>>;
		const normalizedProps: Record<string, Record<string, unknown>> = {};

		for (const [key, prop] of Object.entries(props)) {
			if (!prop || typeof prop !== 'object') {
				normalizedProps[key] = prop;

				continue;
			}

			const normalizedProp: Record<string, unknown> = { ...prop };

			if (!normalizedProp.type && normalizedProp.default !== undefined) {
				const inferred = inferTypeFromDefault(normalizedProp.default);

				if (inferred) normalizedProp.type = inferred;
			}

			if (normalizedProp.properties) {
				Object.assign(normalizedProp, normalizeJsonSchema(normalizedProp));
			}

			if (normalizedProp.items && typeof normalizedProp.items === 'object') {
				normalizedProp.items = normalizeJsonSchema(normalizedProp.items as Record<string, unknown>);
			}

			normalizedProps[key] = normalizedProp;
		}
		normalized.properties = normalizedProps;
	}

	return normalized;
}

/** Get MCP tools from health check data, used when live connections aren't established yet */
function getToolsFromHealthChecks(): {
	serverId: string;
	serverName: string;
	tools: { name: string; description?: string }[];
}[] {
	const result: ReturnType<typeof getToolsFromHealthChecks> = [];

	for (const server of mcpStore.getServers()) {
		if (!server.enabled) continue;

		const health = mcpStore.getHealthCheckState(server.id);

		if (health.status === HealthCheckStatus.SUCCESS && health.tools.length > 0) {
			result.push({
				serverId: server.id,
				serverName: mcpStore.getServerLabel(server),
				tools: health.tools
			});
		}
	}

	return result;
}

/**
 * The tools of the servers the browser connects to, normalized, from live
 * connections when there are some and from health check data until then,
 * then the tools of the MCP servers llama-server runs.
 */
function listTools(): ToolProviderEntry[] {
	const out: ToolProviderEntry[] = [];
	const connections = mcpStore.getConnections();

	if (connections.size > 0) {
		for (const [serverId, connection] of connections) {
			const groupLabel = mcpStore.getServerDisplayName(serverId);

			for (const tool of connection.tools) {
				const rawSchema = (tool.inputSchema as Record<string, unknown>) ?? {
					properties: {},
					required: [],
					type: JsonSchemaType.OBJECT
				};

				out.push({
					definition: {
						function: {
							description: tool.description,
							name: tool.name,
							parameters: normalizeJsonSchema(rawSchema)
						},
						type: ToolCallType.FUNCTION
					},
					groupId: serverId,
					groupLabel
				});
			}
		}
	} else {
		for (const { serverId, serverName, tools } of getToolsFromHealthChecks()) {
			for (const tool of tools) {
				out.push({
					definition: {
						function: {
							description: tool.description,
							name: tool.name,
							parameters: { properties: {}, required: [], type: JsonSchemaType.OBJECT }
						},
						type: ToolCallType.FUNCTION
					},
					groupId: serverId,
					groupLabel: serverName
				});
			}
		}
	}

	for (const server of llamaServerMcpServers()) {
		for (const tool of server.tools) {
			out.push({ definition: tool.definition, groupId: server.groupId, groupLabel: server.name });
		}
	}

	return out;
}

/**
 * MCP servers usable under the effective policy: globally enabled, url set,
 * MCP category on and the server-scoped key not disabled.
 */
export function policyEnabledServerIds(): string[] {
	const preferences = conversationsStore.preferences;

	if (!mcpStore.isFeatureEnabled || !preferences.isCategoryEnabled(ToolSource.MCP)) return [];

	return mcpStore
		.getServers()
		.filter(
			(server) => server.enabled && server.url.trim() && preferences.isServerToolsEnabled(server.id)
		)
		.map((server) => server.id);
}

/** The servers usable under the effective policy that publish skills. */
export function skillServersInUse(): string[] {
	return policyEnabledServerIds().filter((serverId) => mcpStore.publishesSkills(serverId));
}

/** Enable all tools belonging to a specific MCP server */
export function enableAllToolsForServer(serverId: string): void {
	const connection = mcpStore.getConnections().get(serverId);

	if (!connection) return;

	// the server-scoped group key disables every tool regardless of per-tool keys
	toolsStore.enableTools([
		toolsStore.getGroupKey(ToolSource.MCP, serverId),
		...connection.tools.map((tool) => toolsStore.getToolKey(ToolSource.MCP, tool.name, serverId))
	]);
}

const toolProvider: ToolProvider = {
	// only while MCP is on
	emptyHint: () =>
		mcpStore.isFeatureEnabled
			? {
					action: `${mcpStore.getServers().length > 0 ? 'Enable' : 'Add'} MCP Server(s) to access`,
					sentence: 'To see MCP Tools you need to add / enable MCP Server(s).',
					toolsLabel: 'MCP Tools'
				}
			: undefined,
	entries: () => [...listTools(), ...skillToolEntries(skillServersInUse())],
	async execute(call, signal) {
		if (isLlamaServerMcpTool(call.name)) {
			return executeLlamaServerMcpTool(call.name, call.arguments, signal);
		}

		// a server's own tool of the same name is listed first, so the call is that server's
		if (isSkillTool(call.name) && !mcpStore.hasTool(call.name)) {
			return executeSkillTool(call, skillServersInUse());
		}

		const result = await mcpStore.executeTool(
			{ function: { arguments: call.arguments, name: call.name }, id: call.id },
			signal
		);

		// a result the server marks as an error still goes to the model as a normal result
		return { content: result.content, isError: false };
	},
	groupIcon: (serverId) => mcpStore.getServerFavicon(serverId),
	groupIdentity: McpToolGroupIdentity,
	isConfigured: () => mcpStore.hasEnabledServers() || llamaServerMcpServers().length > 0,
	/**
	 * Initialize every settings-enabled server. The tools store filters by the
	 * policy afterwards, so switching policies never re-initializes connections.
	 */
	async prepare() {
		if (policyEnabledServerIds().length === 0) return;

		const initialized = await mcpStore.ensureInitialized();

		if (!initialized) console.log('[MCP] Not initialized');
	},
	refresh: () => mcpStore.runHealthChecksForServers(mcpStore.getServers().filter((s) => s.enabled)),
	serverToolType: ServerToolType.MCP,
	source: ToolSource.MCP,
	toolIcon: (toolName) => mcpStore.getServerFaviconForTool(toolName)
};
/** Hold the connections for as long as a flow that can use them runs. */
const flowHook: FlowHook = () => {
	if (policyEnabledServerIds().length === 0) return;

	mcpStore.acquireConnection();

	return () => mcpStore.releaseConnection();
};

export function contributeTools(ctx: ExtensionContext): void {
	ctx.contribute('tools', toolProvider);
	ctx.contribute('flow', flowHook);
}

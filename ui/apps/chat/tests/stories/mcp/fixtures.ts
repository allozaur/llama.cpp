import type { OAuthDiscoveryState } from '@modelcontextprotocol/client';
import {
	HealthCheckStatus,
	MCPConnectionPhase,
	MCPLogLevel,
	MCPTransportType
} from '#lib/enums/index.ts';
import { mcpOAuthFlow } from '#lib/extensions/mcp/oauth/flow.svelte.ts';
import { mcpOAuthRedirectUrl } from '#lib/extensions/mcp/oauth/provider.ts';
import { mcpOAuthStorage } from '#lib/extensions/mcp/oauth/storage.svelte.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import type {
	HealthCheckState,
	MCPCapabilitiesInfo,
	MCPConnectionLog,
	MCPServerSettingsEntry
} from '#lib/types/index.ts';

const startedAt = new Date('2026-10-29T09:00:00Z');
const log = (
	offsetMs: number,
	phase: MCPConnectionPhase,
	message: string,
	level = MCPLogLevel.INFO
): MCPConnectionLog => ({
	level,
	message,
	phase,
	timestamp: new Date(startedAt.getTime() + offsetMs)
});

export const connectionLogs: MCPConnectionLog[] = [
	log(0, MCPConnectionPhase.TRANSPORT_CREATING, 'Creating streamable HTTP transport'),
	log(42, MCPConnectionPhase.TRANSPORT_READY, 'Transport ready'),
	log(118, MCPConnectionPhase.INITIALIZING, 'Negotiating protocol version...'),
	log(
		204,
		MCPConnectionPhase.CAPABILITIES_EXCHANGED,
		'Capabilities exchanged successfully (protocol 2026-07-28, stateless)'
	),
	log(266, MCPConnectionPhase.LISTING_TOOLS, 'Listing tools'),
	log(301, MCPConnectionPhase.CONNECTED, 'Connected with 3 tools')
];

export const errorLogs: MCPConnectionLog[] = [
	log(0, MCPConnectionPhase.TRANSPORT_CREATING, 'Creating streamable HTTP transport'),
	log(5_000, MCPConnectionPhase.ERROR, 'Request timed out after 5000 ms', MCPLogLevel.ERROR)
];

export const capabilities: MCPCapabilitiesInfo = {
	client: { elicitation: { form: true }, roots: { listChanged: true }, sampling: true },
	server: {
		completions: true,
		logging: true,
		prompts: { listChanged: true },
		resources: { listChanged: true, subscribe: true },
		tools: { listChanged: true }
	}
};

const server = (id: string, name: string, enabled = true): MCPServerSettingsEntry => ({
	displayName: name,
	enabled,
	id,
	url: `https://${id}.example.com/mcp`
});

export const servers = {
	connected: server('docs', 'Docs search'),
	connecting: server('files', 'Filesystem'),
	disabled: server('weather', 'Weather', false),
	error: server('tracker', 'Issue tracker')
};

const states: Record<string, HealthCheckState> = {
	[servers.connected.id]: {
		capabilities,
		connectionTimeMs: 301,
		logs: connectionLogs,
		protocolVersion: '2026-07-28',
		serverInfo: { name: 'docs-search', version: '1.4.0' },
		status: HealthCheckStatus.SUCCESS,
		tools: [
			{ description: 'Full text search over the docs', name: 'search_docs' },
			{ description: 'Fetch one page by path', name: 'get_page' },
			{ description: 'List the table of contents', name: 'list_sections' }
		],
		transportType: MCPTransportType.STREAMABLE_HTTP
	},
	[servers.connecting.id]: {
		logs: connectionLogs.slice(0, 3),
		phase: MCPConnectionPhase.INITIALIZING,
		status: HealthCheckStatus.CONNECTING
	},
	[servers.error.id]: {
		logs: errorLogs,
		message: 'Request timed out after 5000 ms',
		phase: MCPConnectionPhase.ERROR,
		status: HealthCheckStatus.ERROR
	}
};

// health states normally come from a live probe; the setter is private, so reach it directly
type HealthAccess = {
	health: { clear: (id: string) => void; setState: (id: string, state: HealthCheckState) => void };
};

/** Seeds one health state per fixture server; returns the cleanup. */
export function seedServerHealth(): () => void {
	const { health } = mcpStore as unknown as HealthAccess;

	for (const [id, state] of Object.entries(states)) health.setState(id, state);

	return () => {
		for (const id of Object.keys(states)) health.clear(id);
	};
}

/** Servers that sign in with the browser, one per state of the sign-in. */
export const signInServers = {
	needsClientId: server('github-tools', 'Code host'),
	needsSignIn: server('notes', 'Notes'),
	signedIn: server('tickets', 'Tickets'),
	signingIn: server('calendar', 'Calendar')
};

// the sign-in states live in private sets: a live sign-in sets them, a story reaches them directly
type FlowAccess = {
	manualClientRequired: Set<string>;
	signInRequired: Set<string>;
	signingIn: Set<string>;
};

const signInLogs: MCPConnectionLog[] = [
	log(0, MCPConnectionPhase.TRANSPORT_CREATING, 'Creating transport'),
	log(40, MCPConnectionPhase.INITIALIZING, 'OAuth: Authorization server: https://auth.example.com'),
	log(41, MCPConnectionPhase.INITIALIZING, 'OAuth: The server needs you to sign in'),
	log(42, MCPConnectionPhase.ERROR, 'Sign in to use this server', MCPLogLevel.WARN)
];

/** Seeds a server in each sign-in state; returns the cleanup. */
export function seedSignInStates(): () => void {
	const { health } = mcpStore as unknown as HealthAccess;
	const flow = mcpOAuthFlow as unknown as FlowAccess;
	const redirectUrl = mcpOAuthRedirectUrl();
	const discovered = { authorizationServerUrl: 'https://auth.example.com' } as OAuthDiscoveryState;
	const all = Object.values(signInServers);

	for (const target of all) {
		mcpOAuthStorage.update(target.id, target.url, redirectUrl, (record) => ({
			...record,
			discoveryState: discovered
		}));
	}

	for (const target of [
		signInServers.needsSignIn,
		signInServers.signingIn,
		signInServers.needsClientId
	]) {
		health.setState(target.id, {
			logs: signInLogs,
			message: 'Sign in to use this server',
			phase: MCPConnectionPhase.ERROR,
			status: HealthCheckStatus.ERROR
		});
	}

	flow.signInRequired.add(signInServers.needsSignIn.id);
	flow.signInRequired.add(signInServers.signingIn.id);
	flow.signingIn.add(signInServers.signingIn.id);
	flow.signInRequired.add(signInServers.needsClientId.id);
	flow.manualClientRequired.add(signInServers.needsClientId.id);

	mcpOAuthStorage.update(
		signInServers.signedIn.id,
		signInServers.signedIn.url,
		redirectUrl,
		(record) => ({
			...record,
			tokens: { access_token: 'story-token', token_type: 'Bearer' }
		})
	);
	health.setState(signInServers.signedIn.id, states[servers.connected.id]);

	return () => {
		for (const target of all) {
			health.clear(target.id);
			mcpOAuthStorage.remove(target.id);
			flow.signInRequired.delete(target.id);
			flow.signingIn.delete(target.id);
			flow.manualClientRequired.delete(target.id);
		}
	};
}

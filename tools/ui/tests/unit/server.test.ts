// Guards the addressing of the server transport: a remote server is an
// address that cannot resolve on purpose, an access code is only usable in its
// exact shape, and the stored server list decides what the tunnel transport is
// allowed to route. A regression here silently sends a request to the wrong
// server, so these are cheap to check and expensive to lose.

import { CODE_CHARS, CODE_LENGTHS } from '$lib/constants';
import { ServerCardState, ServerKind, TunnelStatus } from '$lib/enums';
import {
	createLocalServer,
	createRemoteServer,
	createUrlServer,
	isLocalServer,
	isReachableServer,
	isRemoteServer,
	normalizeShareCode,
	parseServersSettings,
	parseTunnelOrigin,
	serverOrigin,
	tunnelHostLabel,
	tunnelOrigin
} from '$lib/utils/server';
import { type ServerCardFacts, serverCardStatusOf } from '$lib/utils/server-status';
import { describe, expect, it } from 'vitest';

/** A code of the right length, drawn from the alphabet llama-server generates from. */
const CODE = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[index % CODE_CHARS.length]
).join('');

describe('access codes', () => {
	it('accepts a code the user pasted with spacing', () => {
		expect(normalizeShareCode(` ${CODE.slice(0, 8)} ${CODE.slice(8)}\n`)).toBe(CODE);
	});

	it('refuses a code of the wrong length', () => {
		expect(normalizeShareCode(CODE.slice(0, 39))).toBe('');
		expect(normalizeShareCode(`${CODE}x`)).toBe('');
	});

	it('refuses characters the code alphabet leaves out', () => {
		// `I` is not in CODE_CHARS: it is too easy to misread off a terminal
		expect(normalizeShareCode(`${'I'.repeat(8)}${CODE.slice(8)}`)).toBe('');
	});
});

describe('tunnel origins', () => {
	it('addresses a server by a host that cannot resolve', () => {
		expect(tunnelOrigin('server-1')).toBe('https://server-1.remote.llamacpp.invalid');
	});

	it('reads the server back out of the address it wrote', () => {
		expect(parseTunnelOrigin(tunnelOrigin('server-1'))).toBe('server-1');
		expect(parseTunnelOrigin(new URL(tunnelOrigin('r2')))).toBe('r2');
	});

	it('leaves anything that is not a tunnel origin alone', () => {
		expect(parseTunnelOrigin('https://example.com/v1/models')).toBeNull();

		// a host that merely ends in the suffix without a label is not a server
		expect(parseTunnelOrigin('https://remote.llamacpp.evil/props')).toBeNull();
	});

	it('matches a host a server id was sanitized into', () => {
		expect(tunnelHostLabel('Bad Id!')).toBe('bad-id');
		expect(parseTunnelOrigin(tunnelOrigin('Bad Id!'))).toBe('bad-id');
	});
});

describe('server origins', () => {
	it('serves the built-in server from the page origin', () => {
		expect(serverOrigin(createLocalServer())).toBe('');
		expect(isLocalServer(createLocalServer())).toBe(true);
		expect(isLocalServer(null)).toBe(true);
	});

	it('strips the trailing slash of a URL server', () => {
		const server = createUrlServer('https://example.com/llama/', 'u1', 'Office');

		expect(serverOrigin(server)).toBe('https://example.com/llama');
		expect(server.name).toBe('Office');
	});

	it('addresses a remote server by its tunnel origin', () => {
		const server = createRemoteServer(CODE, 'r1');

		expect(isRemoteServer(server)).toBe(true);
		expect(serverOrigin(server)).toBe(tunnelOrigin('r1'));
	});
});

describe('stored server list', () => {
	it('reads a legacy entry as a URL server', () => {
		const [server] = parseServersSettings([
			{ baseUrl: 'https://example.com/llama/', id: 'u1', name: 'O' }
		]);

		expect(server.kind).toBe(ServerKind.URL);
		expect(server.baseUrl).toBe('https://example.com/llama');
	});

	it('keeps the API key of a stored server', () => {
		const [server] = parseServersSettings([
			{ apiKey: 'sk-secret', baseUrl: 'https://example.com', id: 'u1', name: 'Office' }
		]);

		// the key is the credential of that server: dropping it here turns every
		// request into an unauthenticated one
		expect(server.apiKey).toBe('sk-secret');
	});

	it('keeps the API key of a stored remote server', () => {
		const [server] = parseServersSettings([
			{ apiKey: 'sk-secret', code: CODE, id: 'r1', kind: 'remote', name: 'Home' }
		]);

		expect(server.apiKey).toBe('sk-secret');
	});

	it('carries the API key of a remote server the form builds', () => {
		const server = createRemoteServer(CODE, 'r1', 'Home', 'sk-secret');

		expect(server.apiKey).toBe('sk-secret');
	});

	it('reads a remote entry and drops one without a usable code', () => {
		const servers = parseServersSettings([
			{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' },
			{ code: 'nope', id: 'r2', kind: 'remote' }
		]);

		expect(servers.map((server) => server.id)).toEqual(['r1']);
		expect(servers[0].kind).toBe(ServerKind.REMOTE);
		expect(servers[0].baseUrl).toBe('');
	});

	it('refuses a URL server squatting on the tunnel host', () => {
		expect(
			parseServersSettings([{ baseUrl: 'https://r1.remote.llamacpp.invalid', id: 'u1' }])
		).toEqual([]);
	});

	it('drops the built-in server, which is never persisted', () => {
		expect(parseServersSettings([{ baseUrl: '', id: 'local', name: 'Local' }])).toEqual([]);
	});

	it('ignores a value it cannot parse', () => {
		expect(parseServersSettings('{oops')).toEqual([]);
		expect(parseServersSettings(undefined)).toEqual([]);
		expect(parseServersSettings('not json')).toEqual([]);
	});
});

describe('reachability', () => {
	it('always reaches the built-in server', () => {
		expect(isReachableServer(createLocalServer())).toBe(true);
	});

	it('needs a code from a remote server and a URL from a URL one', () => {
		expect(isReachableServer(createRemoteServer(CODE, 'r1'))).toBe(true);
		expect(isReachableServer({ ...createRemoteServer(CODE, 'r1'), code: '' })).toBe(false);
		expect(isReachableServer(createUrlServer('https://example.com', 'u1'))).toBe(true);
		expect(isReachableServer(createUrlServer('not a url', 'u2'))).toBe(false);
		expect(isReachableServer(createUrlServer('', 'u3'))).toBe(false);
	});
});

/** Facts of a server that was never listed and never connected. */
function facts(overrides: Partial<ServerCardFacts> = {}): ServerCardFacts {
	return {
		enabled: true,
		modelCount: 0,
		modelsError: '',
		modelsLoaded: false,
		modelsLoading: false,
		remote: false,
		tunnel: TunnelStatus.IDLE,
		tunnelError: '',
		...overrides
	};
}

describe('card status', () => {
	it('names a running handshake', () => {
		const status = serverCardStatusOf(facts({ remote: true, tunnel: TunnelStatus.CONNECTING }));

		expect(status.state).toBe(ServerCardState.CONNECTING);
		expect(status.label).toBe('Connecting');
		expect(status.detail).toBe('Opening the tunnel to the host.');
	});

	it('keeps an idle remote server a choice, not a failure', () => {
		const status = serverCardStatusOf(facts({ remote: true, tunnel: TunnelStatus.IDLE }));

		expect(status.state).toBe(ServerCardState.IDLE);
		expect(status.label).toBe('Not connected');
		expect(status.detail).toBe('Paste the code the host prints, or press Connect.');
	});

	it('carries the transport sentence of a dropped channel', () => {
		const status = serverCardStatusOf(
			facts({
				remote: true,
				tunnel: TunnelStatus.ERROR,
				tunnelError: 'authentication failed: invalid passcode'
			})
		);

		expect(status.state).toBe(ServerCardState.CHANNEL_DOWN);
		expect(status.label).toBe('Channel down');
		expect(status.detail).toBe('authentication failed: invalid passcode');
	});

	it('reports a listing that failed behind an open channel as unreachable', () => {
		const status = serverCardStatusOf(
			facts({ modelsError: 'host refused', remote: true, tunnel: TunnelStatus.CONNECTED })
		);

		expect(status.state).toBe(ServerCardState.UNREACHABLE);
		expect(status.label).toBe('Unreachable');
		expect(status.detail).toBe('host refused');
	});

	it('counts the models of a server that answered', () => {
		expect(serverCardStatusOf(facts({ modelCount: 1, modelsLoaded: true })).label).toBe('1 model');
		expect(serverCardStatusOf(facts({ modelCount: 4, modelsLoaded: true })).label).toBe('4 models');
	});

	it('says what is being checked, tunnel or not', () => {
		const direct = serverCardStatusOf(facts({ modelsLoading: true }));
		const tunneled = serverCardStatusOf(
			facts({ modelsLoading: true, remote: true, tunnel: TunnelStatus.CONNECTED })
		);

		expect(direct.label).toBe('Checking');
		expect(direct.detail).toBe('Asking the server for the models it serves.');
		expect(tunneled.detail).toBe('Asking the host for the models it serves.');
	});

	it('reports nothing for a server that is switched off', () => {
		const status = serverCardStatusOf(facts({ enabled: false, modelsError: 'host refused' }));

		expect(status.state).toBe(ServerCardState.NONE);
		expect(status.label).toBe('');
		expect(status.detail).toBe('');
	});
});

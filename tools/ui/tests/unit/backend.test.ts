// Guards the addressing of the provider transport: a remote provider is an
// address that cannot resolve on purpose, an access code is only usable in its
// exact shape, and the stored provider list decides what the tunnel transport is
// allowed to route. A regression here silently sends a request to the wrong
// server, so these are cheap to check and expensive to lose.

import { CODE_CHARS, CODE_LENGTHS } from '$lib/constants';
import { BackendKind } from '$lib/enums';
import {
	backendOrigin,
	createLocalBackend,
	createRemoteBackend,
	createUrlBackend,
	isLocalBackend,
	isReachableBackend,
	isRemoteBackend,
	normalizeShareCode,
	parseBackendsSettings,
	parseTunnelOrigin,
	tunnelHostLabel,
	tunnelOrigin
} from '$lib/utils/backend';
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
	it('addresses a provider by a host that cannot resolve', () => {
		expect(tunnelOrigin('backend-1')).toBe('https://backend-1.remote.llamacpp.invalid');
	});

	it('reads the provider back out of the address it wrote', () => {
		expect(parseTunnelOrigin(tunnelOrigin('backend-1'))).toBe('backend-1');
		expect(parseTunnelOrigin(new URL(tunnelOrigin('r2')))).toBe('r2');
	});

	it('leaves anything that is not a tunnel origin alone', () => {
		expect(parseTunnelOrigin('https://example.com/v1/models')).toBeNull();

		// a host that merely ends in the suffix without a label is not a provider
		expect(parseTunnelOrigin('https://remote.llamacpp.evil/props')).toBeNull();
	});

	it('matches a host a provider id was sanitized into', () => {
		expect(tunnelHostLabel('Bad Id!')).toBe('bad-id');
		expect(parseTunnelOrigin(tunnelOrigin('Bad Id!'))).toBe('bad-id');
	});
});

describe('provider origins', () => {
	it('serves the built-in backend from the page origin', () => {
		expect(backendOrigin(createLocalBackend())).toBe('');
		expect(isLocalBackend(createLocalBackend())).toBe(true);
		expect(isLocalBackend(null)).toBe(true);
	});

	it('strips the trailing slash of a URL provider', () => {
		const backend = createUrlBackend('https://example.com/llama/', 'u1', 'Office');

		expect(backendOrigin(backend)).toBe('https://example.com/llama');
		expect(backend.name).toBe('Office');
	});

	it('addresses a remote provider by its tunnel origin', () => {
		const backend = createRemoteBackend(CODE, 'r1');

		expect(isRemoteBackend(backend)).toBe(true);
		expect(backendOrigin(backend)).toBe(tunnelOrigin('r1'));
	});
});

describe('stored provider list', () => {
	it('reads a legacy entry as a URL provider', () => {
		const [backend] = parseBackendsSettings([
			{ baseUrl: 'https://example.com/llama/', id: 'u1', name: 'O' }
		]);

		expect(backend.kind).toBe(BackendKind.URL);
		expect(backend.baseUrl).toBe('https://example.com/llama');
	});

	it('reads a remote entry and drops one without a usable code', () => {
		const backends = parseBackendsSettings([
			{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' },
			{ code: 'nope', id: 'r2', kind: 'remote' }
		]);

		expect(backends.map((backend) => backend.id)).toEqual(['r1']);
		expect(backends[0].kind).toBe(BackendKind.REMOTE);
		expect(backends[0].baseUrl).toBe('');
	});

	it('refuses a URL provider squatting on the tunnel host', () => {
		expect(
			parseBackendsSettings([{ baseUrl: 'https://r1.remote.llamacpp.invalid', id: 'u1' }])
		).toEqual([]);
	});

	it('drops the built-in backend, which is never persisted', () => {
		expect(parseBackendsSettings([{ baseUrl: '', id: 'local', name: 'Local' }])).toEqual([]);
	});

	it('ignores a value it cannot parse', () => {
		expect(parseBackendsSettings('{oops')).toEqual([]);
		expect(parseBackendsSettings(undefined)).toEqual([]);
		expect(parseBackendsSettings('not json')).toEqual([]);
	});
});

describe('reachability', () => {
	it('always reaches the built-in backend', () => {
		expect(isReachableBackend(createLocalBackend())).toBe(true);
	});

	it('needs a code from a remote provider and a URL from a URL one', () => {
		expect(isReachableBackend(createRemoteBackend(CODE, 'r1'))).toBe(true);
		expect(isReachableBackend({ ...createRemoteBackend(CODE, 'r1'), code: '' })).toBe(false);
		expect(isReachableBackend(createUrlBackend('https://example.com', 'u1'))).toBe(true);
		expect(isReachableBackend(createUrlBackend('not a url', 'u2'))).toBe(false);
		expect(isReachableBackend(createUrlBackend('', 'u3'))).toBe(false);
	});
});

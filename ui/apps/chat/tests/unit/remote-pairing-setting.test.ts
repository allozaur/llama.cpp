import { beforeEach, describe, expect, it, vi } from 'vitest';

const config: Record<string, unknown> = {};

vi.mock('$lib/stores/settings/index.svelte', () => ({
	settingsStore: { getConfig: (key: string) => config[key] }
}));

vi.mock('$lib/utils/api-base', () => ({
	getServers: () => [
		{
			baseUrl: '',
			code: 'AbCd2345' + 'x'.repeat(32),
			enabled: true,
			id: 'remote-1',
			kind: 'remote',
			name: 'Remote'
		}
	]
}));

const connect = vi.fn();

vi.mock('$lib/utils/webrtc-tunnel', () => ({
	ClientTunnel: class {
		connect = connect;
		disconnect = vi.fn();
	}
}));

import { SETTING_CONFIG_DEFAULT, SETTINGS_CHAT_SECTIONS, SETTINGS_KEYS } from '$lib/constants';
import { remoteAccessStore } from '$lib/stores/remote-access.svelte';

describe('remote pairing setting', () => {
	beforeEach(() => {
		connect.mockReset().mockResolvedValue(undefined);
		delete config[SETTINGS_KEYS.ENABLE_REMOTE_PAIRING];
		remoteAccessStore.disconnect('remote-1');
	});

	it('is off by default, marked experimental and carries the security note', () => {
		const field = SETTINGS_CHAT_SECTIONS.flatMap((section) => section.fields ?? []).find(
			(candidate) => candidate.key === SETTINGS_KEYS.ENABLE_REMOTE_PAIRING
		);

		expect(SETTING_CONFIG_DEFAULT[SETTINGS_KEYS.ENABLE_REMOTE_PAIRING]).toBe(false);
		expect(field?.isExperimental).toBe(true);
		expect(field?.note).toMatch(/pass code/);
	});

	it('opens no tunnel while it is off', async () => {
		await expect(remoteAccessStore.connect('remote-1')).rejects.toThrow(/turned off/);
		expect(connect).not.toHaveBeenCalled();
	});

	it('opens the tunnel once it is on', async () => {
		config[SETTINGS_KEYS.ENABLE_REMOTE_PAIRING] = true;

		await remoteAccessStore.connect('remote-1');

		expect(connect).toHaveBeenCalledOnce();
		expect(remoteAccessStore.isConnected('remote-1')).toBe(true);
	});
});

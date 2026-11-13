// A setting can belong to an extension. Its field is drawn only while that
// extension is on; the other fields of the section are not affected.

import SettingsChatFields from '$lib/components/app/settings/SettingsChat/SettingsChatFields.svelte';
import { SETTINGS_CHAT_SECTIONS, SETTINGS_KEYS } from '$lib/constants';
import { SettingsFieldType } from '$lib/enums/settings.enums';
import { extensions } from '$lib/extensions';
import type { SettingsFieldConfig } from '$lib/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

const EXTENSION_ID = 'fields-fixture';
const FIELDS: SettingsFieldConfig[] = [
	{ key: 'coreSetting', label: 'Core setting', type: SettingsFieldType.INPUT },
	{
		extension: EXTENSION_ID,
		key: 'extensionSetting',
		label: 'Extension setting',
		type: SettingsFieldType.INPUT
	}
];

function labels(container: Element): string[] {
	return [...container.querySelectorAll('label')].map((label) => label.textContent?.trim() ?? '');
}

describe('settings fields of an extension', () => {
	beforeAll(() => {
		extensions.register({
			description: 'Owns one settings field',
			disabledByDefault: true,
			id: EXTENSION_ID,
			load: async () => ({ default: { activate() {} } }),
			name: 'Fields fixture'
		});
	});

	afterAll(async () => {
		await extensions.setEnabled(EXTENSION_ID, false);
	});

	it('draws the field only while its extension is on', async () => {
		const { container } = render(SettingsChatFields, {
			fields: FIELDS,
			localConfig: { coreSetting: '1', extensionSetting: '2' },
			onConfigChange: () => {}
		});

		expect(labels(container)).toEqual(['Core setting']);

		await extensions.setEnabled(EXTENSION_ID, true);
		await expect.poll(() => labels(container)).toEqual(['Core setting', 'Extension setting']);

		await extensions.setEnabled(EXTENSION_ID, false);
		await expect.poll(() => labels(container)).toEqual(['Core setting']);
	});

	it('marks the MCP request timeout as the MCP extension’s', () => {
		const field = SETTINGS_CHAT_SECTIONS.flatMap((section) => section.fields ?? []).find(
			(entry) => entry.key === SETTINGS_KEYS.MCP_REQUEST_TIMEOUT_SECONDS
		);

		expect(field?.extension).toBe('mcp');
	});
});

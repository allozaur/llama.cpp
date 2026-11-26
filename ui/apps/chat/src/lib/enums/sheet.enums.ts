/** Pages of the phone's Add to chat sheet: its menu, the system message's prompts, the tool groups and one group's tools. */
export enum AddSheetPage {
	ROOT = 'root',
	SYSTEM_MESSAGE = 'system-message',
	TOOL_GROUP = 'tool-group',
	TOOLS = 'tools'
}

/** Pages of the phone's model picker: the models in reach and all of them. */
export enum ModelsSheetPage {
	ALL = 'all',
	ROOT = 'root'
}

/** Pages of the phone's settings sheet. */
export enum SettingsSheetPage {
	ROOT = 'root',
	SECTION = 'section',
	/** What an extension's settings action opens. */
	SETTINGS_ACTION = 'settings-action',
	TOOL = 'tool',
	TOOL_GROUP = 'tool-group',
	TOOLS = 'tools'
}

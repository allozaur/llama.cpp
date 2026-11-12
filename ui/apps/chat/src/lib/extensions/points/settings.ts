import type { Component } from 'svelte';

/** A dialog the app mounts for a settings action and opens through its bindable `open`. */
export type SettingsActionDialog = Component<{ open?: boolean }, Record<string, never>, 'open'>;

/**
 * An action under one of the extension's settings, there while that setting is on. It opens what
 * the extension manages from Settings: a dialog on a desktop or tablet, a page of the settings
 * sheet on a phone.
 */
export interface SettingsAction {
	dialog: SettingsActionDialog;
	icon: Component<{ class?: string }>;
	/** Stable identity among the settings actions. */
	id: string;
	label: string;
	/** What the dialog holds, as a page of the phone's settings sheet. */
	page: Component;
	/** Key of the setting the action sits under. */
	settingKey: string;
	/** Title of the phone's page. */
	title: string;
}

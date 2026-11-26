/**
 * The extension contract: what an extension is, and the points of the app it
 * can add to. Built-in features and, later, installed plugins go through the
 * same contract.
 */

import type { ConversationAction, MessageAction, Overlay } from './points/actions';
import type { ComposerAttachments, ComposerCommand, ComposerPicker } from './points/composer';
import type { Connector, ServerAuth } from './points/connectors';
import type { ModelDownloadAuth, ModelNotice } from './points/models';
import type { PromptSource } from './points/prompts';
import type { AttachmentRenderer, MessageRenderer } from './points/renderers';
import type { SettingsAction } from './points/settings';
import type { SkillSource } from './points/skills';
import type { FlowHook, ToolProvider } from './points/tools';

/** What the app knows about an extension before its code is loaded. */
export interface ExtensionManifest {
	/** Stable identity: the key its on/off choice is stored under. */
	id: string;
	name: string;
	description: string;
	/** Stays off until the user switches it on. */
	disabledByDefault?: boolean;
	/**
	 * Whether the app can use the extension right now, read reactively: unless it returns true
	 * the extension's contributions are left out, as if it were switched off, and they come back
	 * when it does. Undefined says it is not known yet. For an extension that depends on what
	 * the server offers.
	 */
	available?: () => boolean | undefined;
	/**
	 * Imports the extension's code. Called only when the extension is activated, so none of it
	 * runs while the extension is off, and a build that splits chunks fetches it only then.
	 */
	load: () => Promise<{ default: Extension }>;
}

/** An extension's code: one function that adds its contributions. */
export interface Extension {
	activate(ctx: ExtensionContext): void | Promise<void>;
}

/** Handed to `activate`. Everything done through it is undone when the extension is switched off. */
export interface ExtensionContext {
	/** Add a contribution to an extension point. */
	contribute<P extends ExtensionPoint>(point: P, contribution: ExtensionPoints[P]): void;
	/** Run this when the extension is switched off, for whatever `contribute` does not cover. */
	onDeactivate(cleanup: () => void | Promise<void>): void;
}

/** Every extension point, with the shape of what goes into it. */
export interface ExtensionPoints {
	/** Attachments held outside the chat form's files until the message is sent. */
	composerAttachments: ComposerAttachments;
	/** Slash commands in the chat form's `/` picker. */
	composerCommands: ComposerCommand;
	/** Popover pickers the chat form mounts, opened by a command. */
	composerPickers: ComposerPicker;
	/** Accounts and services in Settings > Connectors. */
	connectors: Connector;
	/** Actions in every conversation menu. */
	conversationActions: ConversationAction;
	/** Runs around every agentic flow. */
	flow: FlowHook;
	/** Actions under a message and in its context menu. */
	messageActions: MessageAction;
	/** The account a model download passes to llama-server. */
	modelDownloadAuth: ModelDownloadAuth;
	/** Lines above a model's download options in Discover Models. */
	modelNotices: ModelNotice;
	/** Components mounted once for the whole app, such as a dialog the extension opens itself. */
	overlays: Overlay;
	/** Prompts from somewhere other than the library, listed with the library's. */
	promptSources: PromptSource;
	/** Draws the attachments it claims, in place of the default attachment chip. */
	attachmentRenderers: AttachmentRenderer;
	/** Draws the messages it claims, in place of the default message. */
	messageRenderers: MessageRenderer;
	/** A connector's sign-in for the servers of its service. */
	serverAuth: ServerAuth;
	/** Skills from somewhere other than the machine's folders, listed with those in the Library. */
	skillSources: SkillSource;
	/** Actions under the extension's settings, each opening what it manages from Settings. */
	settingsActions: SettingsAction;
	/** Tools the model can call, listed and run by the extension. */
	tools: ToolProvider;
}

export type ExtensionPoint = keyof ExtensionPoints;

export type ExtensionState = 'inactive' | 'activating' | 'active' | 'failed';

/** An extension as the settings list shows it. */
export interface ExtensionStatus {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	state: ExtensionState;
	/** Why it failed to load or activate, when it did. */
	error: string | null;
}

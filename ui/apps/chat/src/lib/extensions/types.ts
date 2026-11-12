/**
 * The extension contract: what an extension is, and the points of the app it
 * can add to. Built-in features and, later, installed plugins go through the
 * same contract.
 */

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
	/** Runs around every agentic flow. */
	flow: FlowHook;
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

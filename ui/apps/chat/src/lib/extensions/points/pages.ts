import type { Component } from 'svelte';

/** A page of the extension, shown at `#/<path>` inside the app's layout. */
export interface ExtensionPage {
	/** Renders the whole page, heading included. */
	component: Component;
	/** One URL segment, e.g. `mcp-servers`. A route of the app itself with the same path wins. */
	path: string;
	/** Document title, shown before the app's name. */
	title: string;
}

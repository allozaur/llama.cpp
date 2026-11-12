import type { Component } from 'svelte';

/** Where a contributed item sits: `footer` is the sidebar's footer, right after Models. */
export type NavigationPlacement = 'footer';

/** A dialog the sidebar mounts for a navigation item and opens through its bindable `open`. */
export type NavigationDialog = Component<{ open?: boolean }, Record<string, never>, 'open'>;

/** An entry in the sidebar that opens a page of the extension, or a dialog where the screen has room for one. */
export interface NavigationItem {
	/** Opened on a desktop or tablet in place of the route. A phone always opens the route. */
	dialog?: NavigationDialog;
	icon: Component;
	/** Stable identity among the sidebar's items. */
	id: string;
	/** Key combination shown beside the label. A hint only: the sidebar does not bind it. */
	keys?: string[];
	placement: NavigationPlacement;
	/** Hash route of the extension's page the item opens, e.g. `#/mcp-servers`. The item is lit while that page shows. */
	route: string;
	/** The item's label, also what the search dialog lists it under. */
	tooltip: string;
}

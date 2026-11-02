import{p as et,f as U,s as h,a as d,d as at,e as p,n as _,t as v,b as o,g as n,q as N,k as nt,h as f,ax as z}from"./iframe-BxvSZK0j.js";import{c as rt,i as ot,d as it}from"./create-runtime-stories-DF7OwIoM.js";import{e as L}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";const st=`/*
 * Tier 3: component tokens. One group per component, pattern
 * [component]-[variant]-[property]-[state]. They point at semantic tokens only, so
 * light and dark come for free. Components read them as bg-(--token) and friends.
 */
:root {
	/* chat form: the main glass surface */
	--chat-form-background: var(--surface-glass);
	--chat-form-text: var(--fg-default);
	--chat-form-placeholder: var(--fg-muted);
	--chat-form-edge-side: var(--edge-rest-side);
	--chat-form-edge-mid: var(--edge-rest-mid);
	--chat-form-edge-side-focus: var(--edge-focus-side);
	--chat-form-edge-mid-focus: var(--edge-focus-mid);
	--chat-form-highlight: var(--highlight-inner);
	--chat-form-shadow: var(--elevation-surface);
	--chat-form-radius: var(--radius-surface);
	--chat-form-radius-compact: var(--radius-surface-lg);

	/* card: a resting glass panel */
	--card-background: var(--surface-glass);
	--card-text: var(--fg-default);
	--card-edge-side: var(--edge-rest-side);
	--card-edge-mid: var(--edge-rest-mid);
	--card-highlight: var(--highlight-inner);
	--card-shadow: var(--elevation-surface);
	--card-radius: var(--radius-card);

	/* sidebar: a large ambient glass panel whose edge stays put on focus */
	--sidebar-background: color-mix(in oklch, var(--surface-muted) 60%, transparent);
	--sidebar-edge-side: var(--edge-ambient-side);
	--sidebar-edge-mid: var(--edge-ambient-mid);
	--sidebar-highlight: transparent;
	--sidebar-shadow: var(--elevation-surface);
	--sidebar-radius: var(--radius-container);

	/* inset group: rows grouped inside a glass panel, e.g. the sidebar footer. A soft white on
	   the light glass, with the sidebar's own ambient edge and a faint shade under it, so it
	   reads as part of the panel rather than a button or a field */
	--inset-group-background: color-mix(in oklch, var(--surface-raised) 55%, transparent);
	--inset-group-edge-side: var(--edge-ambient-side);
	--inset-group-edge-mid: var(--edge-ambient-mid);
	--inset-group-shadow: 0 2px 8px -4px var(--black-a8);
	--inset-group-radius: var(--radius-card);

	/* selected row: the page a sidebar row opens is on. A tint of the text colour, under hover's,
	   with the inset group's edge and shade so it reads as picked out rather than hovered */
	--selected-row-background: color-mix(in oklch, var(--fg-default) 5%, transparent);

	/* user message bubble */
	--user-bubble-background: color-mix(in oklch, var(--action-primary) 5%, transparent);
	/* a uniform hairline only: no inner ring and no shadow, which read as a border */
	--user-bubble-edge: var(--edge-ambient-mid);
	--user-bubble-highlight: transparent;
	--user-bubble-shadow: none;
	--user-bubble-sheen-start: var(--sheen-start);
	--user-bubble-sheen-end: var(--sheen-end);

	/* floating panels: menus, popovers, select lists, hover cards, drawers, dialogs */
	--float-panel-background: color-mix(in oklch, var(--surface-raised) 86%, transparent);
	/* in light mode a translucent modal greys over the dimmed page, so it stays solid white */
	--float-panel-background-modal: var(--surface-raised);
	--float-panel-text: var(--fg-default);
	--float-panel-edge: var(--edge-raised);
	--float-panel-highlight: var(--highlight-inner);
	--float-panel-shadow: var(--elevation-raised);
	--float-panel-overlay: var(--surface-overlay);

	/* buttons */
	--button-primary-background: var(--action-primary);
	--button-primary-background-hover: var(--action-primary-hover);
	--button-primary-text: var(--fg-on-action);
	--button-primary-seam: color-mix(in oklch, var(--fg-on-action) 25%, transparent);
	--button-danger-background: var(--action-danger);
	--button-danger-background-hover: var(--action-danger-hover);
	--button-danger-text: var(--fg-on-danger);
	--button-danger-seam: color-mix(in oklch, var(--fg-on-danger) 25%, transparent);
	--button-secondary-background: var(--surface-glass);
	--button-secondary-background-hover: color-mix(in oklch, var(--surface-muted) 80%, transparent);
	--button-secondary-border: color-mix(in oklch, var(--line-default) 30%, transparent);
	--button-tertiary-background: var(--action-quiet);
	--button-tertiary-background-hover: var(--action-quiet-hover);
	--button-tertiary-border: var(--surface-muted);
	--button-ghost-background-hover: var(--action-ghost-hover);
	--button-outline-background: var(--field-background);
	--button-outline-border: var(--line-control);
	--button-text: var(--fg-default);
	--button-shadow: var(--elevation-control);

	/* toggles; the outline variant borrows the button outline */
	--toggle-background-hover: var(--action-ghost-hover);
	--toggle-background-on: var(--surface-selected);
	--toggle-text: var(--fg-default);

	/* toggle group: a row of keys like a secondary button; a pressed key turns white and sinks in */
	--toggle-group-background: var(--button-secondary-background);
	--toggle-group-border: var(--button-secondary-border);
	--toggle-group-seam: var(--line-control);
	--toggle-group-shadow: var(--elevation-control);
	--toggle-group-key-text: var(--fg-default);
	--toggle-group-key-text-muted: color-mix(in oklch, var(--fg-default) 70%, transparent);
	--toggle-group-key-background-hover: var(--action-ghost-hover);
	/* while a key is pressed, the others turn grey so the white one stands out */
	--toggle-group-key-background-idle: var(--surface-muted);
	--toggle-group-key-background-idle-hover: var(--surface-emphasis);
	--toggle-group-key-background-on: var(--surface-pressed);
	--toggle-group-key-shadow-on: var(--elevation-pressed);

	/* tabs: the segmented track, the active tab raised on it; the line variant underlines instead */
	--tabs-track: var(--surface-muted);
	--tabs-track-shadow: var(--elevation-inset);
	--tabs-text: color-mix(in oklch, var(--fg-default) 70%, transparent);
	--tabs-text-active: var(--fg-default);
	--tabs-background-active: var(--surface-lifted);
	--tabs-shadow-active: var(--elevation-control);
	--tabs-line-active: var(--fg-default);

	/* switch: the same recessed track and raised thumb; on, the track takes the primary colour */
	--switch-track: var(--surface-muted);
	--switch-track-on: var(--action-primary);
	--switch-track-shadow: var(--elevation-inset);
	--switch-thumb: var(--surface-lifted);
	--switch-thumb-on: var(--surface-lifted);
	--switch-thumb-shadow: var(--elevation-control);

	/* fields: input, textarea, checkbox */
	--input-background: var(--field-background);
	--input-text: var(--fg-default);
	--input-placeholder: var(--fg-muted);
	--input-border: var(--line-field);
	--input-border-focus: var(--line-focus);
	--input-border-invalid: var(--line-danger);
	--input-shadow: var(--elevation-inset);

	/* tooltips: the inverse of the page */
	--tooltip-background: var(--action-primary);
	--tooltip-text: var(--fg-on-action);
	--tooltip-highlight: var(--highlight-inverse);
	--tooltip-shadow: var(--elevation-tooltip);

	/* badges */
	--badge-primary-background: var(--action-primary);
	--badge-primary-background-hover: var(--action-primary-hover);
	--badge-primary-text: var(--fg-on-action);
	--badge-secondary-background: color-mix(in oklch, var(--fg-default) 15%, transparent);
	--badge-secondary-background-hover: color-mix(in oklch, var(--fg-default) 25%, transparent);
	--badge-danger-background: var(--fg-danger);
	--badge-danger-background-hover: color-mix(in oklch, var(--fg-danger) 90%, transparent);
	--badge-danger-text: var(--fg-on-danger);
	--badge-outline-border: var(--line-default);
	--badge-outline-background-hover: var(--surface-selected);
	--badge-text: var(--fg-default);
	--badge-highlight: var(--highlight-inner);

	/* status lamps and orbs read the status tokens through orb-danger and friends */
}

.dark {
	/* a raised fill would be darker than the dark glass: a faint tint of the text colour instead */
	--inset-group-background: color-mix(in oklch, var(--fg-default) 3%, transparent);
	--inset-group-shadow: 0 2px 8px -4px var(--black-a40);
	--selected-row-background: color-mix(in oklch, var(--fg-default) 5%, transparent);
	--button-secondary-background-hover: var(--surface-muted);
	--button-secondary-border: color-mix(in oklch, var(--line-default) 20%, transparent);
	--badge-secondary-background: color-mix(in oklch, var(--fg-default) 10%, transparent);
	--badge-danger-background: color-mix(in oklch, var(--fg-danger) 70%, transparent);
	--badge-danger-background-hover: var(--badge-danger-background);
	--toggle-group-key-background-idle: transparent;
	--toggle-group-key-background-idle-hover: var(--action-ghost-hover);
	/* on the near-white track the thumb stays dark and opaque */
	--switch-thumb-on: var(--surface-raised);
	--float-panel-background-modal: color-mix(in oklch, var(--surface-page) 86%, transparent);
}

/* the user bubble is a card with an even, very faint hairline and nothing else around it */
.chat-message-user-bubble {
	--card-edge-side: var(--user-bubble-edge);
	--card-edge-mid: var(--user-bubble-edge);
	--card-highlight: var(--user-bubble-highlight);
	--card-shadow: var(--user-bubble-shadow);
	/* a flat fill on the page: a backdrop blur only greys it */
	backdrop-filter: none;
}
`,lt=`/*
 * Tier 1: primitives. Raw values named by what they are, never by where they are used.
 * Only semantic tokens (semantic.css) reference these; components never do.
 */
:root {
	/* neutral greys: Tailwind's neutral scale plus four in-between steps */
	--neutral-0: oklch(1 0 0);
	--neutral-25: oklch(0.988 0 0);
	--neutral-50: oklch(0.985 0 0);
	--neutral-100: oklch(0.97 0 0);
	--neutral-150: oklch(0.95 0 0);
	--neutral-200: oklch(0.922 0 0);
	--neutral-300: oklch(0.87 0 0);
	--neutral-400: oklch(0.708 0 0);
	--neutral-500: oklch(0.556 0 0);
	--neutral-600: oklch(0.439 0 0);
	--neutral-700: oklch(0.371 0 0);
	--neutral-750: oklch(0.29 0 0);
	--neutral-800: oklch(0.269 0 0);
	--neutral-900: oklch(0.205 0 0);
	--neutral-925: oklch(0.16 0 0);
	--neutral-950: oklch(0.145 0 0);

	/* cool greys (hue 250) for hairline edges */
	--cool-gray-50: oklch(0.958 0.002 250);
	--cool-gray-100: oklch(0.938 0.004 250);
	--cool-gray-200: oklch(0.91 0.005 250);
	--cool-gray-300: oklch(0.86 0.007 250);
	--cool-gray-400: oklch(0.81 0.01 250);

	/* red, yellow and green: each scale keeps the hue of its root (red-500, yellow-400, green-500) */
	--red-400: oklch(0.69 0.2 27);
	--red-500: oklch(0.6 0.235 27);
	--red-600: oklch(0.55 0.22 27);
	--red-800: oklch(0.43 0.17 27);

	--yellow-300: oklch(0.9 0.14 84);
	--yellow-400: oklch(0.85 0.17 84);
	--yellow-800: oklch(0.5 0.1 84);

	--green-400: oklch(0.81 0.16 148);
	--green-500: oklch(0.73 0.2 148);
	--green-600: oklch(0.55 0.16 148);
	--green-800: oklch(0.45 0.14 148);

	/* translucent white and black, named by opacity in percent */
	--white-a2: oklch(1 0 0 / 0.02);
	--white-a4: oklch(1 0 0 / 0.04);
	--white-a6: oklch(1 0 0 / 0.06);
	--white-a9: oklch(1 0 0 / 0.09);
	--white-a12: oklch(1 0 0 / 0.12);
	--white-a18: oklch(1 0 0 / 0.18);
	--white-a20: oklch(1 0 0 / 0.2);
	--white-a30: oklch(1 0 0 / 0.3);
	--white-a40: oklch(1 0 0 / 0.4);
	--white-a50: oklch(1 0 0 / 0.5);
	--white-a85: oklch(1 0 0 / 0.85);
	--black-a6: oklch(0 0 0 / 0.06);
	--black-a8: oklch(0 0 0 / 0.08);
	--black-a10: oklch(0 0 0 / 0.1);
	--black-a12: oklch(0 0 0 / 0.12);
	--black-a18: oklch(0 0 0 / 0.18);
	--black-a25: oklch(0 0 0 / 0.25);
	--black-a30: oklch(0 0 0 / 0.3);
	--black-a35: oklch(0 0 0 / 0.35);
	--black-a40: oklch(0 0 0 / 0.4);
	--black-a55: oklch(0 0 0 / 0.55);
	--black-a60: oklch(0 0 0 / 0.6);

	/* type: sizes and line heights in px, weights by number */
	--font-size-12: 0.75rem;
	--font-size-14: 0.875rem;
	--font-size-16: 1rem;
	--font-size-18: 1.125rem;
	--font-size-24: 1.5rem;
	--line-height-16: 1rem;
	--line-height-20: 1.25rem;
	--line-height-24: 1.5rem;
	--line-height-28: 1.75rem;
	--line-height-32: 2rem;
	--font-weight-400: 400;
	--font-weight-500: 500;
	--font-weight-600: 600;

	/* lengths in px, for sizes, radii and blur */
	--length-6: 0.375rem;
	--length-8: 0.5rem;
	--length-10: 0.625rem;
	--length-12: 0.75rem;
	--length-14: 0.875rem;
	--length-16: 1rem;
	--length-20: 1.25rem;
	--length-24: 1.5rem;
	--length-32: 2rem;
	--length-36: 2.25rem;
	--length-40: 2.5rem;
}
`,ct=`/*
 * Tier 2: semantic tokens. Named by purpose, they point at primitives and are the
 * only tier that changes between light and dark. Pattern: [category]-[role]-[state].
 */
:root {
	/* surfaces: what a region of the page sits on. The page is a faint grey, so glass and
	   fields, white, sit lighter than it */
	--surface-page: var(--neutral-25);
	--surface-muted: var(--neutral-100);
	--surface-emphasis: var(--neutral-150);
	--surface-selected: var(--neutral-150);
	--surface-raised: var(--neutral-0);
	--surface-lifted: var(--neutral-0);
	--surface-pressed: var(--neutral-0);
	--surface-glass: color-mix(in oklch, var(--neutral-0) 80%, transparent);
	--surface-code: var(--neutral-100);
	--surface-overlay: var(--black-a40);

	/* foreground: text and icons */
	--fg-default: var(--neutral-950);
	--fg-muted: var(--neutral-500);
	--fg-on-action: var(--neutral-50);
	--fg-on-danger: var(--neutral-0);
	--fg-code: var(--neutral-950);
	--fg-danger: var(--red-600);
	--fg-success: var(--green-600);

	/* lines: borders, dividers and focus */
	--line-default: var(--neutral-300);
	--line-field: var(--neutral-200);
	--line-control: var(--neutral-300);
	--line-focus: var(--neutral-400);
	--line-danger: var(--red-600);

	/* edges: hairlines of matte surfaces, darker at the sides than in the middle */
	--edge-rest-side: var(--cool-gray-200);
	--edge-rest-mid: var(--cool-gray-100);
	--edge-focus-side: var(--cool-gray-400);
	--edge-focus-mid: var(--cool-gray-300);
	--edge-ambient-side: var(--cool-gray-100);
	--edge-ambient-mid: var(--cool-gray-50);
	--edge-faint: var(--cool-gray-100);
	--edge-raised: var(--cool-gray-200);

	/* actions: fills of interactive controls */
	--action-primary: var(--neutral-900);
	--action-primary-hover: color-mix(in oklch, var(--neutral-900) 90%, transparent);
	--action-danger: var(--red-600);
	--action-danger-hover: color-mix(in oklch, var(--red-600) 90%, transparent);
	--action-quiet: color-mix(in oklch, var(--neutral-100) 30%, transparent);
	--action-quiet-hover: var(--neutral-100);
	--action-ghost-hover: color-mix(in oklch, var(--neutral-500) 10%, transparent);

	/* fields: editable controls */
	--field-background: var(--neutral-0);
	--field-shade: var(--black-a6);

	/* status lamps: fill, lighter rim, darker glyph; the same in both modes */
	--status-danger: var(--red-500);
	--status-danger-rim: var(--red-400);
	--status-danger-glyph: var(--red-800);
	--status-warning: var(--yellow-400);
	--status-warning-rim: var(--yellow-300);
	--status-warning-glyph: var(--yellow-800);
	--status-success: var(--green-500);
	--status-success-rim: var(--green-400);
	--status-success-glyph: var(--green-800);

	/* light effects */
	--highlight-inner: var(--white-a50);
	--highlight-inverse: var(--white-a12);
	--sheen-start: var(--white-a20);
	--sheen-end: transparent;
	--text-shadow-engraved: 0 1px 0 var(--white-a85);

	/* elevation */
	--elevation-surface:
		0 1px 3px var(--black-a8), 0 1px 2px -1px var(--black-a6), 0 6px 16px -10px var(--black-a8);
	--elevation-control: 0 1px 3px var(--black-a10), 0 1px 2px -1px var(--black-a10);
	--elevation-raised: 0 1px 3px var(--black-a6), 0 12px 32px -12px var(--black-a18);
	--elevation-inset: inset 0 1px 2px var(--field-shade);
	--elevation-pressed: inset 0 1px 2px var(--black-a12);
	--elevation-tooltip: 0 4px 12px -4px var(--black-a30);
	--blur-surface: var(--length-24);
	--blur-control: var(--length-12);
}

.dark {
	--surface-page: var(--neutral-925);
	--surface-muted: var(--neutral-800);
	--surface-emphasis: var(--neutral-750);
	--surface-selected: var(--neutral-800);
	--surface-raised: var(--neutral-900);
	--surface-lifted: color-mix(in oklch, var(--neutral-700) 80%, transparent);
	--surface-pressed: color-mix(in oklch, var(--neutral-50) 14%, transparent);
	--surface-glass: color-mix(in oklch, var(--neutral-800) 75%, transparent);
	--surface-code: var(--neutral-900);

	--fg-default: var(--neutral-50);
	--fg-muted: var(--neutral-400);
	--fg-on-action: var(--neutral-900);
	--fg-code: var(--neutral-300);
	--fg-danger: var(--red-400);
	--fg-success: var(--green-400);

	--line-default: var(--white-a30);
	--line-field: var(--white-a30);
	--line-control: var(--white-a12);
	--line-focus: var(--neutral-500);
	--line-danger: var(--red-400);

	--edge-rest-side: var(--white-a6);
	--edge-rest-mid: var(--white-a4);
	--edge-focus-side: var(--white-a18);
	--edge-focus-mid: var(--white-a12);
	--edge-ambient-side: var(--white-a4);
	--edge-ambient-mid: var(--white-a2);
	--edge-faint: var(--white-a4);
	--edge-raised: var(--white-a9);

	--action-primary: var(--neutral-200);
	--action-primary-hover: color-mix(in oklch, var(--neutral-200) 90%, transparent);
	--action-danger: color-mix(in oklch, var(--red-400) 60%, transparent);
	/* the dark fill already wins over hover, so hover keeps it */
	--action-danger-hover: var(--action-danger);
	--action-quiet: color-mix(in oklch, var(--neutral-400) 15%, transparent);
	--action-quiet-hover: color-mix(in oklch, var(--neutral-400) 25%, transparent);
	--action-ghost-hover: color-mix(in oklch, var(--neutral-400) 10%, transparent);

	--field-background: var(--white-a9);
	--field-shade: var(--black-a30);

	--highlight-inner: var(--white-a4);
	--sheen-start: var(--white-a2);
	--text-shadow-engraved: 0 -1px 0 var(--black-a55);

	--elevation-surface:
		0 1px 3px var(--black-a30), 0 1px 2px -1px var(--black-a25), 0 6px 16px -10px var(--black-a35);
	--elevation-control: 0 1px 2px var(--black-a30);
	--elevation-raised: 0 1px 3px var(--black-a40), 0 16px 40px -12px var(--black-a60);
	--elevation-pressed: inset 0 1px 2px var(--black-a40);
}

/* roles that do not change with the theme, exposed as Tailwind utilities */
@theme inline {
	/* type roles: text-body, text-label-sm, ... set size, line height and weight */
	--text-body: var(--font-size-16);
	--text-body--line-height: var(--line-height-24);
	--text-body--font-weight: var(--font-weight-400);
	--text-body-sm: var(--font-size-14);
	--text-body-sm--line-height: var(--line-height-20);
	--text-body-sm--font-weight: var(--font-weight-400);
	--text-label: var(--font-size-14);
	--text-label--line-height: var(--line-height-20);
	--text-label--font-weight: var(--font-weight-500);
	--text-label-sm: var(--font-size-12);
	--text-label-sm--line-height: var(--line-height-16);
	--text-label-sm--font-weight: var(--font-weight-500);
	--text-caption: var(--font-size-12);
	--text-caption--line-height: var(--line-height-16);
	--text-caption--font-weight: var(--font-weight-400);
	--text-title: var(--font-size-18);
	--text-title--line-height: var(--line-height-28);
	--text-title--font-weight: var(--font-weight-600);
	--text-heading: var(--font-size-24);
	--text-heading--line-height: var(--line-height-32);
	--text-heading--font-weight: var(--font-weight-600);

	/* icon sizes: size-icon-xs ... size-icon-lg */
	--size-icon-xs: var(--length-12);
	--size-icon-sm: var(--length-14);
	--size-icon-md: var(--length-16);
	--size-icon-lg: var(--length-20);

	/* control heights and corner roles */
	--height-control-sm: var(--length-32);
	--height-control-md: var(--length-36);
	--height-control-lg: var(--length-40);
	--radius-control: var(--length-8);
	--radius-panel: var(--length-10);
	--radius-card: var(--length-14);
	--radius-container: var(--length-16);
	--radius-surface: var(--length-24);
	--radius-surface-lg: var(--length-32);

	/* colours: bg-surface-*, text-fg-*, border-line-* and border-edge-* */
	--background-color-surface-page: var(--surface-page);
	--background-color-surface-muted: var(--surface-muted);
	--background-color-surface-emphasis: var(--surface-emphasis);
	--background-color-surface-selected: var(--surface-selected);
	--background-color-surface-raised: var(--surface-raised);
	--background-color-surface-lifted: var(--surface-lifted);
	--background-color-surface-glass: var(--surface-glass);
	--background-color-surface-code: var(--surface-code);
	--background-color-surface-overlay: var(--surface-overlay);
	--text-color-fg-default: var(--fg-default);
	--text-color-fg-muted: var(--fg-muted);
	--text-color-fg-on-action: var(--fg-on-action);
	--text-color-fg-danger: var(--fg-danger);
	--text-color-fg-success: var(--fg-success);
	--border-color-line-default: var(--line-default);
	--border-color-line-field: var(--line-field);
	--border-color-line-control: var(--line-control);
	--border-color-line-focus: var(--line-focus);
	--border-color-line-danger: var(--line-danger);
	--color-status-danger: var(--status-danger);
	--color-status-warning: var(--status-warning);
	--color-status-success: var(--status-success);
}
`,dt=/oklch|color-mix|transparent|var\(--(neutral|cool-gray|red|yellow|green|white|black|surface|fg|line|edge|action|field|status|highlight|sheen|user-bubble|fg-danger)/,ht=/px|rem|var\(--(length|elevation|blur|radius|font|line-height)/;function M(e,r){const t=e.indexOf(`${r} {`);return t===-1?"":e.slice(t,e.indexOf(`
}`,t))}function gt(e){return new Map([...e.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(r=>[r[1],r[2].trim()]))}function O(e){const r=gt(M(e,".dark")),t=[];for(const i of M(e,":root").split(`
`)){const l=i.match(/^\t\/\* (.+?)(?::.*)? \*\/$/),a=i.match(/^\t--([a-z0-9-]+):\s*([^;]+);/);l?t.push({title:l[1],tokens:[]}):a&&dt.test(a[2])&&!ht.test(a[2])&&(t.length||t.push({title:"tokens",tokens:[]}),t[t.length-1].tokens.push({dark:r.get(a[1]),light:a[2],name:a[1]}))}return t.filter(i=>i.tokens.length)}const ut=O(lt),vt=O(ct),ft=O(st);function D(e){return e.replace(/color-mix\(in oklch, var\(--([a-z0-9-]+)\) (\d+)%, transparent\)/g,"$1 at $2%").replace(/var\(--([a-z0-9-]+)\)/g,"$1")}const $=(e,r=_,t=_,i=_)=>{var l=xt(),a=o(l),c=o(a),k=h(a,2);L(k,1,r,x=>x.title,(x,P)=>{var S=kt(),q=o(S),j=o(q),B=h(q,2);L(B,5,()=>n(P).tokens,w=>w.name,(w,s)=>{var G=bt(),R=o(G);let A;var H=h(R,2),E=o(H),I=o(E),J=h(E,2);{var K=g=>{var u=mt(),m=U(u),W=o(m),X=h(m,2);{var Y=b=>{var y=F(),Z=o(y);v(tt=>{z(y,"title",n(s).dark),f(Z,`dark: ${tt??""}`)},[()=>D(n(s).dark)]),d(b,y)};N(X,b=>{n(s).dark&&b(Y)})}v(b=>{z(m,"title",n(s).light),f(W,`light: ${b??""}`)},[()=>D(n(s).light)]),d(g,u)},Q=g=>{var u=F(),m=o(u);v(()=>{z(u,"title",n(s).light),f(m,n(s).light)}),d(g,u)};N(J,g=>{i()?g(K):g(Q,-1)})}v(()=>{A=nt(R,"",A,{"background-color":`var(--${n(s).name??""})`}),f(I,`--${n(s).name??""}`)}),d(w,G)}),v(()=>f(j,n(P).title)),d(x,S)}),v(()=>f(c,t())),d(e,l)},pt={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Design system/Foundations/Colors"},{Story:C}=it();var F=p('<span class="truncate text-fg-muted"> </span>'),mt=p('<span class="truncate text-fg-muted"> </span> <!>',1),bt=p('<figure class="m-0 flex flex-col gap-2"><div class="h-14 rounded-control border border-line-default"></div> <figcaption class="flex flex-col gap-0.5 font-mono text-[11px] leading-4"><span class="text-fg-default"> </span> <!></figcaption></figure>'),kt=p('<section><h2 class="mb-3 text-label text-fg-muted first-letter:uppercase"> </h2> <div class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4"></div></section>'),xt=p('<div class="w-[min(72rem,calc(100vw-2rem))] space-y-8 p-4"><p class="max-w-2xl text-body-sm text-fg-muted"> </p> <!></div>'),wt=p("<!> <!> <!>",1);function V(e,r){et(r,!1),ot();var t=wt(),i=U(t);C(i,{asChild:!0,name:"Primitives",children:(c,k)=>{$(c,()=>ut,()=>"Raw values named by what they are. Only semantic tokens point at these; components never use them directly.",()=>!1)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`{@render tier(
	primitiveGroups,
	'Raw values named by what they are. Only semantic tokens point at these; components never use them directly.',
	false
)}`}}});var l=h(i,2);C(l,{asChild:!0,name:"Semantic",children:(c,k)=>{$(c,()=>vt,()=>"Named by purpose. Each points at a primitive, and this is the only tier that changes between light and dark. Switch the theme to see the dark values.",()=>!0)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`{@render tier(
	semanticGroups,
	'Named by purpose. Each points at a primitive, and this is the only tier that changes between light and dark. Switch the theme to see the dark values.',
	true
)}`}}});var a=h(l,2);C(a,{asChild:!0,name:"Components",children:(c,k)=>{$(c,()=>ft,()=>"One group per component. They point at semantic tokens, so both themes follow automatically.",()=>!0)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`{@render tier(
	componentGroups,
	'One group per component. They point at semantic tokens, so both themes follow automatically.',
	true
)}`}}}),d(e,t),at()}V.__docgen={data:[],name:"Colors.stories.svelte"};const T=rt(V,pt),Ct=["Primitives","Semantic","Components"],Ot={...T.Primitives,tags:["svelte-csf-v5"]},Tt={...T.Semantic,tags:["svelte-csf-v5"]},Pt={...T.Components,tags:["svelte-csf-v5"]};export{Pt as Components,Ot as Primitives,Tt as Semantic,Ct as __namedExportsOrder,pt as default};

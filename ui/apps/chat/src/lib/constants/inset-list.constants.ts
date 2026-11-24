/**
 * Classes for the phone sheets' native-style inset lists (the add sheet, the settings sheet):
 * rounded groups of rows, each row an icon and a body whose divider starts at the label.
 */

/**
 * A round key in a sheet's top-left corner: close on the first page, back on the pages pushed over
 * it. It sits outside the header's flow, 1rem from the top edge and from the side, and a sheet's
 * title row lines up with its middle.
 */
export const SHEET_HEADER_BUTTON_CLASS =
	'matte-key absolute top-4 left-4 z-10 flex size-9 items-center justify-center rounded-full bg-background shadow-(--elevation-key) dark:bg-muted-foreground/15';

/**
 * A sheet with a corner key: its drag handle sits 0.5rem from the top, leaving the title, centered
 * on the key, clear of it. Its in-flow header takes SHEET_HEADER_CLASS, whose padding puts the
 * title's row there and the content 1.75rem below the title.
 */
export const SHEET_CONTENT_CLASS = '[&>div:first-child]:mt-2';
export const SHEET_HEADER_CLASS = 'grid shrink-0 items-center px-3 pt-2.5 pb-7';

/** A rounded group of rows. */
export const INSET_GROUP_CLASS = 'inset-group-surface flex flex-col overflow-hidden';

/** A group's title above it, set as the sidebar's section headings are on a phone. */
export const INSET_GROUP_TITLE_CLASS = 'px-4 text-body font-medium text-muted-foreground';

/** A note below a group. */
export const INSET_GROUP_CAPTION_CLASS = 'px-4 text-caption text-muted-foreground';

/** A row: tappable as a whole, its icon outside the divider, which stops short of both edges. */
export const INSET_ROW_CLASS =
	'group/row flex min-h-12 w-full items-center gap-3 px-4 text-left text-body transition-colors active:bg-(--surface-pressed) disabled:pointer-events-none disabled:opacity-50';

/** A row's body: the divider starts here, as in a native inset list, and is dropped on the first row. */
export const INSET_ROW_BODY_CLASS =
	'flex min-h-12 min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border/60 group-first/row:border-t-0';

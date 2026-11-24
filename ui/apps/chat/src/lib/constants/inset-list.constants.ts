/**
 * Names of the design system's utilities for the phone sheets' native-style inset lists (the
 * add sheet, the settings sheet, the model picker): rounded groups of rows, each row an icon and
 * a body whose divider starts at the label. They are defined in @ggml-org/llama-ui's surfaces.css.
 */

/**
 * A round key in a sheet's top-left corner: close on the first page, back on the pages pushed over
 * it. It sits outside the header's flow, 1rem from the top edge and from the side, and a sheet's
 * title row lines up with its middle.
 */
export const SHEET_HEADER_BUTTON_CLASS = 'sheet-key';

/**
 * A sheet with a corner key: its drag handle sits 0.5rem from the top, leaving the title, centered
 * on the key, clear of it. Its in-flow header takes SHEET_HEADER_CLASS, whose padding puts the
 * title's row there and the content 1.75rem below the title.
 */
export const SHEET_CONTENT_CLASS = '[&>div:first-child]:mt-2';
export const SHEET_HEADER_CLASS = 'grid shrink-0 items-center px-3 pt-2.5 pb-7';

/** A rounded group of rows. */
export const INSET_GROUP_CLASS = 'inset-list';

/** A group's title above it, set as the sidebar's section headings are on a phone. */
export const INSET_GROUP_TITLE_CLASS = 'inset-list-title';

/** A note below a group. */
export const INSET_GROUP_CAPTION_CLASS = 'inset-list-caption';

/** A row: tappable as a whole, its icon outside the divider, which stops short of both edges. */
export const INSET_ROW_CLASS = 'inset-list-row';

/** A row's body: the divider starts here, as in a native inset list, and is dropped on the first row. */
export const INSET_ROW_BODY_CLASS = 'inset-list-row-body';

import FileIcon from '@lucide/svelte/icons/file';
import AudioIcon from '@lucide/svelte/icons/file-headphone';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import ImageIcon from '@lucide/svelte/icons/image';
import VideoIcon from '@lucide/svelte/icons/video';
import { AttachmentType, LibraryTab } from '#lib/enums/index.ts';
import type { Component } from 'svelte';

/** The Library's tabs, in order. */
export const LIBRARY_TABS: { label: string; search: string; value: LibraryTab }[] = [
	{ label: 'Prompts', search: 'Search prompts', value: LibraryTab.PROMPTS },
	{ label: 'Attachments', search: 'Search attachments', value: LibraryTab.ATTACHMENTS }
];

/** The mark of a file in the Library's attachments, by its kind. */
export const LIBRARY_ATTACHMENT_ICONS: Partial<Record<AttachmentType, Component>> = {
	[AttachmentType.AUDIO]: AudioIcon,
	[AttachmentType.IMAGE]: ImageIcon,
	[AttachmentType.LEGACY_CONTEXT]: FileTextIcon,
	[AttachmentType.PDF]: FileIcon,
	[AttachmentType.TEXT]: FileTextIcon,
	[AttachmentType.VIDEO]: VideoIcon
};

/** Id of the library as a source of prompts. */
export const PROMPT_LIBRARY_SOURCE_ID = 'library';

/** How the library is named where a prompt's source shows. */
export const PROMPT_LIBRARY_LABEL = 'Library';

/** Id of the chat form's prompt picker, which `/prompt` opens. */
export const PROMPTS_PICKER_ID = 'prompts';

/** A prompt list this long gets a search field. */
export const PROMPT_SEARCH_MIN_ITEMS = 4;

export const PROMPT_NAME_MAX_LENGTH = 200;
export const PROMPT_DESCRIPTION_MAX_LENGTH = 300;

/** Messages read per page of the Library's attachments: enough to fill a screen. */
export const LIBRARY_ATTACHMENTS_PAGE_SIZE = 24;

/** The narrowest a column of the attachments grid gets, which sets how many fit. */
export const LIBRARY_ATTACHMENTS_COLUMN_MIN_WIDTH_PX = 220;

/** A phone still shows the files side by side. */
export const LIBRARY_ATTACHMENTS_MIN_COLUMNS = 2;

/** How long typing rests before the attachments are searched. */
export const LIBRARY_ATTACHMENTS_SEARCH_DEBOUNCE_MS = 200;

/** How much of a text attachment its tile shows. */
export const LIBRARY_TEXT_PREVIEW_CHARS = 600;

/** How far before the end of the grid the next page starts loading. */
export const LIBRARY_LOAD_MORE_MARGIN = '600px';

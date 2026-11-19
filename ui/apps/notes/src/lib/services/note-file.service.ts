import { MARKDOWN_FILE } from '#lib/constants/index.ts';
import type { OpenedFile } from '#lib/types/notes.ts';
import { isOpenableFile, noteTextFromFile } from '#lib/utils/markdown-file.ts';

// The parts of the File System Access API that TypeScript's DOM types leave out. Chromium
// on the desktop has them; elsewhere notes open from a file input and save as a download.
interface FilePickerOptions {
	multiple?: boolean;
	suggestedName?: string;
	types?: typeof MARKDOWN_FILE.PICKER_TYPES;
}

interface FileSystemAccessWindow {
	showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
	showSaveFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle>;
}

interface PermissionedFileHandle extends FileSystemFileHandle {
	queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
	requestPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
}

interface HandleDataTransferItem extends DataTransferItem {
	getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
}

/** Where a note was saved, or `null` when the person cancelled. */
export type SavedFile = { handle?: FileSystemFileHandle; name: string } | null;

const fileSystemAccess = () => window as unknown as FileSystemAccessWindow;

function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

async function readFile(file: File, handle?: FileSystemFileHandle): Promise<OpenedFile> {
	return { content: noteTextFromFile(await file.text()), handle, name: file.name };
}

/** Asks for files through a file input, which every browser has. */
function pickWithInput(): Promise<File[]> {
	return new Promise((resolve) => {
		const input = document.createElement('input');

		// no `accept` filter: iOS greys out, in its picker, a file type it maps to no type
		// identifier, so what is picked is checked afterwards instead
		input.type = 'file';
		input.multiple = true;
		input.addEventListener('change', () => resolve([...(input.files ?? [])]));
		input.addEventListener('cancel', () => resolve([]));
		input.click();
	});
}

async function writeToHandle(handle: PermissionedFileHandle, content: string): Promise<void> {
	// a handle kept from an earlier visit needs the person's say-so again
	if ((await handle.queryPermission?.({ mode: 'readwrite' })) === 'prompt') {
		await handle.requestPermission?.({ mode: 'readwrite' });
	}

	if ((await handle.queryPermission?.({ mode: 'readwrite' })) === 'denied') {
		throw new Error(`Llama Notes may not write ${handle.name}.`);
	}

	const writable = await handle.createWritable();

	await writable.write(content);
	await writable.close();
}

/** Hands the text over as a file: through the share sheet on a phone, a download elsewhere. */
async function exportFile(name: string, content: string): Promise<boolean> {
	const file = new File([content], name, { type: MARKDOWN_FILE.MIME_TYPE });

	if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file] });

			return true;
		} catch (error) {
			if (isAbort(error)) return false;

			throw error;
		}
	}

	const url = URL.createObjectURL(file);
	const link = document.createElement('a');

	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);

	return true;
}

/** Markdown files into and out of the browser. */
export const NoteFileService = {
	/** Whether a note can save back into the file it came from (File System Access). */
	canSaveInPlace(): boolean {
		return typeof fileSystemAccess().showSaveFilePicker === 'function';
	},

	/** The Markdown and text files among those dropped on the page. */
	async fromDrop(dataTransfer: DataTransfer): Promise<OpenedFile[]> {
		// the items only last as long as the event: take both views of each right away
		const items = [...dataTransfer.items]
			.filter((item) => item.kind === 'file')
			.map((item) => ({
				file: item.getAsFile(),
				handle: (item as HandleDataTransferItem).getAsFileSystemHandle?.()
			}));
		const opened: OpenedFile[] = [];

		for (const { file, handle } of items) {
			if (!file || !isOpenableFile(file)) continue;

			const fileHandle = await handle?.catch(() => null);

			opened.push(
				await readFile(
					file,
					fileHandle?.kind === 'file' ? (fileHandle as FileSystemFileHandle) : undefined
				)
			);
		}

		return opened;
	},

	/** Asks for Markdown files to open; none when the person cancels. */
	async open(): Promise<OpenedFile[]> {
		const { showOpenFilePicker } = fileSystemAccess();

		if (showOpenFilePicker) {
			try {
				const handles = await showOpenFilePicker({
					multiple: true,
					types: MARKDOWN_FILE.PICKER_TYPES
				});

				return Promise.all(handles.map(async (handle) => readFile(await handle.getFile(), handle)));
			} catch (error) {
				if (isAbort(error)) return [];

				throw error;
			}
		}

		const files = await pickWithInput();
		const openable = files.filter(isOpenableFile);

		if (files.length > 0 && openable.length === 0) {
			throw new Error('Choose a Markdown or text file.');
		}

		return Promise.all(openable.map((file) => readFile(file)));
	},

	/**
	 * Saves a note's text: into its file where the browser keeps one, else into a file the
	 * person picks (File System Access), else as a download or through the share sheet.
	 * `saveAs` always asks where.
	 */
	async save(
		content: string,
		{
			handle,
			name,
			saveAs = false
		}: { handle?: FileSystemFileHandle; name: string; saveAs?: boolean }
	): Promise<SavedFile> {
		if (handle && !saveAs) {
			await writeToHandle(handle, content);

			return { handle, name: handle.name };
		}

		const { showSaveFilePicker } = fileSystemAccess();

		if (showSaveFilePicker) {
			let picked: FileSystemFileHandle;

			try {
				picked = await showSaveFilePicker({
					suggestedName: name,
					types: MARKDOWN_FILE.PICKER_TYPES
				});
			} catch (error) {
				if (isAbort(error)) return null;

				throw error;
			}

			await writeToHandle(picked, content);

			return { handle: picked, name: picked.name };
		}

		return (await exportFile(name, content)) ? { name } : null;
	}
};

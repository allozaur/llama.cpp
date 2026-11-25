import { buildAgentImportConversation } from './agent-import.ts';
import { parseClaudeCodeSession } from './agent-import-claude-code.ts';
import { AGENT_IMPORT_SNIFF_BYTES } from '#lib/constants/agent-import.constants.ts';
import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';
import type { ExportedConversation } from '#lib/types/index.ts';

/** A picked file with its path in the picked folder (the file name when picked alone). */
export interface AgentImportFile {
	file: File;
	path: string;
}

const UUID_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

/**
 * Tells which app a file comes from, or null when it is not a session file. `path` is the
 * file name or its path in the picked folder; `head` is the start of the file, used when
 * the name does not tell.
 */
export function detectAgentImportSource(path: string, head = ''): AgentImportSource | null {
	const segments = path.split('/');
	const name = segments[segments.length - 1];

	// transcripts of subagents sit under <session>/subagents and are not chats of their own
	if (segments.includes('subagents')) return null;

	if (UUID_FILE.test(name)) return AgentImportSource.CLAUDE_CODE;

	if (name.endsWith('.jsonl') && head.includes('"sessionId"') && head.includes('"type"')) {
		return AgentImportSource.CLAUDE_CODE;
	}

	return null;
}

/** Parses one session file into conversations ready for the conversation import. */
export function parseAgentImportFile(text: string, fileName = ''): ExportedConversation[] {
	const session = parseClaudeCodeSession(text, fileName);
	const conversation = session && buildAgentImportConversation(session);

	return conversation ? [conversation] : [];
}

/** The browser can pick a folder. A phone browser cannot. */
export function canPickFolder(): boolean {
	return typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;
}

/** The files of a file or folder input. */
export function filesFromInput(list: FileList | null): AgentImportFile[] {
	return Array.from(list ?? []).map((file) => ({
		file,
		path: file.webkitRelativePath || file.name
	}));
}

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
	return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function filesFromEntry(entry: FileSystemEntry): Promise<AgentImportFile[]> {
	if (entry.isFile) {
		const file = await new Promise<File>((resolve, reject) =>
			(entry as FileSystemFileEntry).file(resolve, reject)
		);

		return [{ file, path: entry.fullPath.replace(/^\//, '') }];
	}

	const reader = (entry as FileSystemDirectoryEntry).createReader();
	const files: AgentImportFile[] = [];

	// readEntries gives the entries in chunks, an empty chunk ends the list
	for (let chunk = await readEntries(reader); chunk.length; chunk = await readEntries(reader)) {
		for (const child of chunk) files.push(...(await filesFromEntry(child)));
	}

	return files;
}

/** The files of a drop, with dropped folders read to the bottom. */
export async function filesFromDrop(transfer: DataTransfer | null): Promise<AgentImportFile[]> {
	// entries must be taken before the first await, the item list is emptied after the event
	const entries = Array.from(transfer?.items ?? [])
		.map((item) => item.webkitGetAsEntry?.())
		.filter((entry): entry is FileSystemEntry => !!entry);
	const files: AgentImportFile[] = [];

	for (const entry of entries) files.push(...(await filesFromEntry(entry)));

	return files;
}

/** Sorts files by the app they come from. Files of no known app are left out. */
export async function groupAgentImportFiles(
	files: AgentImportFile[]
): Promise<Map<AgentImportSource, AgentImportFile[]>> {
	const groups = new Map<AgentImportSource, AgentImportFile[]>();

	for (const entry of files) {
		let source = detectAgentImportSource(entry.path);

		// the name did not tell: look at the start of a JSONL file
		if (!source && /\.jsonl$/i.test(entry.path) && !entry.path.split('/').includes('subagents')) {
			const head = await entry.file.slice(0, AGENT_IMPORT_SNIFF_BYTES).text();

			source = detectAgentImportSource(entry.path, head);
		}

		if (source) groups.set(source, [...(groups.get(source) ?? []), entry]);
	}

	return groups;
}

/** "12 chat sessions". */
export function agentImportCountText(count: number): string {
	return `${count} chat session${count === 1 ? '' : 's'}`;
}

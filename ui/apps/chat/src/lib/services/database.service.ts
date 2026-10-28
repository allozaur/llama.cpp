/**
 * DatabaseService - persistence for conversations, messages, groups, projects
 * and prompts
 *
 * Applies the tree rules (branching, forks, reparenting, cascading deletes)
 * on top of a row-level StorageBackend, IndexedDB by default. No reactive
 * state; consumed by conversationsStore, groupsStore, projectsStore, the
 * prompt library and the chat flows.
 */

import { IdbBackend } from './idb-backend';
import { IDXDB_TABLES } from '$lib/constants';
import { MessageRole } from '$lib/enums';
import type {
	DatabaseMessageExtra,
	DatabasePrompt,
	ExportedConversation,
	StorageBackend
} from '$lib/types/database';
import type { Group } from '$lib/types/groups';
import type { Project } from '$lib/types/projects';
import {
	buildForkedConversation,
	collectForkDescendantIds,
	findDescendantMessages,
	groupMessagesByConversation,
	reparentDirectForks,
	uuid
} from '$lib/utils';

const backend: StorageBackend = new IdbBackend();

export class DatabaseService {
	/**
	 * Deletes multiple conversations in a single transaction. Each deleted
	 * conversation has its direct children reparented to the nearest surviving
	 * ancestor (or promoted to top-level). Children also in `ids` are dropped
	 * entirely rather than reparented.
	 *
	 * @param ids - Conversation IDs to delete
	 */
	static async bulkDeleteConversations(ids: string[]): Promise<void> {
		const cleanIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);

		if (cleanIds.length === 0) return;

		const idSet = new Set(cleanIds);

		await backend.transaction(async () => {
			const conversations = await backend.listConversations();

			for (const id of cleanIds) {
				const updates = reparentDirectForks(conversations, id, idSet);

				if (updates.length > 0) await backend.putConversations(updates);
			}

			await backend.deleteConversations(cleanIds);
		});
	}

	/**
	 * Toggles the pinned status of each conversation in `ids` inside a single
	 * transaction. Treats `pinned === undefined` as `false`, matching the
	 * semantics of {@link toggleConversationPin} where `!undefined` evaluates
	 * to `true`. Returns the resulting pinned state for every id that was
	 * updated; missing ids are omitted from the map.
	 *
	 * @param ids - Conversation IDs to toggle
	 * @returns Map of id -> new pinned state
	 */
	static async bulkToggleConversationPins(ids: string[]): Promise<Map<string, boolean>> {
		const cleanIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
		const result = new Map<string, boolean>();

		if (cleanIds.length === 0) return result;

		await backend.transaction(async () => {
			const convs = await backend.getConversations(cleanIds);
			const updates: DatabaseConversation[] = [];

			for (let i = 0; i < cleanIds.length; i++) {
				const conv = convs[i];

				if (!conv) continue;

				const newPinned = !conv.pinned;

				updates.push({ ...conv, pinned: newPinned });
				result.set(cleanIds[i], newPinned);
			}

			if (updates.length === 0) return;

			await backend.putConversations(updates);
		});

		return result;
	}

	/**
	 * Creates a new conversation.
	 *
	 * @param name - Name of the conversation
	 * @param fields - Optional extra fields (e.g. reasoningEffort)
	 * @returns The created conversation
	 */
	static async createConversation(
		name: string,
		fields?: Partial<Omit<DatabaseConversation, 'id' | 'name' | 'lastModified'>>
	): Promise<DatabaseConversation> {
		const conversation: DatabaseConversation = {
			currNode: '',
			id: uuid(),
			lastModified: Date.now(),
			name,
			...fields
		};

		await backend.addConversation(conversation);

		return conversation;
	}

	/**
	 * Creates a new group.
	 *
	 * @returns The created group
	 */
	static async createGroup(group: Group): Promise<Group> {
		await backend.addRecord(IDXDB_TABLES.groups, group);

		return group;
	}

	/**
	 * Creates a new message branch by adding a message and updating parent/child relationships.
	 * Also updates the conversation's currNode to point to the new message.
	 *
	 * @param message - Message to add (without id)
	 * @param parentId - Parent message ID to attach to
	 * @returns The created message
	 */
	static async createMessageBranch(
		message: Omit<DatabaseMessage, 'id'>,
		parentId: string | null
	): Promise<DatabaseMessage> {
		return await backend.transaction(async () => {
			// Handle null parent (root message case)
			if (parentId !== null) {
				const parentMessage = await backend.getMessage(parentId);

				if (!parentMessage) {
					throw new Error(`Parent message ${parentId} not found`);
				}
			}

			const newMessage: DatabaseMessage = {
				...message,
				children: [],
				id: uuid(),
				parent: parentId,
				toolCalls: message.toolCalls ?? ''
			};

			await backend.addMessages([newMessage]);

			// Update parent's children array if parent exists
			if (parentId !== null) {
				await this.addChildToParent(parentId, newMessage.id);
			}

			await this.updateConversation(message.convId, {
				currNode: newMessage.id
			});

			return newMessage;
		});
	}

	/**
	 * Creates a new project.
	 *
	 * @returns The created project
	 */
	static async createProject(project: Project): Promise<Project> {
		await backend.addRecord(IDXDB_TABLES.projects, project);

		return project;
	}

	/**
	 * Creates a prompt in the library.
	 *
	 * @returns The created prompt
	 */
	static async createPrompt(prompt: DatabasePrompt): Promise<DatabasePrompt> {
		await backend.addRecord(IDXDB_TABLES.prompts, prompt);

		return prompt;
	}

	/**
	 * Creates a root message for a new conversation.
	 * Root messages are not displayed but serve as the tree root for branching.
	 *
	 * @param convId - Conversation ID
	 * @returns The created root message
	 */
	static async createRootMessage(convId: string): Promise<string> {
		const rootMessage: DatabaseMessage = {
			children: [],
			content: '',
			convId,
			id: uuid(),
			parent: null,
			role: MessageRole.SYSTEM,
			timestamp: Date.now(),
			toolCalls: '',
			type: 'root'
		};

		await backend.addMessages([rootMessage]);

		return rootMessage.id;
	}

	/**
	 * Creates a system prompt message for a conversation.
	 *
	 * @param convId - Conversation ID
	 * @param systemPrompt - The system prompt content (must be non-empty)
	 * @param parentId - Parent message ID (typically the root message)
	 * @returns The created system message
	 * @throws Error if systemPrompt is empty or the parent message does not exist
	 */
	static async createSystemMessage(
		convId: string,
		systemPrompt: string,
		parentId: string,
		extra?: DatabaseMessageExtra[]
	): Promise<DatabaseMessage> {
		const trimmedPrompt = systemPrompt.trim();

		if (!trimmedPrompt) {
			throw new Error('Cannot create system message with empty content');
		}

		return await backend.transaction(async () => {
			const parentMessage = await backend.getMessage(parentId);

			if (!parentMessage) {
				throw new Error(`Parent message ${parentId} not found`);
			}

			const systemMessage: DatabaseMessage = {
				children: [],
				content: trimmedPrompt,
				convId,
				extra,
				id: uuid(),
				parent: parentId,
				role: MessageRole.SYSTEM,
				timestamp: Date.now(),
				type: MessageRole.SYSTEM
			};

			await backend.addMessages([systemMessage]);
			await this.addChildToParent(parentId, systemMessage.id);

			return systemMessage;
		});
	}

	/**
	 * Deletes a conversation and all its messages.
	 *
	 * @param id - Conversation ID
	 */
	static async deleteConversation(
		id: string,
		options?: { deleteWithForks?: boolean }
	): Promise<void> {
		await backend.transaction(async () => {
			const conversations = await backend.listConversations();

			if (options?.deleteWithForks) {
				await backend.deleteConversations(collectForkDescendantIds(conversations, id));
			} else {
				const updates = reparentDirectForks(conversations, id);

				if (updates.length > 0) await backend.putConversations(updates);
			}

			await backend.deleteConversations([id]);
		});
	}

	/**
	 * Deletes a group. Its conversations and projects stay, out of any group.
	 *
	 * @param id - Group ID
	 */
	static async deleteGroup(id: string): Promise<void> {
		await backend.transaction(async () => {
			await backend.deleteRecord(IDXDB_TABLES.groups, id);

			for (const conv of await backend.listConversations()) {
				if (conv.groupId === id) await backend.updateConversation(conv.id, { groupId: undefined });
			}

			for (const project of await backend.listRecords(IDXDB_TABLES.projects)) {
				if (project.groupId === id) {
					await backend.updateRecord(IDXDB_TABLES.projects, project.id, { groupId: undefined });
				}
			}
		});
	}

	/**
	 * Deletes a message and removes it from its parent's children array.
	 *
	 * @param messageId - ID of the message to delete
	 */
	static async deleteMessage(messageId: string): Promise<void> {
		await backend.transaction(async () => {
			const message = await backend.getMessage(messageId);

			if (!message) return;

			await this.removeChildFromParent(messageId);

			await backend.deleteMessages([messageId]);
		});
	}

	/**
	 * Deletes a message and all its descendant messages (cascading deletion).
	 * This removes the entire branch starting from the specified message.
	 *
	 * @param conversationId - ID of the conversation containing the message
	 * @param messageId - ID of the root message to delete (along with all descendants)
	 * @returns Array of all deleted message IDs
	 */
	static async deleteMessageCascading(
		conversationId: string,
		messageId: string
	): Promise<string[]> {
		return await backend.transaction(async () => {
			// Get all messages in the conversation to find descendants
			const allMessages = await backend.getMessages([conversationId]);
			const descendants = findDescendantMessages(allMessages, messageId);
			const allToDelete = [messageId, ...descendants];

			await this.removeChildFromParent(messageId);

			// Delete all messages in the branch
			await backend.deleteMessages(allToDelete);

			return allToDelete;
		});
	}

	/**
	 * Deletes a project. Its conversations are kept: they are not owned by the project.
	 *
	 * @param id - Project ID
	 */
	static async deleteProject(id: string): Promise<void> {
		await backend.deleteRecord(IDXDB_TABLES.projects, id);
	}

	/**
	 * Deletes a prompt from the library. Messages linked to it keep their content.
	 *
	 * @param id - Prompt ID
	 */
	static async deletePrompt(id: string): Promise<void> {
		await backend.deleteRecord(IDXDB_TABLES.prompts, id);
	}

	/**
	 * Forks a conversation at a specific message, creating a new conversation
	 * containing all messages from the root up to (and including) the target message.
	 *
	 * @param sourceConvId - The source conversation ID
	 * @param atMessageId - The message ID to fork at (the new conversation ends here)
	 * @param options - Fork options (name and whether to include attachments)
	 * @returns The newly created conversation
	 */
	static async forkConversation(
		sourceConvId: string,
		atMessageId: string,
		options: { name: string; includeAttachments: boolean }
	): Promise<DatabaseConversation> {
		return await backend.transaction(async () => {
			const [sourceConv] = await backend.getConversations([sourceConvId]);

			if (!sourceConv) {
				throw new Error(`Source conversation ${sourceConvId} not found`);
			}

			const allMessages = await backend.getMessages([sourceConvId]);
			const fork = buildForkedConversation(sourceConv, allMessages, atMessageId, options);

			await backend.addConversation(fork.conv);
			await backend.addMessages(fork.messages);

			return fork.conv;
		});
	}

	/**
	 * Gets all conversations, sorted by last modified time (newest first).
	 *
	 * @returns Array of conversations
	 */
	static async getAllConversations(): Promise<DatabaseConversation[]> {
		return await backend.listConversations();
	}

	/**
	 * Gets all groups, newest first by creation, the order new ones join the
	 * loaded list in, so a rename does not move a group on the next load.
	 *
	 * @returns Array of groups
	 */
	static async getAllGroups(): Promise<Group[]> {
		const groups = await backend.listRecords(IDXDB_TABLES.groups);

		return groups.sort((a, b) => b.createdAt - a.createdAt);
	}

	/**
	 * Gets all projects, sorted by last update time (newest first).
	 *
	 * @returns Array of projects
	 */
	static async getAllProjects(): Promise<Project[]> {
		const projects = await backend.listRecords(IDXDB_TABLES.projects);

		return projects.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	/**
	 * Gets all prompts in the library, most recently edited first.
	 *
	 * @returns Array of prompts
	 */
	static async getAllPrompts(): Promise<DatabasePrompt[]> {
		const prompts = await backend.listRecords(IDXDB_TABLES.prompts);

		return prompts.sort((a, b) => b.lastModified - a.lastModified);
	}

	/**
	 * Gets a conversation by ID.
	 *
	 * @param id - Conversation ID
	 * @returns The conversation if found, otherwise undefined
	 */
	static async getConversation(id: string): Promise<DatabaseConversation | undefined> {
		const [conv] = await backend.getConversations([id]);

		return conv;
	}

	/**
	 * Gets all messages in a conversation, sorted by timestamp (oldest first).
	 *
	 * @param convId - Conversation ID
	 * @returns Array of messages in the conversation
	 */
	static async getConversationMessages(convId: string): Promise<DatabaseMessage[]> {
		const messages = await backend.getMessages([convId]);

		return messages.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Loads multiple conversations with all of their messages in two bulk
	 * reads. Missing conversations are silently omitted from the result.
	 *
	 * @param convIds - Conversation IDs to load
	 * @returns Map of id -> { conv, messages }. Messages are sorted ascending by timestamp.
	 */
	static async getConversationsWithMessages(
		convIds: string[]
	): Promise<Map<string, ExportedConversation>> {
		const result = new Map<string, ExportedConversation>();
		const cleanIds = convIds.filter((id): id is string => typeof id === 'string' && id.length > 0);

		if (cleanIds.length === 0) return result;

		const [convs, allMessages] = await Promise.all([
			backend.getConversations(cleanIds),
			backend.getMessages(cleanIds)
		]);
		const messagesByConv = groupMessagesByConversation(allMessages);

		for (const conv of convs) {
			if (!conv) continue;

			result.set(conv.id, { conv, messages: messagesByConv.get(conv.id) ?? [] });
		}

		return result;
	}

	/**
	 * Imports multiple conversations and their messages.
	 * Skips conversations that already exist.
	 *
	 * @param data - Array of { conv, messages } objects
	 * @returns The conversations written to the database and the ones skipped
	 */
	static async importConversations(
		data: ExportedConversation[]
	): Promise<{ imported: DatabaseConversation[]; skipped: DatabaseConversation[] }> {
		const imported: DatabaseConversation[] = [];
		const skipped: DatabaseConversation[] = [];

		return await backend.transaction(async () => {
			for (const item of data) {
				const { messages } = item;
				const [existing] = await backend.getConversations([item.conv.id]);

				if (existing) {
					skipped.push(item.conv);

					continue;
				}

				const conv = { ...item.conv };
				const groupId = await DatabaseService.importGroup(item);

				if (groupId) conv.groupId = groupId;
				else delete conv.groupId;

				await backend.addConversation(conv);
				await backend.putMessages(messages);

				imported.push(conv);
			}

			return { imported, skipped };
		});
	}

	/**
	 * Puts conversations into a group, or out of any group when `groupId` is null.
	 * A conversation that joins a group is unpinned.
	 *
	 * @param ids - Conversation IDs
	 * @param groupId - Target group, null to take them out of their group
	 */
	static async setConversationsGroup(ids: string[], groupId: string | null): Promise<void> {
		await backend.transaction(async () => {
			for (const conversation of await backend.getConversations(ids)) {
				if (!conversation) continue;

				if (!groupId) {
					await backend.updateConversation(conversation.id, { groupId: undefined });

					continue;
				}

				await backend.updateConversation(
					conversation.id,
					conversation.pinned ? { groupId, pinned: false } : { groupId }
				);
			}
		});
	}

	/**
	 * Toggles the pinned status of a conversation.
	 *
	 * @param id - Conversation ID
	 * @returns The new pinned status
	 */
	static async toggleConversationPin(id: string): Promise<boolean> {
		const conversation = await this.getConversation(id);

		if (!conversation) {
			throw new Error(`Conversation ${id} not found`);
		}

		const newPinnedState = !conversation.pinned;

		await this.updateConversation(id, { pinned: newPinnedState });

		return newPinnedState;
	}

	/**
	 * Updates a conversation. `lastModified` is never stamped implicitly;
	 * pass it in `updates` to bump the conversation in recency ordering.
	 *
	 * @param id - Conversation ID
	 * @param updates - Partial updates to apply
	 * @returns Promise that resolves when the conversation is updated
	 */
	static async updateConversation(
		id: string,
		updates: Partial<Omit<DatabaseConversation, 'id'>>
	): Promise<void> {
		await backend.updateConversation(id, updates);
	}

	/**
	 * Updates the conversation's current node (active branch).
	 * This determines which conversation path is currently being viewed.
	 *
	 * @param convId - Conversation ID
	 * @param nodeId - Message ID to set as current node
	 */
	static async updateCurrentNode(convId: string, nodeId: string): Promise<void> {
		await this.updateConversation(convId, {
			currNode: nodeId
		});
	}

	/**
	 * Updates a group. `updatedAt` is never stamped implicitly; pass it in
	 * `updates` to bump the group in recency ordering.
	 *
	 * @param id - Group ID
	 * @param updates - Partial group data to update
	 */
	static async updateGroup(id: string, updates: Partial<Omit<Group, 'id'>>): Promise<void> {
		await backend.updateRecord(IDXDB_TABLES.groups, id, updates);
	}

	/**
	 * Updates a message.
	 *
	 * @param id - Message ID
	 * @param updates - Partial updates to apply
	 * @returns Promise that resolves when the message is updated
	 */
	static async updateMessage(
		id: string,
		updates: Partial<Omit<DatabaseMessage, 'id'>>
	): Promise<void> {
		await backend.updateMessage(id, updates);
	}

	/**
	 * Updates a project. `updatedAt` is never stamped implicitly; pass it in
	 * `updates` to bump the project in recency ordering.
	 *
	 * @param id - Project ID
	 * @param updates - Partial updates to apply
	 */
	static async updateProject(id: string, updates: Partial<Omit<Project, 'id'>>): Promise<void> {
		await backend.updateRecord(IDXDB_TABLES.projects, id, updates);
	}

	/**
	 * Updates a prompt in the library.
	 *
	 * @param id - Prompt ID
	 * @param updates - Partial updates to apply
	 */
	static async updatePrompt(
		id: string,
		updates: Partial<Omit<DatabasePrompt, 'id'>>
	): Promise<void> {
		await backend.updateRecord(IDXDB_TABLES.prompts, id, updates);
	}

	/**
	 * Appends a child id to a parent message's children array.
	 */
	private static async addChildToParent(parentId: string, childId: string): Promise<void> {
		const parent = await backend.getMessage(parentId);

		if (!parent) return;

		await backend.updateMessage(parentId, {
			children: [...parent.children, childId]
		});
	}

	/**
	 * Finds the group an imported conversation goes into: the group of the same
	 * id, else one of the same name, else a new one named after the file's. A
	 * conversation whose group the file does not carry keeps it only if it exists.
	 * Runs inside the import transaction.
	 *
	 * @returns The group id, or undefined for none
	 */
	private static async importGroup(item: ExportedConversation): Promise<string | undefined> {
		const groups = await backend.listRecords(IDXDB_TABLES.groups);

		if (!item.group) {
			const { groupId } = item.conv;

			return groupId && groups.some((group) => group.id === groupId) ? groupId : undefined;
		}

		const { id, name } = item.group;

		if (groups.some((group) => group.id === id)) return id;

		// of several groups with the name, the first by id, as the name index gave them
		const [sameName] = groups
			.filter((group) => group.name === name)
			.sort((a, b) => a.id.localeCompare(b.id));

		if (sameName) return sameName.id;

		const now = Date.now();

		await backend.addRecord(IDXDB_TABLES.groups, { createdAt: now, id, name, updatedAt: now });

		return id;
	}

	/**
	 * Removes a child id from its parent message's children array.
	 */
	private static async removeChildFromParent(messageId: string): Promise<void> {
		const message = await backend.getMessage(messageId);

		if (!message?.parent) return;

		const parent = await backend.getMessage(message.parent);

		if (!parent) return;

		parent.children = parent.children.filter((childId: string) => childId !== messageId);
		await backend.putMessages([parent]);
	}
}

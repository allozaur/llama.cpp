/**
 * Which skills the user approved, each bound to what the skill held at that moment.
 *
 * An approval is kept under the app's own id for the server and the skill's URI, with the
 * digest set of the skill's entry: every file's URI and digest. An entry with another set
 * (a file changed, was added or removed) is not approved, so the user is asked again.
 * Plain data and no app in it: the caller gives the storage.
 */

import type { Skill } from '@modelcontextprotocol/client/ext/skills';

/** Server id, then skill URI, then the digest set approved for it. */
export type SkillApprovalRecords = Record<string, Record<string, string[]>>;

export interface SkillApprovalStorage {
	load(): SkillApprovalRecords;
	save(records: SkillApprovalRecords): void;
}

/** Between a file's URI and its digest. A URI holds no space, so the two cannot run together. */
const DIGEST_SET_SEPARATOR = ' ';

/**
 * The digest set of a skill's entry, in one fixed order. Null for a skill that publishes
 * no digests: there is nothing to bind an approval to.
 */
export function skillDigestSet(skill: Skill): string[] | null {
	if (!Array.isArray(skill.resources)) return null;

	return skill.resources.map(({ digest, uri }) => `${uri}${DIGEST_SET_SEPARATOR}${digest}`).sort();
}

export class SkillApprovals {
	private records: SkillApprovalRecords;

	/** Remember the skill as approved with the files it has now. */
	approve(serverId: string, skill: Skill): void {
		const digests = skillDigestSet(skill);

		if (!digests) return;

		this.records = {
			...this.records,
			[serverId]: { ...this.records[serverId], [skill.uri]: digests }
		};
		this.storage.save(this.records);
	}

	constructor(private storage: SkillApprovalStorage) {
		this.records = storage.load();
	}

	/** Drop every approval of a server, e.g. when the user removes it. */
	forgetServer(serverId: string): void {
		if (!(serverId in this.records)) return;

		const { [serverId]: _removed, ...rest } = this.records;

		this.records = rest;
		this.storage.save(this.records);
	}

	/** Approved before, with other files than it has now. */
	hasChanged(serverId: string, skill: Skill): boolean {
		return this.records[serverId]?.[skill.uri] !== undefined && !this.isApproved(serverId, skill);
	}

	isApproved(serverId: string, skill: Skill): boolean {
		const approved = this.records[serverId]?.[skill.uri];
		const digests = skillDigestSet(skill);

		if (!approved || !digests || approved.length !== digests.length) return false;

		return approved.every((entry, index) => entry === digests[index]);
	}
}

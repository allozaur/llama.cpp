// An approval of a skill is bound to the files the skill had when the user gave
// it: the app's id of the server, the skill's URI, and every file's digest.

import type { Skill } from '@modelcontextprotocol/client/ext/skills';
import {
	type SkillApprovalRecords,
	SkillApprovals,
	type SkillApprovalStorage,
	skillDigestSet
} from '#lib/extensions/mcp/skills/approvals.ts';
import { describe, expect, it } from 'vitest';

const DIGEST_A = `sha256:${'a'.repeat(64)}`;
const DIGEST_B = `sha256:${'b'.repeat(64)}`;
const DIGEST_C = `sha256:${'c'.repeat(64)}`;
const SKILL_URI = 'skill://refunds/SKILL.md';
const GUIDE_URI = 'skill://refunds/references/guide.md';

function skill(resources: Skill['resources']): Skill {
	return {
		frontmatter: { description: 'Process refund requests', name: 'refunds' },
		resources,
		uri: SKILL_URI
	};
}

const REFUNDS = skill([
	{ digest: DIGEST_A, size: 120, uri: SKILL_URI },
	{ digest: DIGEST_B, size: 40, uri: GUIDE_URI }
]);

/** A storage that keeps what was saved, as a browser would across reloads. */
function memoryStorage(initial: SkillApprovalRecords = {}) {
	let saved = initial;

	const storage: SkillApprovalStorage = {
		load: () => saved,
		save: (records) => (saved = records)
	};

	return { saved: () => saved, storage };
}

describe('skill approvals', () => {
	it('approves nothing until the user does', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);

		expect(approvals.isApproved('srv-1', REFUNDS)).toBe(false);
		expect(approvals.hasChanged('srv-1', REFUNDS)).toBe(false);
	});

	it('keeps an approval for the same files, in whatever order the server lists them', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);

		approvals.approve('srv-1', REFUNDS);

		expect(approvals.isApproved('srv-1', REFUNDS)).toBe(true);
		expect(
			approvals.isApproved(
				'srv-1',
				skill([
					{ digest: DIGEST_B, size: 40, uri: GUIDE_URI },
					{ digest: DIGEST_A, size: 120, uri: SKILL_URI }
				])
			)
		).toBe(true);
	});

	it('revokes an approval when a file changed, was added or was removed', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);

		approvals.approve('srv-1', REFUNDS);

		const rotated = skill([
			{ digest: DIGEST_A, size: 120, uri: SKILL_URI },
			{ digest: DIGEST_C, size: 40, uri: GUIDE_URI }
		]);
		const added = skill([
			{ digest: DIGEST_A, size: 120, uri: SKILL_URI },
			{ digest: DIGEST_B, size: 40, uri: GUIDE_URI },
			{ digest: DIGEST_C, size: 9, uri: 'skill://refunds/scripts/run.sh' }
		]);
		const removed = skill([{ digest: DIGEST_A, size: 120, uri: SKILL_URI }]);

		for (const changed of [rotated, added, removed]) {
			expect(approvals.isApproved('srv-1', changed)).toBe(false);
			expect(approvals.hasChanged('srv-1', changed)).toBe(true);
		}

		// the files the user approved are still approved
		expect(approvals.isApproved('srv-1', REFUNDS)).toBe(true);
	});

	it('approves the changed skill anew, in place of the old files', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);
		const changed = skill([{ digest: DIGEST_C, size: 130, uri: SKILL_URI }]);

		approvals.approve('srv-1', REFUNDS);
		approvals.approve('srv-1', changed);

		expect(approvals.isApproved('srv-1', changed)).toBe(true);
		expect(approvals.isApproved('srv-1', REFUNDS)).toBe(false);
	});

	it('keeps the same skill URI of two servers apart', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);

		approvals.approve('srv-1', REFUNDS);

		expect(approvals.isApproved('srv-2', REFUNDS)).toBe(false);
		expect(approvals.hasChanged('srv-2', REFUNDS)).toBe(false);
	});

	it('never approves a skill that publishes no digests', () => {
		const approvals = new SkillApprovals(memoryStorage().storage);
		const dynamic = skill('dynamic');

		approvals.approve('srv-1', dynamic);

		expect(skillDigestSet(dynamic)).toBeNull();
		expect(approvals.isApproved('srv-1', dynamic)).toBe(false);
	});

	it('saves every approval and reads them back', () => {
		const { saved, storage } = memoryStorage();

		new SkillApprovals(storage).approve('srv-1', REFUNDS);

		expect(saved()).toEqual({
			'srv-1': { [SKILL_URI]: [`${SKILL_URI} ${DIGEST_A}`, `${GUIDE_URI} ${DIGEST_B}`] }
		});
		expect(new SkillApprovals(storage).isApproved('srv-1', REFUNDS)).toBe(true);
	});

	it('forgets a server with all its approvals', () => {
		const { saved, storage } = memoryStorage();
		const approvals = new SkillApprovals(storage);

		approvals.approve('srv-1', REFUNDS);
		approvals.approve('srv-2', REFUNDS);
		approvals.forgetServer('srv-1');

		expect(approvals.isApproved('srv-1', REFUNDS)).toBe(false);
		expect(approvals.isApproved('srv-2', REFUNDS)).toBe(true);
		expect(Object.keys(saved())).toEqual(['srv-2']);
	});
});

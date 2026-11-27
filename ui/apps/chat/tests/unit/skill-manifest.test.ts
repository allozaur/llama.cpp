// A SKILL.md names and describes its skill in a frontmatter, which the Library reads
// to list the skill; the instructions after it are what a reader opens.

import { parseSkillFrontmatter, skillInstructions } from '#lib/utils/skill-manifest.ts';
import { describe, expect, it } from 'vitest';

describe('the frontmatter of a SKILL.md', () => {
	it('gives the name and a description written on one line', () => {
		const text =
			'---\nname: animate\ndescription: Build an animation from scratch: curve, duration, exit.\n---\n\n# Animations';

		expect(parseSkillFrontmatter(text)).toEqual({
			description: 'Build an animation from scratch: curve, duration, exit.',
			name: 'animate'
		});
	});

	it('reads a folded or literal description as one line', () => {
		const folded =
			'---\nname: gh-stack\ndescription: >\n  Manages stacked PRs\n  and splits work.\n\n  Use for stacks.\nmetadata:\n  author: github\n---\n';
		const literal = '---\ndescription: |-\n  First line\n  second line\nname: notes\n---\n';

		expect(parseSkillFrontmatter(folded)).toEqual({
			description: 'Manages stacked PRs and splits work. Use for stacks.',
			name: 'gh-stack'
		});
		expect(parseSkillFrontmatter(literal)).toEqual({
			description: 'First line second line',
			name: 'notes'
		});
	});

	it('reads a plain value that goes on in the indented lines below', () => {
		const text = '---\nname: wide\ndescription: Starts here\n  and goes on.\n---\n';

		expect(parseSkillFrontmatter(text).description).toBe('Starts here and goes on.');
	});

	it('takes the quotes off a quoted value', () => {
		const text = '---\nname: "quoted: name"\ndescription: \'It is quoted\'\n---\n';

		expect(parseSkillFrontmatter(text)).toEqual({
			description: 'It is quoted',
			name: 'quoted: name'
		});
	});

	it('reads only its own keys, never one nested under another', () => {
		const text =
			'---\nmetadata:\n  name: inner\n  description: not this\nallowed-tools: Bash\nname: outer\n---\n';

		expect(parseSkillFrontmatter(text)).toEqual({ name: 'outer' });
	});

	it('reads Windows line ends', () => {
		expect(
			parseSkillFrontmatter('---\r\nname: crlf\r\ndescription: Ends in CR LF\r\n---\r\n')
		).toEqual({
			description: 'Ends in CR LF',
			name: 'crlf'
		});
	});

	it('gives nothing without a frontmatter, or with one that never closes', () => {
		expect(parseSkillFrontmatter('# Just instructions\nname: not a key')).toEqual({});
		expect(parseSkillFrontmatter('---\nname: open\n\n# No closing fence')).toEqual({});
		expect(parseSkillFrontmatter('')).toEqual({});
	});
});

describe('the instructions of a SKILL.md', () => {
	it('are the text after the frontmatter', () => {
		expect(skillInstructions('---\nname: animate\n---\n\n# Animations\n\nDo it well.\n')).toBe(
			'# Animations\n\nDo it well.'
		);
	});

	it('are the whole text when there is no frontmatter', () => {
		expect(skillInstructions('# Animations\n\n---\n\nA rule is not a fence.')).toBe(
			'# Animations\n\n---\n\nA rule is not a fence.'
		);
	});
});

/**
 * Reading a SKILL.md: the frontmatter that names and describes the skill, and
 * the instructions after it. Only `name` and `description` are read: nothing in
 * a frontmatter changes what the app or the model may do.
 */

/** What a SKILL.md says about itself. */
export interface SkillFrontmatter {
	description?: string;
	name?: string;
}

const FRONTMATTER_FENCE = '---';
const KEY_SEPARATOR = ':';
const LINE_BREAK = '\n';
const CARRIAGE_RETURN = '\r';
/** A value that starts with one of these goes on in the indented lines below it. */
const BLOCK_SCALAR_MARKS = ['>', '|'];
const QUOTES = ['"', "'"];
const READ_KEYS: readonly (keyof SkillFrontmatter)[] = ['description', 'name'];

/** The lines of the frontmatter, and the line the instructions start at. Without a frontmatter, none and 0. */
function frontmatterOf(lines: string[]): { end: number; frontmatter: string[] } {
	if (lines[0]?.trim() !== FRONTMATTER_FENCE) return { end: 0, frontmatter: [] };

	const close = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_FENCE);

	// a fence that never closes is not a frontmatter
	return close < 0
		? { end: 0, frontmatter: [] }
		: { end: close + 1, frontmatter: lines.slice(1, close) };
}

function linesOf(text: string): string[] {
	return text
		.split(LINE_BREAK)
		.map((line) => (line.endsWith(CARRIAGE_RETURN) ? line.slice(0, -1) : line));
}

function isIndented(line: string): boolean {
	return line !== line.trimStart();
}

function unquote(value: string): string {
	const quote = QUOTES.find(
		(mark) => value.length > 1 && value.startsWith(mark) && value.endsWith(mark)
	);

	return quote ? value.slice(1, -1) : value;
}

/**
 * The name and description a SKILL.md gives in its frontmatter. A value can be
 * plain, quoted, or a block that goes on in the indented lines below; either
 * way it is read as one line of text.
 */
export function parseSkillFrontmatter(text: string): SkillFrontmatter {
	const { frontmatter } = frontmatterOf(linesOf(text));
	const result: SkillFrontmatter = {};

	for (const [index, line] of frontmatter.entries()) {
		const separator = line.indexOf(KEY_SEPARATOR);

		if (separator < 0 || isIndented(line)) continue;

		const key = READ_KEYS.find((name) => name === line.slice(0, separator).trim());

		if (!key) continue;

		const first = line.slice(separator + 1).trim();
		const below: string[] = [];

		for (const next of frontmatter.slice(index + 1)) {
			if (next.trim() && !isIndented(next)) break;

			if (next.trim()) below.push(next.trim());
		}

		const isBlock = BLOCK_SCALAR_MARKS.some((mark) => first.startsWith(mark));
		const value = [...(isBlock ? [] : [first]), ...below].filter(Boolean).join(' ');

		if (value) result[key] = isBlock ? value : unquote(value);
	}

	return result;
}

/** The instructions of a SKILL.md: its text without the frontmatter. */
export function skillInstructions(text: string): string {
	const lines = linesOf(text);

	return lines.slice(frontmatterOf(lines).end).join(LINE_BREAK).trim();
}

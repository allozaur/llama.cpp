import { CommandWordKind } from '../../../src/lib/enums/index.js';
import { splitCommand } from '../../../src/lib/utils/command.js';
import { describe, expect, it } from 'vite-plus/test';

const kinds = (command: string) =>
	splitCommand(command)
		.filter((word) => word.kind !== CommandWordKind.SPACE)
		.map((word) => [word.text, word.kind]);

describe('splitCommand', () => {
	it('marks the program, its flags and its arguments', () => {
		expect(kinds('llama serve -hf ggml-org/gemma-4-e4b-it-GGUF')).toEqual([
			['llama', CommandWordKind.PROGRAM],
			['serve', CommandWordKind.ARGUMENT],
			['-hf', CommandWordKind.FLAG],
			['ggml-org/gemma-4-e4b-it-GGUF', CommandWordKind.ARGUMENT],
		]);
	});

	it('marks a pipe and the program after it', () => {
		expect(kinds('curl -LsSf https://llama.app/install.sh | sh')).toEqual([
			['curl', CommandWordKind.PROGRAM],
			['-LsSf', CommandWordKind.FLAG],
			['https://llama.app/install.sh', CommandWordKind.ARGUMENT],
			['|', CommandWordKind.PIPE],
			['sh', CommandWordKind.PROGRAM],
		]);
	});

	it('keeps every character, runs of spaces included', () => {
		const command = 'brew  install --cask   llama-app';

		expect(
			splitCommand(command)
				.map((word) => word.text)
				.join(''),
		).toBe(command);
	});

	it('returns nothing for an empty command', () => {
		expect(splitCommand('')).toEqual([]);
	});
});

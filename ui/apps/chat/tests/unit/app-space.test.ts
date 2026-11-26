import { appSpaceCard, parseAppSpaceArgs } from '../../scripts/app-space.ts';
import { describe, expect, it } from 'vitest';

describe('parseAppSpaceArgs', () => {
	it('takes the Space from the variable, and --space over it', () => {
		const env = { HF_SPACE_UI_CHAT: 'ggml-org/llama-chat' };

		expect(parseAppSpaceArgs([], env)).toMatchObject({
			built: false,
			server: undefined,
			space: 'ggml-org/llama-chat',
			title: 'Llama Chat',
			visibility: 'public'
		});
		expect(parseAppSpaceArgs(['--space', 'alice/chat'], env).space).toBe('alice/chat');
	});

	it('refuses to deploy without a Space', () => {
		expect(() => parseAppSpaceArgs([], {})).toThrow();
		expect(() => parseAppSpaceArgs([], { HF_SPACE_UI_CHAT: 'llama-chat' })).toThrow();
		expect(parseAppSpaceArgs(['--help'], {}).help).toBe(true);
	});

	it('refuses what it does not know', () => {
		const env = { HF_SPACE_UI_CHAT: 'ggml-org/llama-chat' };

		expect(() => parseAppSpaceArgs(['--server', 'localhost:9931'], env)).toThrow();
		expect(() => parseAppSpaceArgs(['--visibility', 'secret'], env)).toThrow();
		expect(() => parseAppSpaceArgs(['deploy'], env)).toThrow();
	});
});

describe('appSpaceCard', () => {
	const card = appSpaceCard({
		repo: 'ggml-org/llama.cpp',
		sha: '0123456789abcdef0123456789abcdef01234567',
		title: 'Llama Chat'
	});

	it('is a static Space with the headers llama-server serves the UI with', () => {
		expect(card).toContain('title: Llama Chat\n');
		expect(card).toContain('sdk: static');
		expect(card).toContain('cross-origin-embedder-policy: require-corp');
		expect(card).toContain('cross-origin-opener-policy: same-origin');
	});

	it('carries its own tag, not the one of a preview', () => {
		expect(card).toContain('tags:\n  - llama-ui-app\n');
		expect(card).not.toContain('llama-ui-preview');
	});

	it('says what it was built from', () => {
		expect(card).toContain('https://github.com/ggml-org/llama.cpp');
		expect(card).toContain('at 0123456789.');
	});
});

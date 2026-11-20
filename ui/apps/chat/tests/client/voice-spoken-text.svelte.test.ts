// Guards picking a word of a reply being read aloud: a click gives where the word starts,
// and without a listener the words are plain text.

import { VoiceSpokenText } from '@ggml-org/llama-ui/voice';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const TEXT = 'Read this. Then that.';

describe('VoiceSpokenText word picks', () => {
	it('gives where a clicked word starts', async () => {
		const onWordSelect = vi.fn();

		render(VoiceSpokenText, { onWordSelect, spoken: 4, text: TEXT });

		await userEvent.click(page.getByText('Then'));
		expect(onWordSelect).toHaveBeenCalledWith(TEXT.indexOf(' Then') + 1);
	});

	it('leaves the words alone without a listener', () => {
		const { container } = render(VoiceSpokenText, { spoken: 4, text: TEXT });

		expect(container.querySelector('[data-start]')).toBeNull();
	});
});

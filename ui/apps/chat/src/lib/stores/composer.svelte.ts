/**
 * composerStore - The new-chat composer, for code outside the form
 *
 * Lets anything on the page (the greeting's suggestions, a brand's slots) put text in the
 * composer without sending it, and override its placeholder. ChatScreenForm applies both.
 */

import type { BrandComposer } from '#lib/brand/brand.ts';

class ComposerStore implements BrandComposer {
	/** Text waiting to be put in the composer; ChatScreenForm takes it */
	pending = $state<string | null>(null);

	placeholder = $state<string | undefined>(undefined);

	/** Put text in the composer and focus it, without sending it */
	prefill(text: string) {
		this.pending = text;
	}

	/** The pending text, once: ChatScreenForm calls it as it fills the composer */
	takePending(): string | null {
		const text = this.pending;

		this.pending = null;

		return text;
	}
}

export const composerStore = new ComposerStore();

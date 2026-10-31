/**
 * How a system message linked to a library prompt differs from that prompt.
 */
export enum PromptDrift {
	/** The prompt changed after the message, so the library is the newer side. */
	LIBRARY = 'library',
	/** The message changed after the prompt, so the message is the newer side. */
	MESSAGE = 'message',
	/** The prompt was deleted, or never existed. */
	MISSING = 'missing',
	/** The message and the prompt have the same text. */
	NONE = 'none'
}

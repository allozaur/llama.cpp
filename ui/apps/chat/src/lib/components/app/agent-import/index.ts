/**
 *
 * AGENT IMPORT
 *
 * Brings chat sessions of other AI apps into the app's own conversations. Claude Code is the
 * first source. The user picks the files, the parsers in `#lib/utils/agent-import-*.ts`
 * turn them into conversations, and the conversation import writes them.
 *
 */

/** The whole flow, to drop into a dialog or a step: pick sources, then import. */
export { default as AgentImport } from './AgentImport.svelte';

/** The flow in a dialog. */
export { default as AgentImportDialog } from './AgentImportDialog.svelte';

/** First screen: the sources found in the picked files, each with a switch. */
export { default as AgentImportSources } from './AgentImportSources.svelte';

/** Second screen: what to import, with progress and result per row. */
export { default as AgentImportItems } from './AgentImportItems.svelte';

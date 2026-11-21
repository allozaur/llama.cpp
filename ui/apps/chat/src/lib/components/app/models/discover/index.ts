/**
 *
 * MODELS DISCOVER
 *
 * Components for browsing HuggingFace GGUF models on the models page: the suggested
 * models carousel, the Hub search results and the details drawer a repo opens in. The
 * list and detail trees live in their own subfolders; this barrel re-exports them.
 *
 */

/** Suggested catalog models, a horizontal row of cards above the installed models. */
export { default as ModelsDiscoverCarousel } from './ModelsDiscoverCarousel.svelte';

/** One Hub repo as a card: the carousel's, and the grid view's search results. */
export { default as ModelsDiscoverCard } from './ModelsDiscoverCard.svelte';

export * from './ModelsDiscoverList';
export * from './ModelsDiscoverDetails';

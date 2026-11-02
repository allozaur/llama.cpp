// Guards the models page layouts: the table/grid switch, and the one search that
// lists local matches and Hugging Face matches in a section of their own.

import ModelsManagerWrapper from './components/ModelsManagerWrapper.svelte';
import { MODELS_VIEW_MODE_LOCALSTORAGE_KEY, SETTINGS_KEYS } from '$lib/constants';
import { ModelsViewMode } from '$lib/enums';
import { HuggingFaceService } from '$lib/services';
import { modelsDiscoverStore, modelsStore, settingsStore, uiStore } from '$lib/stores';
import type { HfModelInfo } from '$lib/types';
import type { ModelOption } from '$lib/types/models';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

function option(model: string): ModelOption {
	return { capabilities: [], id: model, model, name: model };
}

function hubRecord(id: string): HfModelInfo {
	return {
		_id: id,
		downloads: 0,
		id,
		library_name: null,
		likes: 0,
		modelId: id,
		pipeline_tag: null,
		private: false,
		tags: []
	};
}

const models = [
	option('org/alpha-8b:Q4_K_M'),
	option('org/alpha-8b:Q8_0'),
	option('org/gamma-8b:Q4_K_M')
];

beforeEach(() => {
	modelsStore.routerModels = [];
	modelsStore.models = models;
	modelsStore.favoriteModelIds = new Set();
	settingsStore.config[SETTINGS_KEYS.GROUP_MODELS_BY_FAMILY] = false;
	settingsStore.config[SETTINGS_KEYS.ENABLE_DISCOVER_MODELS] = false;
	uiStore.setModelsViewMode(ModelsViewMode.TABLE);
	uiStore.closeHubModelDetails();
	// no network: the catalog is empty and every repo has no files
	vi.spyOn(HuggingFaceService, 'getCatalog').mockResolvedValue([]);
	vi.spyOn(HuggingFaceService, 'getTree').mockResolvedValue([]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

async function renderManager() {
	const screen = render(ModelsManagerWrapper);

	await expect.element(screen.getByText(/gamma\s+8B/)).toBeVisible();

	return screen;
}

it('switches to a grid of cards, one per quant, and remembers it', async () => {
	const screen = await renderManager();

	// the table folds the two alpha quants under their repo
	expect(screen.container.textContent).toContain('2 quants available');

	await screen.getByRole('radio', { name: 'Grid' }).click();

	expect(uiStore.modelsViewMode).toBe(ModelsViewMode.GRID);
	expect(localStorage.getItem(MODELS_VIEW_MODE_LOCALSTORAGE_KEY)).toBe(ModelsViewMode.GRID);

	// every quant is a card of its own, and the grid orders from a menu
	await vi.waitFor(() => {
		expect(screen.container.querySelectorAll('.grid button[aria-pressed]')).toHaveLength(3);
	});
	expect(screen.container.textContent).not.toContain('2 quants available');
	await expect.element(screen.getByText('Sort:')).toBeVisible();
	expect(screen.getByTitle('Sort by model, lowest first').query()).toBeNull();
});

it('searches the Hub with the same term and opens a result in the drawer', async () => {
	settingsStore.config[SETTINGS_KEYS.ENABLE_DISCOVER_MODELS] = true;

	const search = vi
		.spyOn(HuggingFaceService, 'searchByQuery')
		.mockResolvedValue([hubRecord('hub-org/delta-8B-GGUF')]);
	const screen = await renderManager();

	// the suggestions lead the page until a search takes it
	await expect.element(screen.getByText('Suggested models')).toBeVisible();

	await screen.getByPlaceholder('Search models or Hugging Face').fill('alpha');

	// local matches stay where they are, the Hub's land in a section after them
	await expect.element(screen.getByText(/gamma\s+8B/)).not.toBeInTheDocument();
	await expect.element(screen.getByText('On Hugging Face')).toBeVisible();
	await expect.element(screen.getByText(/delta\s+8B/)).toBeVisible();
	expect(screen.getByText('Suggested models').query()).toBeNull();
	expect(search).toHaveBeenCalledWith('alpha', { limit: 50 });

	await screen.getByText(/delta\s+8B/).click();

	expect(uiStore.hubModelFocus).toBe('hub-org/delta-8B-GGUF');

	// clearing the term clears the results
	await screen.getByPlaceholder('Search models or Hugging Face').fill('');
	await vi.waitFor(() => expect(modelsDiscoverStore.searchResults).toHaveLength(0));
});

it('keeps the Hub out of the search while Discover is off', async () => {
	const search = vi.spyOn(HuggingFaceService, 'searchByQuery').mockResolvedValue([]);
	const screen = await renderManager();

	await screen.getByPlaceholder('Search your models').fill('alpha');

	await expect.element(screen.getByText(/gamma\s+8B/)).not.toBeInTheDocument();
	expect(screen.getByText('On Hugging Face').query()).toBeNull();
	expect(screen.getByText('Suggested models').query()).toBeNull();
	expect(search).not.toHaveBeenCalled();
});

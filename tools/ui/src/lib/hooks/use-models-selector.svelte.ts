import {
	CHAT_INPUT_FOCUS_SELECTOR,
	LOCAL_BACKEND_ID,
	REMOTE_SERVER_MODEL_LIMIT
} from '$lib/constants';
import {
	deviceStore,
	modelsStore,
	serversModelsStore,
	serversStore,
	serverStore,
	uiStore
} from '$lib/stores';
import type { ModelOption } from '$lib/types/models';
import {
	filterModelOptions,
	type GroupedModelOptions,
	groupFavoriteOptions,
	groupModelOptions,
	groupServerOptions,
	type ModelItem
} from '$lib/utils';
import { nameOf } from '$lib/utils/model-names';
import { rawModelId } from '$lib/utils/model-option-id';
import { onMount } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

/** Groups of the favorites tab, which lists favorites only. */
const EMPTY_GROUPS: GroupedModelOptions = { available: [], servers: [] };

export interface UseModelsSelectorOptions {
	currentModel: () => string | null;
	useGlobalSelection?: () => boolean;
	/** The caller's model outranks the active server's selection, e.g. a message's own. */
	onModelChange?: () =>
		| ((modelId: string, modelName: string, serverId?: string) => Promise<boolean> | boolean | void)
		| undefined;
	onOpenChange?: (open: boolean) => void;
}

export interface UseModelsSelectorReturn {
	readonly options: ModelOption[];
	readonly loading: boolean;
	readonly updating: boolean;
	readonly activeId: string | null;
	readonly emptyMessage: string;
	readonly isMultiModel: boolean;
	readonly isRouter: boolean;
	readonly serverModel: string | null;
	readonly isHighlightedCurrentModelActive: boolean;
	readonly isCurrentModelInCache: boolean;
	readonly favoriteItems: ModelItem[];
	readonly loadedItems: ModelItem[];
	readonly filteredOptions: ModelOption[];
	readonly isEmpty: boolean;
	readonly isServerView: boolean;
	readonly groupedFilteredOptions: ReturnType<typeof groupModelOptions>;
	readonly isLoadingModel: boolean;
	readonly searchTerm: string;
	closeServer(): void;
	openServer(serverId: string): void;
	setSearchTerm(value: string): void;
	showServerModels(serverId: string): Promise<void>;
	handleSelect(modelId: string): Promise<void>;
	handleOpenChange(open: boolean): void;
	isFavorite(model: string): boolean;
	getDisplayOption(): ModelOption | undefined;
}

/**
 * Shared reactive state and logic for model selection.
 *
 * Used by the model selector dropdown, which serves the desktop an anchored menu
 * and the phone a bottom drawer, to avoid duplicating store derivations,
 * selection handling, and model loading.
 */
export function useModelsSelector(opts: UseModelsSelectorOptions): UseModelsSelectorReturn {
	/**
	 * Current view: the favorites of every server, the local server's models, or
	 * the remote servers'. Favorites are the default while there is at least one.
	 */
	/** Remote server drilled into from its section; null while browsing. */
	let serverViewId = $state<string | null>(null);

	const isServerView = $derived(serverViewId !== null);
	const isLocalOption = (option: ModelOption) => option.serverId === LOCAL_BACKEND_ID;
	// every enabled server's models are one list: favorites, then the local
	// server, then one section per remote server
	const allOptions = $derived(
		modelsStore.models.filter((option) => {
			const modelProps = modelsStore.props.getModelProps(option.model);

			return modelProps?.ui !== false;
		})
	);
	const options = $derived(
		serverViewId ? allOptions.filter((option) => option.serverId === serverViewId) : allOptions
	);
	const loading = $derived(modelsStore.loading);
	const updating = $derived(modelsStore.updating);
	const activeId = $derived(modelsStore.selectedModelId);
	// Router mode and external servers both expose a selectable model list; only
	// a lone llama.cpp server without a router has nothing to choose from.
	const isMultiModel = $derived(
		serverStore.isRouterMode ||
			serversStore.enabled.some((server) => server.id !== LOCAL_BACKEND_ID)
	);
	const isRouter = $derived(serverStore.isRouterMode);
	const serverModel = $derived(modelsStore.singleModelName);
	const currentModel = $derived(opts.currentModel());
	const onModelChange = $derived(opts.onModelChange?.());
	const isHighlightedCurrentModelActive = $derived.by(() => {
		if (!isRouter || !currentModel) return false;

		const currentOption = allOptions.find((option) => option.model === currentModel);

		return currentOption ? currentOption.id === activeId : false;
	});
	const isCurrentModelInCache = $derived.by(() => {
		if (!isRouter || !currentModel) return true;

		return allOptions.some((option) => option.model === currentModel);
	});

	let isLoadingModel = $state(false);
	let searchTerm = $state('');

	// the search, the rows and the sections all read the visible set, while the
	// favorites and loaded blocks span every server and read the full one
	const allVisible = $derived(allOptions.filter((option) => !modelsStore.isHidden(option.id)));
	const visibleOptions = $derived(options.filter((option) => !modelsStore.isHidden(option.id)));
	// the sections read the view's own set; the favorites and the loaded rows span
	// every server and read the full visible one
	const filteredOptions = $derived(filterModelOptions(visibleOptions, searchTerm));
	const filteredAllOptions = $derived(filterModelOptions(allVisible, searchTerm));
	const remoteServers = $derived(
		serversStore.enabled
			.filter((server) => server.id !== LOCAL_BACKEND_ID)
			.map((server) => {
				const state = serversModelsStore.get(server.id);

				return {
					catalog: state.models.length,
					error: state.error,
					loading: state.loading,
					name: server.name,
					serverId: server.id
				};
			})
	);
	// loaded models lead the list, whichever server serves them
	const isLoadedHere = (option: ModelOption) => modelsStore.isModelLoaded(option.model);
	const loadedItems = $derived.by(() => {
		if (isServerView) return [];

		return filteredAllOptions
			.filter((option) => isLoadedHere(option))
			.map((option) => ({ option }));
	});
	const loadedIds = $derived(new SvelteSet(loadedItems.map((item) => item.option.id)));
	// loaded models lead the list: their own sections list them once, so a
	// loaded favorite shows there and not twice
	const favoriteItems = $derived(
		groupFavoriteOptions(
			filteredAllOptions.filter((option) => !loadedIds.has(option.id)),
			modelsStore.favoriteModelIds
		)
	);
	// loaded models and favorites are listed once, at the top: the sections skip both
	const sectionOptions = $derived(
		filteredOptions.filter(
			(option) => !modelsStore.favoriteModelIds.has(option.model) && !loadedIds.has(option.id)
		)
	);
	const serverSections = $derived(
		groupServerOptions(
			sectionOptions,
			remoteServers,
			// a drill-in or a search reaches every model, the sections stay short
			serverViewId || searchTerm ? Infinity : REMOTE_SERVER_MODEL_LIMIT,
			modelsStore.recentModelIds
		)
	);
	const groupedFilteredOptions = $derived.by(() => {
		if (isServerView) {
			const sections = serverSections.filter((section) => section.serverId === serverViewId);

			return { ...EMPTY_GROUPS, servers: sections };
		}

		const local = groupModelOptions(sectionOptions.filter(isLocalOption));

		return { ...local, servers: serverSections };
	});
	const isEmpty = $derived(
		filteredOptions.length === 0 && favoriteItems.length === 0 && loadedItems.length === 0
	);
	const emptyMessage = $derived(searchTerm ? 'No models found.' : 'No models yet.');

	onMount(() => {
		modelsStore.fetch().catch((error) => {
			console.error('Unable to load models:', error);
		});
	});

	function handleOpenChange(open: boolean) {
		if (loading || updating) return;

		// a lone llama.cpp server without a router has no list: the trigger opens
		// the manager instead. router mode and external servers both expose a
		// selectable list, so their role does not decide here, and a phone has no
		// manager at all: its drawer opens either way
		if (!isMultiModel && !deviceStore.isMobile) {
			if (open) uiStore.openModelsManager();

			return;
		}

		searchTerm = '';
		serverViewId = null;

		if (open && isRouter) {
			modelsStore.props.fetchModalitiesForLoadedModels();
		}

		opts.onOpenChange?.(open);
	}

	/**
	 * Switch the rendered view. Views are display only: the server that serves
	 * requests follows the selected model, not the view.
	 */
	/** Drill into one remote server's full model list. */
	function openServer(serverId: string) {
		serverViewId = serverId;
		searchTerm = '';
	}

	function closeServer() {
		serverViewId = null;
		searchTerm = '';
	}

	/** Refresh a server's models, e.g. right after it was added. */
	async function showServerModels(serverId: string): Promise<void> {
		await serversModelsStore.ensureLoaded(serverId);
	}

	async function handleSelect(modelId: string) {
		// favorites live above the tabs and may belong to another server, so the
		// lookup spans every enabled server
		const option = allOptions.find((opt) => opt.id === modelId);

		if (!option) return;

		let shouldCloseMenu = true;

		if (onModelChange) {
			const result = await onModelChange(rawModelId(option.id), option.model, option.serverId);

			if (result === false) {
				shouldCloseMenu = false;
			}
		} else {
			await modelsStore.selectModelById(option.id, { recordRecent: true });
		}

		if (shouldCloseMenu) {
			handleOpenChange(false);

			requestAnimationFrame(() => {
				const input = document.querySelector<HTMLElement>(CHAT_INPUT_FOCUS_SELECTOR);

				input?.focus({ preventScroll: true });
			});
		}

		// only the built-in server loads on request, and only in router mode
		const canLoadHere = option.serverId === LOCAL_BACKEND_ID && isRouter;

		if (!onModelChange && canLoadHere && !modelsStore.isModelLoaded(option.model)) {
			isLoadingModel = true;

			modelsStore.status
				.load(option.model)
				.catch((error) => console.error('Failed to load model:', error))
				.finally(() => (isLoadingModel = false));
		}
	}

	function getDisplayOption(): ModelOption | undefined {
		if (!isRouter) {
			const displayModel = serverModel || currentModel;

			if (displayModel) {
				return {
					capabilities: [],
					id: serverModel ? 'current' : 'offline-current',
					model: displayModel,
					name: nameOf(displayModel)
				};
			}

			return undefined;
		}

		if (currentModel) {
			if (!isCurrentModelInCache) {
				return {
					capabilities: [],
					id: 'not-in-cache',
					model: currentModel,
					name: nameOf(currentModel)
				};
			}

			return allOptions.find((option) => option.model === currentModel);
		}

		if (activeId) {
			return allOptions.find((option) => option.id === activeId);
		}

		return undefined;
	}

	return {
		get activeId() {
			return activeId;
		},

		closeServer,

		get emptyMessage() {
			return emptyMessage;
		},

		get favoriteItems() {
			return favoriteItems;
		},
		get filteredOptions() {
			return filteredOptions;
		},

		getDisplayOption,

		get groupedFilteredOptions() {
			return groupedFilteredOptions;
		},

		handleOpenChange,

		handleSelect,

		get isCurrentModelInCache() {
			return isCurrentModelInCache;
		},

		get isEmpty() {
			return isEmpty;
		},

		isFavorite(model: string) {
			return modelsStore.favoriteModelIds.has(model);
		},

		get isHighlightedCurrentModelActive() {
			return isHighlightedCurrentModelActive;
		},

		get isLoadingModel() {
			return isLoadingModel;
		},

		get isMultiModel() {
			return isMultiModel;
		},

		get isRouter() {
			return isRouter;
		},

		get isServerView() {
			return isServerView;
		},

		get loadedItems() {
			return loadedItems;
		},

		get loading() {
			return loading;
		},

		openServer,

		get options() {
			return options;
		},

		get searchTerm() {
			return searchTerm;
		},

		get serverModel() {
			return serverModel;
		},

		setSearchTerm(value: string) {
			searchTerm = value;
		},

		showServerModels,

		get updating() {
			return updating;
		}
	};
}

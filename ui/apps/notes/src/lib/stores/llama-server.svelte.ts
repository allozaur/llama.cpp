import { SERVER_ROLE_ROUTER, STORAGE_KEYS } from '#lib/constants/index.ts';
import { fetchModelIds, fetchProps } from '#lib/services/llama-server.service.ts';
import type { ServerProps } from '#lib/types/api.ts';

const PATH_SEPARATOR = /[\\/]/;

function storedModel(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
	} catch {
		return null;
	}
}

/** What Notes knows of the llama-server it talks to: its mode, models and context size. */
export class ServerStore {
	error = $state<string | null>(null);
	props = $state<ServerProps | null>(null);
	isRouter = $derived(this.props?.role === SERVER_ROLE_ROUTER);
	loaded = $state(false);
	selectedModel = $state<string | null>(null);
	/** False until a model can take a request. */
	canGenerate = $derived(
		this.loaded && !this.error && (!this.isRouter || this.selectedModel !== null)
	);

	/** Props of the selected model, when the server routes between several. */
	modelProps = $state<ServerProps | null>(null);

	contextSize = $derived(
		(this.isRouter ? this.modelProps : this.props)?.default_generation_settings?.n_ctx ?? null
	);

	models = $state<string[]>([]);

	/** Name of the one model a server without routing runs. */
	modelName = $derived.by(() => {
		if (this.isRouter) return this.selectedModel;

		const props = this.props;

		return (
			props?.model_alias || props?.model_path?.split(PATH_SEPARATOR).pop() || this.models[0] || null
		);
	});

	/** The `model` field of a request: only a routing server needs one. */
	requestModel = $derived(this.isRouter ? (this.selectedModel ?? undefined) : undefined);

	async init(): Promise<void> {
		try {
			const [props, models] = await Promise.all([
				fetchProps(),
				fetchModelIds().catch((): string[] => [])
			]);

			this.props = props;
			this.models = models;
			this.error = null;

			if (this.isRouter) {
				const stored = storedModel();

				this.selectedModel = stored && models.includes(stored) ? stored : null;
				await this.refreshModelProps();
			}
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			this.loaded = true;
		}
	}

	/** Reads the selected model's props again: they exist once the model is loaded. */
	async refreshModelProps(): Promise<void> {
		const model = this.selectedModel;

		if (!this.isRouter || !model) {
			this.modelProps = null;

			return;
		}

		const props = await fetchProps(model).catch(() => null);

		if (this.selectedModel === model) this.modelProps = props;
	}

	async selectModel(id: string): Promise<void> {
		this.selectedModel = id;

		try {
			localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, id);
		} catch {
			// storage is off: the choice lasts for this visit
		}

		await this.refreshModelProps();
	}
}

export const serverStore = new ServerStore();

import { HF_MMPROJ_FILENAME_TOKEN, MODEL_ID } from '$lib/constants';
import { ModelDraftSidecar } from '$lib/enums';
import { HuggingFaceService } from '$lib/services';
import { modelsDiscoverStore } from '$lib/stores';
import type { ModelsDiscoverSizeRange } from '$lib/stores/models-discover/index.svelte';
import type { HfModelInfo, HfModelSiblingRef } from '$lib/types/huggingface';
import type { ModelModalities } from '$lib/types/models';
import {
	detectThinkingSupport,
	detectToolUseSupport,
	directoryOf,
	isDraftSidecar,
	isServerSidecarFile,
	orgOf
} from '$lib/utils';
import { SvelteSet } from 'svelte/reactivity';

/**
 * True when a file of the weights sits in the draft's directory: the server
 * resolves a sidecar against the model file beside it, never across directories.
 */
function hasWeightsBeside(siblings: HfModelSiblingRef[], draftPath: string): boolean {
	const directory = directoryOf(draftPath);

	return siblings.some(
		(sibling) =>
			MODEL_ID.WEIGHT_EXTENSION_REGEX.test(sibling.rfilename) &&
			directoryOf(sibling.rfilename) === directory &&
			!HuggingFaceService.extractQuantMeta(sibling.rfilename)?.sidecar
	);
}

/**
 * What a Hub row or card shows of one repo record: avatar orgs, context, capabilities,
 * modalities, draft kinds and size range. Shared so every Hub surface reads a record
 * the same way; a repo the catalog did not measure is measured once here.
 */
export function useHubModelSummary(
	getModel: () => HfModelInfo,
	/** Show the original (base) model's org avatar instead of the repo's org. */
	getShowBaseModelAvatar: () => boolean = () => false
) {
	const org = $derived(orgOf(getModel().id));
	// the base model's org when asked (e.g. the Qwen logo for ggml-org/Qwen3.8-27B-GGUF),
	// else the repo's org
	const avatarOrg = $derived.by(() => {
		if (!getShowBaseModelAvatar()) return org;

		return orgOf(HuggingFaceService.getBaseModels(getModel())[0]) || org;
	});
	const contextLength = $derived(getModel().gguf?.context_length);
	// Reasoning support from the chat template, matching the details view.
	const supportsThinking = $derived(detectThinkingSupport(getModel().gguf?.chat_template ?? ''));
	const supportsToolUse = $derived(detectToolUseSupport(getModel().gguf?.chat_template ?? ''));
	const mmprojPath = $derived(
		getModel().siblings?.find((s) => s.rfilename.toLowerCase().includes(HF_MMPROJ_FILENAME_TOKEN))
			?.rfilename
	);
	// Modalities derived from HF metadata: the pipeline tag and the mmproj.
	const modalities = $derived<ModelModalities>(
		HuggingFaceService.getModalities(getModel().id, getModel().pipeline_tag, mmprojPath)
	);

	// the mmproj's header says whether it also hears; read once per repo
	$effect(() => {
		if (mmprojPath) void HuggingFaceService.getMmprojEncoders(getModel().id, mmprojPath);
	});

	// Draft sidecars (mtp, dflash, dspark, eagle3) the repo offers, badged with no
	// quant: the list does not know how the server configures them. Only the drafts
	// the server can actually pull are shown, so a badge never outlives the file
	// find_best_sibling would resolve.
	const draftKinds = $derived.by<ModelDraftSidecar[]>(() => {
		const siblings = getModel().siblings ?? [];
		const kinds = new SvelteSet<ModelDraftSidecar>();

		for (const sibling of siblings) {
			const sidecar = HuggingFaceService.extractQuantMeta(sibling.rfilename)?.sidecar;

			if (!sidecar || !isDraftSidecar(sidecar)) continue;

			if (!isServerSidecarFile(sibling.rfilename, sidecar)) continue;

			if (!hasWeightsBeside(siblings, sibling.rfilename)) continue;

			kinds.add(sidecar);
		}

		return Object.values(ModelDraftSidecar).filter((kind) => kinds.has(kind));
	});

	// Min/max size across the repo's quants, draft sidecars included. The store
	// has catalog repos covered already; any other one (a search hit) is measured
	// once and the result is cached per repo.
	let measuredSize = $state<ModelsDiscoverSizeRange | null>(null);

	const sizeRange = $derived(modelsDiscoverStore.cachedSizeRangeFor(getModel().id) ?? measuredSize);

	$effect(() => {
		const id = getModel().id;

		if (modelsDiscoverStore.cachedSizeRangeFor(id)) return;

		let cancelled = false;

		void modelsDiscoverStore.sizeRange(id).then((range) => {
			if (!cancelled) measuredSize = range ?? null;
		});

		return () => {
			cancelled = true;
		};
	});

	return {
		get avatarOrg() {
			return avatarOrg;
		},
		get contextLength() {
			return contextLength;
		},
		get draftKinds() {
			return draftKinds;
		},
		get modalities() {
			return modalities;
		},
		get org() {
			return org;
		},
		get sizeRange() {
			return sizeRange;
		},
		get supportsThinking() {
			return supportsThinking;
		},
		get supportsToolUse() {
			return supportsToolUse;
		}
	};
}

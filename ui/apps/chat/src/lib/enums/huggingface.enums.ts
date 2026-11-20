/**
 * HuggingFace Hub enums.
 *
 * Values mirror the strings used by the HF REST API
 * (https://huggingface.co/docs/huggingface_hub/package_reference/hf_api)
 * so they can be sent and compared directly.
 */

/** Sort field for /api/models search queries. */
export enum HfModelSort {
	CREATED_AT = 'createdAt',
	DOWNLOADS = 'downloads',
	LAST_MODIFIED = 'lastModified',
	LIKES = 'likes',
	TRENDING_SCORE = 'trendingScore'
}

/**
 * Where the sidecar token (`mtp` / `dflash` / `mmproj` / ...) sits in the
 * filename.
 * - `prefix`  sidecar file that lives next to the main weights, e.g. `mtp-Q4_0.gguf`
 * - `suffix`  embedded draft baked into the main weights, e.g. `Hy3-IQ1_M-mtp.gguf`
 * - `infix`   standalone sidecar named between head and quant, e.g. `model-mtp-Q8_0.gguf`
 */
export enum SidecarForm {
	INFIX = 'infix',
	PREFIX = 'prefix',
	SUFFIX = 'suffix'
}

/** Entry type in a model repository file tree (`/tree` responses). */
export enum HfEntryType {
	DIRECTORY = 'directory',
	FILE = 'file'
}

/** How much of a conversation a share to Hugging Face uploads. */
export enum TraceShareScope {
	ALL = 'all',
	UP_TO_MESSAGE = 'up-to-message'
}

/** How the Hugging Face account a share uploads with was signed in. */
export enum HfAuthMethod {
	/** A user access token pasted into the share dialog. */
	ACCESS_TOKEN = 'access-token',
	/** "Sign in with Hugging Face": OAuth in the browser. */
	OAUTH = 'oauth'
}

/** How a Hugging Face sign-in that left for the authorization page comes back. */
export enum HfOAuthFlowMode {
	/** In a popup, which closes itself once the tokens are in. */
	POPUP = 'popup',
	/** In this tab, which goes back to where it was. */
	REDIRECT = 'redirect'
}

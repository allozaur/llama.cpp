/**
 * Storage-related constants (localStorage, IndexedDB).
 *
 * Centralized to ensure consistency across the app and simplify future
 * name changes.
 */

/** Name prefix for all localStorage keys */
export const STORAGE_APP_NAME = 'LlamaUi';

/** Deprecated localStorage key prefix (old app name) */
export const STORAGE_APP_NAME_DEPRECATED = 'LlamaCppWebui';

/** @deprecated Deprecated IndexedDB name — will be removed after all users have migrated */
export const DB_APP_NAME_DEPRECATED = 'LlamacppWebui';

export const ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.alwaysAllowedTools`;

/** Id of the server the selector and new requests target, restored on page load. */
/* Kept under the name it was first stored under; only the constant was renamed. */
export const ACTIVE_SERVER_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.activeBackend`;

export const CONFIG_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.config`;
export const DISABLED_TOOLS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.disabledTools`;

/** Disabled tools keyed by stable selection identity, no migration from the name based key */
export const DISABLED_TOOL_KEYS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.disabledToolKeys`;

/** Default disabled tool categories, seeded into newly created conversations */
export const DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.disabledToolCategories`;
export const FAVORITE_MODELS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.favoriteModels`;

/** Open state the user set for a model list section or one of its families, by id. */
export const MODEL_GROUP_OPEN_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.modelGroupOpen`;

/** Per-model load and inference overrides, keyed by server-qualified model id. */
export const MODEL_OVERRIDES_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.modelOverrides`;

/** Model the user picked last, kept across reloads. Stores `{ id, model }`. */
export const SELECTED_MODEL_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.selectedModel`;

/** Recently used model ids, most recent first, server-qualified. */
export const RECENT_MODELS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.recentModels`;

/** Model ids kept out of the selector, server-qualified. */
export const HIDDEN_MODELS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.hiddenModels`;
export const REASONING_EFFORT_DEFAULT_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.reasoningEffortDefault`;
/** Sidebar conversation sections the user folded. */
/** Order the user gave the sidebar's sections by dragging their headings. */
export const SIDEBAR_SECTION_ORDER_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.sidebarSectionOrder`;
export const SIDEBAR_COLLAPSED_SECTIONS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.sidebarCollapsedSections`;
export const CONVERSATION_TABS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.conversationTabs`;
export const MODELS_VIEW_MODE_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.modelsViewMode`;
export const SIDEBAR_EXPANDED_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.sidebarExpanded`;
export const SIDEBAR_WIDTH_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.sidebarWidth`;
export const USER_OVERRIDES_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.userOverrides`;
export const DISMISSED_RECOMMENDED_MCP_SERVERS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.dismissedRecommendedMcpServers`;
/* Likewise: the value is the key already written, the name is the one the list now has. */
export const DISMISSED_RECOMMENDED_SERVERS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.dismissedRecommendedBackends`;

/** Key prefix for per-conversation resumable stream state, conversationId is appended */
export const STREAM_RESUME_LOCALSTORAGE_KEY_PREFIX = `${STORAGE_APP_NAME}.streamResume.`;

/** Preference keys holding the user's own data; every other key is device-local UI state */
export const USER_PREFERENCE_KEYS: ReadonlySet<string> = new Set([
	ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY,
	CONFIG_LOCALSTORAGE_KEY,
	DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY,
	DISABLED_TOOL_KEYS_LOCALSTORAGE_KEY,
	DISMISSED_RECOMMENDED_MCP_SERVERS_LOCALSTORAGE_KEY,
	DISMISSED_RECOMMENDED_SERVERS_LOCALSTORAGE_KEY,
	FAVORITE_MODELS_LOCALSTORAGE_KEY,
	HIDDEN_MODELS_LOCALSTORAGE_KEY,
	MODEL_OVERRIDES_LOCALSTORAGE_KEY,
	REASONING_EFFORT_DEFAULT_LOCALSTORAGE_KEY,
	RECENT_MODELS_LOCALSTORAGE_KEY,
	USER_OVERRIDES_LOCALSTORAGE_KEY
]);

// Deprecated old key names (kept for backward compat while users migrate)
/** @deprecated Remote servers are settings-backed now; the demo build kept them here */
export const LEGACY_TUNNEL_SERVERS_LOCALSTORAGE_KEY = 'llama_servers';
/** @deprecated Use {@link ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY} instead */
export const DEPRECATED_ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME_DEPRECATED}.alwaysAllowedTools`;
/** @deprecated Use {@link CONFIG_LOCALSTORAGE_KEY} instead */
export const DEPRECATED_CONFIG_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME_DEPRECATED}.config`;
/** @deprecated Use {@link DISABLED_TOOLS_LOCALSTORAGE_KEY} instead */
export const DEPRECATED_DISABLED_TOOLS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME_DEPRECATED}.disabledTools`;
/** @deprecated Use {@link FAVORITE_MODELS_LOCALSTORAGE_KEY} instead */
export const DEPRECATED_FAVORITE_MODELS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME_DEPRECATED}.favoriteModels`;
/** @deprecated Use {@link USER_OVERRIDES_LOCALSTORAGE_KEY} instead */
export const DEPRECATED_USER_OVERRIDES_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME_DEPRECATED}.userOverrides`;

/** Build version stored in localStorage for non-PWA update detection */
export const BUILD_VERSION_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.buildVersion`;

/** Maps new keys to their deprecated fallback keys */
export const NEW_TO_DEPRECATED_MAP: Record<string, string> = {
	[ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY]: DEPRECATED_ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY,
	[CONFIG_LOCALSTORAGE_KEY]: DEPRECATED_CONFIG_LOCALSTORAGE_KEY,
	[DISABLED_TOOLS_LOCALSTORAGE_KEY]: DEPRECATED_DISABLED_TOOLS_LOCALSTORAGE_KEY,
	[FAVORITE_MODELS_LOCALSTORAGE_KEY]: DEPRECATED_FAVORITE_MODELS_LOCALSTORAGE_KEY,
	[USER_OVERRIDES_LOCALSTORAGE_KEY]: DEPRECATED_USER_OVERRIDES_LOCALSTORAGE_KEY
};

/**
 *
 * MCP (Model Context Protocol)
 *
 * Components for managing MCP server connections and displaying server status.
 * MCP enables agentic workflows by connecting to external tool servers.
 *
 * The MCP system integrates with:
 * - `mcpStore` for server CRUD operations and health checks
 * - `conversationsStore` for per-conversation server enable/disable
 *
 * These are the MCP extension's own components. The core does not import
 * them; it gets what it draws through the extension points. Inside the
 * extension, import a component from its file, not from this barrel.
 *
 */

/**
 * **SettingsMcpServers** - MCP servers configuration section
 *
 * Settings section for configuring MCP server connections.
 * Displays server cards with status, tools, and management actions.
 * Used by the MCP servers dialog and the MCP servers page.
 *
 * **Architecture:**
 * - Manages add server form state locally
 * - Delegates server display to McpServerCard components
 * - Integrates with mcpStore for server operations
 * - Shows skeleton loading states during health checks
 *
 * **Features:**
 * - Add new MCP servers by URL with validation
 * - Server cards with connection status indicators
 * - Health check status (connected/disconnected/error)
 * - Tools list per server showing available capabilities
 * - Enable/disable toggle per conversation
 * - Edit/delete server actions
 * - Skeleton loading states during connection
 * - Empty state with helpful message
 *
 * @example
 * ```svelte
 * <SettingsMcpServers />
 * ```
 */
export { default as SettingsMcpServers } from './settings/SettingsMcpServers.svelte';

/**
 * **McpActiveServersAvatars** - Active MCP servers indicator
 *
 * Compact avatar row showing favicons of active MCP servers.
 * Displays up to 3 server icons with "+N" counter for additional servers.
 * Clickable to open MCP settings dialog.
 *
 * **Architecture:**
 * - Filters servers by enabled status and health check
 * - Fetches favicons from server URLs
 * - Integrates with conversationsStore for per-chat server state
 *
 * **Features:**
 * - Overlapping favicon avatars (max 3 visible)
 * - "+N" counter for additional servers
 * - Click handler for settings navigation
 * - Disabled state support
 * - Only shows healthy, enabled servers
 *
 * @example
 * ```svelte
 * <McpActiveServersAvatars
 *   onSettingsClick={() => showMcpSettings = true}
 * />
 * ```
 */
export { default as McpActiveServersAvatars } from './McpActiveServersAvatars.svelte';

/**
 * **McpCapabilitiesBadges** - Server capabilities display
 *
 * Displays MCP server capabilities as colored badges.
 * Shows which features the server supports (tools, resources, prompts, etc.).
 *
 * **Features:**
 * - Tools badge (green) - server provides callable tools
 * - Resources badge (blue) - server provides data resources
 * - Prompts badge (purple) - server provides prompt templates
 * - Logging badge (orange) - server supports logging
 * - Completions badge (cyan) - server provides completions
 * - Tasks badge (pink) - server supports task management
 */
export { default as McpCapabilitiesBadges } from './McpCapabilitiesBadges.svelte';

/**
 * **McpConnectionLogs** - Connection log viewer
 *
 * Collapsible panel showing MCP server connection logs.
 * Displays timestamped log entries with level-based styling.
 *
 * **Features:**
 * - Collapsible log list with entry count
 * - Connection time display in milliseconds
 * - Log level icons and color coding
 * - Scrollable log container with max height
 * - Monospace font for log readability
 */
export { default as McpConnectionLogs } from './McpConnectionLogs.svelte';

/**
 * **McpServerForm** - Server URL and headers input form
 *
 * Reusable form for entering MCP server connection details.
 * Used in both add new server and edit server flows.
 *
 * **Features:**
 * - URL input with validation error display
 * - Custom headers key-value pairs editor
 * - Controlled component with change callbacks
 *
 * @example
 * ```svelte
 * <McpServerForm
 *   url={serverUrl}
 *   headers={serverHeaders}
 *   onUrlChange={(v) => serverUrl = v}
 *   onHeadersChange={(v) => serverHeaders = v}
 *   urlError={validationError}
 * />
 * ```
 */
export { default as McpServerForm } from './McpServerForm.svelte';

/**
 * MCP protocol logo SVG component. Renders the official MCP icon
 * with customizable size via class and style props.
 */
export { default as McpLogo } from './McpLogo.svelte';

/**
 *
 * SERVER CARD
 *
 * Components for displaying individual MCP server status and controls.
 * McpServerCard is the main component, with sub-components for specific sections.
 *
 */

/**
 * **McpServerCard** - Individual server display card
 *
 * Main component for displaying a single MCP server with all its details.
 * Manages edit mode, delete confirmation, and health check actions.
 *
 * **Architecture:**
 * - Composes header, tools list, logs, and actions sub-components
 * - Manages local edit/delete state
 * - Reads health state from mcpStore
 * - Triggers health checks via mcpStore
 *
 * **Features:**
 * - Server header with favicon, name, version, and toggle
 * - Capabilities badges display
 * - Tools list with descriptions
 * - Connection logs viewer
 * - Edit form for URL and headers
 * - Delete confirmation dialog
 * - Skeleton loading states
 */
export { default as McpServerCard } from './McpServerCard/McpServerCard.svelte';

/** Server card header with favicon, name, version badge, and enable toggle. */
export { default as McpServerCardHeader } from './McpServerCard/McpServerCardHeader.svelte';

/** Action buttons row: edit, refresh, delete. */
export { default as McpServerCardActions } from './McpServerCard/McpServerCardActions.svelte';

/** Collapsible tools list showing available server tools with descriptions. */
export { default as McpServerCardToolsList } from './McpServerCard/McpServerCardToolsList.svelte';

/** Inline edit form for server URL and custom headers. */
export { default as McpServerCardEditForm } from './McpServerCard/McpServerCardEditForm.svelte';

/** Delete confirmation dialog with server name display. */
export { default as McpServerCardDeleteDialog } from './McpServerCard/McpServerCardDeleteDialog.svelte';

/** Skeleton loading state for server card during health checks. */
export { default as McpServerCardSkeleton } from './McpServerCardSkeleton.svelte';

/**
 * **McpServerCardCompact** - Condensed MCP server card
 *
 * Static card for picker-style UIs (e.g. recommended MCP servers in the
 * Add New Server dialog). Shows an optional favicon, the server name, and
 * a short description. Performs no network requests - safe to render
 * without contacting any upstream server until the user explicitly adds
 * the server.
 */
export { default as McpServerCardCompact } from './McpServerCard/McpServerCardCompact.svelte';

/**
 * **McpServerIdentity** - Server identity display (icon, name, version)
 *
 * Reusable headless component for displaying server name, favicon/icon, and version badge.
 * Accepts all data via props with no store dependencies for predictable rendering.
 *
 * **Features:**
 * - Server favicon/icon with fallback
 * - Truncated display name with max-width
 * - Optional version badge (v1.2.3)
 * - Optional external link to server website
 *
 * @example
 * ```svelte
 * <McpServerIdentity displayName={name} faviconUrl={iconUrl} serverInfo={info} />
 * ```
 */
export { default as McpServerIdentity } from './McpServerIdentity.svelte';

/**
 * **McpServerInfo** - Server instructions display
 *
 * Collapsible panel showing server-provided instructions.
 * Displays guidance text from the MCP server for users.
 */
export { default as McpServerInfo } from './McpServerInfo.svelte';

/**
 * **McpResourcesBrowser** - MCP resources tree browser
 *
 * Tree view component showing resources grouped by server.
 * Supports resource selection and quick attach actions.
 *
 * **Features:**
 * - Collapsible server sections
 * - Resource icons based on MIME type
 * - Resource selection highlighting
 * - Quick attach button per resource
 * - Refresh all resources action
 * - Loading states per server
 */
export { default as McpResourcesBrowser } from './McpResourcesBrowser/McpResourcesBrowser.svelte';

/**
 * **McpResourcePreview** - MCP resource content preview
 *
 * Preview panel showing resource content with metadata.
 * Supports text and binary content display.
 *
 * **Features:**
 * - Text content display with monospace formatting
 * - Image preview for image MIME types
 * - Copy to clipboard action
 * - Download content action
 * - Resource metadata display (MIME type, priority, server)
 * - Loading and error states
 */
export { default as McpResourcePreview } from './McpResourcePreview.svelte';

/**
 * **McpResourceTemplateForm** - MCP resource template variable form
 *
 * Form for filling in resource template variables with auto-completion
 * via the Completions API. Shows live URI preview as variables are filled.
 *
 * **Features:**
 * - Template variable input fields
 * - Completions API integration for variable auto-complete
 * - Live URI preview as variables are filled
 * - Read resolved resource action
 */
export { default as McpResourceTemplateForm } from './McpResourceTemplateForm.svelte';

/**
 *
 * CHAT
 *
 * What MCP draws in the chat: the prompt picker, pending resources, and the
 * prompts and resources of a message. The wrappers in `contributions/` hand
 * them to the extension points.
 *
 */

/**
 * **ChatFormPickerMcpPrompts** - MCP prompt selection interface
 *
 * Floating picker for browsing and selecting MCP Server Prompts.
 * Triggered by typing `/` in the chat input or choosing `MCP Prompt` option in ChatFormActionAddDropdown.
 * Loads prompts from connected MCP servers and allows users to select and configure them.
 *
 * **Architecture:**
 * - Fetches available prompts from mcpStore
 * - Manages selection state and keyboard navigation internally
 * - Delegates argument input to ChatFormPromptPickerArgumentForm
 * - Communicates prompt loading lifecycle via callbacks
 *
 * **Prompt Loading Flow:**
 * 1. User selects prompt → `onPromptLoadStart` called with placeholder ID
 * 2. Prompt content fetched from MCP server asynchronously
 * 3. On success → `onPromptLoadComplete` with full prompt data
 * 4. On failure → `onPromptLoadError` with error details
 *
 * **Features:**
 * - Search/filter prompts by name across all connected servers
 * - Keyboard navigation (↑/↓ to navigate, Enter to select, Esc to close)
 * - Argument input forms for prompts with required parameters
 * - Autocomplete suggestions for argument values
 * - Loading states with skeleton placeholders
 * - Server information header per prompt for visual identification
 *
 * **Exported API:**
 * - `handleKeydown(event): boolean` - Process keyboard events, returns true if handled
 *
 * @example
 * ```svelte
 * <ChatFormPickerMcpPrompts
 *   bind:this={pickerRef}
 *   isOpen={showPicker}
 *   searchQuery={promptQuery}
 *   onClose={() => showPicker = false}
 *   onPromptLoadStart={(id, info) => addPlaceholder(id, info)}
 *   onPromptLoadComplete={(id, result) => replacePlaceholder(id, result)}
 *   onPromptLoadError={(id, error) => handleError(id, error)}
 * />
 * ```
 */
export { default as ChatFormPickerMcpPrompts } from './chat/ChatFormPickerMcpPrompts/ChatFormPickerMcpPrompts.svelte';

/**
 * Form for entering MCP prompt arguments. Displays input fields for each
 * required argument defined by the prompt. Validates input and submits
 * when all required fields are filled. Shows argument descriptions as hints.
 */
export { default as ChatFormPromptPickerArgumentForm } from './chat/ChatFormPickerMcpPrompts/ChatFormPromptPickerArgumentForm.svelte';

/**
 * Single argument input field with autocomplete suggestions. Fetches suggestions
 * from MCP server based on argument type. Supports keyboard navigation through
 * suggestions list. Used within ChatFormPromptPickerArgumentForm.
 */
export { default as ChatFormPromptPickerArgumentInput } from './chat/ChatFormPickerMcpPrompts/ChatFormPromptPickerArgumentInput.svelte';

/**
 * Header for the prompt picker's items displaying server favicon, label, item title,
 * and optional description. Accepts `titleExtra` and `subtitle` snippets for
 * custom content like badges or URIs.
 */
export { default as ChatFormPickerItemHeader } from './chat/ChatFormPickerItemHeader.svelte';

/**
 * Displays MCP Resource attachments as a horizontal carousel.
 * Shows resource name, URI, and allows clicking to view resource content.
 */
export { default as ChatFormMcpResourcesList } from './chat/ChatFormMcpResourcesList.svelte';

/**
 * Displays MCP Prompt attachment with expandable content preview.
 * Shows server name, prompt name, and allows expanding to view full prompt arguments
 * and content. Used when user selects a prompt from ChatFormPickerMcpPrompts.
 */
export { default as ChatAttachmentsListItemMcpPrompt } from './chat/ChatAttachmentsListItemMcpPrompt.svelte';

/**
 * Displays a single MCP Resource attachment with icon, name, and server info.
 * Shows loading/error states and supports remove action.
 * Used within ChatAttachmentMcpResources for individual resource display.
 */
export { default as ChatAttachmentsListItemMcpResource } from './chat/ChatAttachmentsListItemMcpResource.svelte';

/**
 * MCP prompt display in user messages. Shows when user selected an MCP prompt
 * via ChatFormPickerMcpPrompts. Displays server name, prompt name, and expandable
 * content preview. Stored in message.extra as DatabaseMessageExtraMcpPrompt.
 */
export { default as ChatMessageMcpPrompt } from './chat/ChatMessageMcpPrompt/ChatMessageMcpPrompt.svelte';

/**
 * Formatted content display for MCP prompt messages. Renders the full prompt
 * content with arguments in a readable format. Used within ChatMessageMcpPrompt
 * for the expanded view.
 */
export { default as ChatMessageMcpPromptContent } from './chat/ChatMessageMcpPrompt/ChatMessageMcpPromptContent.svelte';

/**
 *
 * DIALOGS
 *
 * MCP dialogs: the servers list, adding a server, and browsing and previewing
 * resources.
 *
 */

/**
 * **DialogMcpServers** - MCP servers dialog shown from the chat form
 *
 * Shows the same MCP server list as the `/mcp-servers` route inside a modal
 * dialog.
 */
export { default as DialogMcpServers } from './dialogs/DialogMcpServers.svelte';

/**
 * **DialogMcpServerAddNew** - Add new MCP server dialog
 *
 * Modal dialog for adding a new MCP server with URL and optional headers.
 * Validates URL format and integrates with mcpStore and conversationsStore.
 */
export { default as DialogMcpServerAddNew } from './dialogs/DialogMcpServerAddNew.svelte';

/**
 * **DialogMcpResourcesBrowser** - MCP resources browser dialog
 *
 * Dialog for browsing and attaching MCP resources to chat context.
 * Displays resources from connected MCP servers in a tree structure
 * with preview panel and multi-select support.
 *
 * **Architecture:**
 * - Uses ShadCN Dialog with two-panel layout
 * - Left panel: McpResourcesBrowser with tree navigation
 * - Right panel: McpResourcePreview for selected resource
 * - Integrates with mcpStore for resource fetching and attachment
 *
 * **Features:**
 * - Tree-based resource navigation by server and path
 * - Single and multi-select with shift+click
 * - Resource preview with content display
 * - Quick attach button per resource
 * - Batch attach for multiple selections
 *
 * @example
 * ```svelte
 * <DialogMcpResourcesBrowser
 *   bind:open={showResources}
 *   onAttach={handleResourceAttach}
 * />
 * ```
 */
export { default as DialogMcpResourcesBrowser } from './dialogs/DialogMcpResourcesBrowser.svelte';

/**
 * **DialogMcpResourcePreview** - MCP resource content preview
 *
 * Dialog for previewing the content of a stored MCP resource attachment.
 * Displays the resource content with syntax highlighting for code,
 * image rendering for images, and plain text for other content.
 *
 * **Features:**
 * - Syntax highlighted code preview
 * - Image rendering for image resources
 * - Copy to clipboard and download actions
 * - Server name and favicon display
 * - MIME type badge
 *
 * @example
 * ```svelte
 * <DialogMcpResourcePreview
 *   bind:open={previewOpen}
 *   extra={mcpResourceExtra}
 * />
 * ```
 */
export { default as DialogMcpResourcePreview } from './dialogs/DialogMcpResourcePreview.svelte';

/**
 * huggingFaceStore - The Hugging Face account a share uploads with
 *
 * Holds the access token a share uploads with, the account it belongs to, and
 * the dataset traces went to last. The token is either one the user pasted or
 * one "Sign in with Hugging Face" got (OAuth with PKCE, in the browser); the
 * share dialog reads the same state either way.
 *
 * A sign-in with Hugging Face opens the authorization page in a popup, or in
 * this tab when the popup is blocked. Hugging Face sends the browser back to
 * the app's root with a code; that page load (the popup, or this tab) trades
 * it for tokens. The UI is served cross-origin isolated (COOP same-origin), so
 * the popup cannot reach the tab that opened it: the result goes out on a
 * BroadcastChannel to every tab of the app.
 */

import {
	HF_OAUTH_CALLBACK_PARAM,
	HF_OAUTH_CHANNEL_NAME,
	HF_OAUTH_EXPIRY_MARGIN_MS,
	HF_OAUTH_LOCALSTORAGE_KEY,
	HF_OAUTH_PENDING_TTL_MS,
	HF_TOKEN_LOCALSTORAGE_KEY,
	HF_TRACES_DATASET_LOCALSTORAGE_KEY,
	HF_TRACES_DEFAULT_DATASET_NAME
} from '#lib/constants/index.ts';
import { HfAuthMethod, HfOAuthFlowMode } from '#lib/enums/index.ts';
import { ConversationTransferService } from '#lib/services/conversation-transfer.service.ts';
import { HfOAuthService } from '#lib/services/hf-oauth.service.ts';
import { HfTracesService } from '#lib/services/hf-traces.service.ts';
// direct imports between stores, not via the barrel, to avoid circular deps
import { conversationsStore } from '#lib/stores/conversations/index.svelte.ts';
import type { HfDataset, HfOAuthRecord, HfOAuthResult, HfUser } from '#lib/types/index.ts';
import { buildConversationTrace } from '#lib/utils/index.ts';
import { browser } from '$app/env';

export interface ShareConversationOptions {
	conversationId: string;
	/** Last message of the trace; the whole current branch when omitted. */
	upToMessageId?: string;
	repoId: string;
	isPrivate: boolean;
	includeAttachments: boolean;
}

/** What a page load that came back from the Hugging Face authorization page did. */
export interface HfOAuthCallbackOutcome {
	/** The window was a sign-in popup: it is done and can close. */
	closeWindow: boolean;
	result: HfOAuthResult | null;
}

/** The callback's own query parameters, cleared from the address once read. */
const CALLBACK_PARAMS = [HF_OAUTH_CALLBACK_PARAM, 'code', 'state', 'error', 'error_description'];
const TOKEN_FALLBACK_HINT = 'Sign in with an access token instead.';

function readStorage(key: string): string | null {
	if (!browser) return null;

	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string | null): void {
	if (!browser) return;

	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// storage full or blocked; the value lives for this session only
	}
}

function readOAuthRecord(): HfOAuthRecord | null {
	try {
		const parsed: unknown = JSON.parse(readStorage(HF_OAUTH_LOCALSTORAGE_KEY) ?? 'null');

		return parsed && typeof parsed === 'object' ? (parsed as HfOAuthRecord) : null;
	} catch {
		return null;
	}
}

function writeOAuthRecord(record: HfOAuthRecord | null): void {
	writeStorage(HF_OAUTH_LOCALSTORAGE_KEY, record ? JSON.stringify(record) : null);
}

/** A plain sentence for an OAuth error code the authorization page sent back. */
function describeAuthorizationError(code: string): string {
	if (code === 'access_denied') return 'The sign-in was cancelled.';

	// only the code: its description comes from the address bar, anyone could have written it
	return `Hugging Face refused the sign-in (${code.replace(/[^\w.-]/g, '').slice(0, 64)}). ${TOKEN_FALLBACK_HINT}`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

class HuggingFaceStore {
	/** How the current token was signed in, if there is one. */
	authMethod = $state<HfAuthMethod | null>(null);

	/** Datasets of the account a share can go to, most recently changed first. */
	datasets = $state<HfDataset[]>([]);

	/** Set while the token is being checked against the Hub. */
	isCheckingToken = $state(false);

	/** Set while the account's datasets are being listed. */
	isLoadingDatasets = $state(false);

	/** Set while a sign-in with Hugging Face waits for the authorization page. */
	isSigningInWithHf = $state(false);

	/** Dataset the last share went to, `owner/name`. */
	lastDataset = $state<string | null>(readStorage(HF_TRACES_DATASET_LOCALSTORAGE_KEY));

	/** Why the last sign-in with Hugging Face failed. */
	oauthError = $state<string | null>(null);

	/** The account the token belongs to, once checked. */
	user = $state<HfUser | null>(null);

	#channel: BroadcastChannel | null = null;
	#token = $state<string | null>(null);

	get hasToken(): boolean {
		return !!this.#token;
	}

	get isSignedIn(): boolean {
		return !!this.#token && !!this.user;
	}

	/** Dataset a new share suggests: the last one, else one under the account's name. */
	get suggestedDataset(): string {
		if (this.lastDataset) return this.lastDataset;

		return this.user ? `${this.user.name}/${HF_TRACES_DEFAULT_DATASET_NAME}` : '';
	}

	/** Stop waiting for a sign-in the user gave up on, e.g. by closing the popup. */
	cancelSignInWithHf(): void {
		this.isSigningInWithHf = false;
	}

	/**
	 * Finish a sign-in with Hugging Face when this page load is the
	 * authorization page sending the browser back. Reads and clears the
	 * callback's parameters; returns null for any other page load.
	 */
	async completeSignInFromLocation(
		location: URL = new URL(window.location.href)
	): Promise<HfOAuthCallbackOutcome | null> {
		if (!location.searchParams.has(HF_OAUTH_CALLBACK_PARAM)) return null;

		const params = new URLSearchParams(location.search);
		const cleaned = new URL(location.href);

		for (const name of CALLBACK_PARAMS) cleaned.searchParams.delete(name);

		// a reload must not run the exchange again
		window.history.replaceState(window.history.state, '', cleaned.href);

		const record = readOAuthRecord();
		const pending = record?.pending;
		const state = params.get('state');

		if (
			!record ||
			!pending ||
			!state ||
			pending.state !== state ||
			Date.now() - pending.startedAt > HF_OAUTH_PENDING_TTL_MS
		) {
			console.warn(
				'[HF OAuth] A sign-in came back that this browser did not start, or already finished'
			);

			return { closeWindow: false, result: null };
		}

		writeOAuthRecord({ ...record, pending: undefined });

		const closeWindow = pending.mode === HfOAuthFlowMode.POPUP;
		const failure = params.get('error');
		const code = params.get('code');

		let result: HfOAuthResult;

		if (failure) {
			result = { error: describeAuthorizationError(failure), ok: false };
		} else if (!code || !record.clientId) {
			result = { error: 'Hugging Face sent no code back.', ok: false };
		} else {
			result = await this.#exchangeCode(record, code, pending.codeVerifier);
		}

		this.#publish(result);

		// a sign-in that took over this tab goes back to where it started: a navigation, so the
		// hash router follows it to the route
		if (!closeWindow && pending.returnUrl !== cleaned.href) {
			window.location.replace(pending.returnUrl);
		}

		return { closeWindow, result };
	}

	constructor() {
		this.#loadToken();
		this.#listen();
	}

	/**
	 * Lists the account's datasets for the share dialog. A failed list leaves it empty,
	 * so the dialog falls back to naming a new dataset.
	 */
	async loadDatasets(checkedToken?: string): Promise<void> {
		const user = this.user;

		if (!user || this.isLoadingDatasets) return;

		this.isLoadingDatasets = true;

		try {
			// a token that was just checked is not the store's token yet
			const token = checkedToken ?? (await this.#freshToken());

			if (!token) return;

			const datasets = await HfTracesService.listDatasets(token, user.name);

			// the account may have changed while the list was on its way
			if (this.user === user) this.datasets = datasets;
		} catch {
			if (this.user === user) this.datasets = [];
		} finally {
			this.isLoadingDatasets = false;
		}
	}

	/** Checks a remembered token once, so the dialog can show who is signed in. */
	async restoreSession(): Promise<void> {
		if (!this.#token || this.user || this.isCheckingToken) return;

		const token = await this.#freshToken().catch(() => null);

		if (!token) {
			// a sign-in that expired and could not be renewed: sign in again
			this.signOut();

			return;
		}

		try {
			await this.#checkToken(token);
		} catch {
			// a revoked or expired token: ask for a new one
			this.signOut();
		}
	}

	/**
	 * Uploads one branch of a conversation to a dataset as a trace.
	 * @returns The URL of the trace file on the Hub
	 */
	async shareConversation(options: ShareConversationOptions): Promise<string> {
		const token = await this.#freshToken();

		if (!token) throw new Error('Sign in to Hugging Face first.');

		const [exported] = await conversationsStore.getConversationsForExport([options.conversationId]);

		if (!exported) throw new Error('Conversation not found.');

		const trace = buildConversationTrace(exported, {
			includeAttachments: options.includeAttachments,
			upToMessageId: options.upToMessageId
		});
		const url = await HfTracesService.uploadTrace(token, {
			commitMessage: `Add trace: ${trace.conv.name}`,
			content: ConversationTransferService.serializeSessionToJsonl(trace),
			isPrivate: options.isPrivate,
			path: ConversationTransferService.generateConversationFilename(trace.conv, trace.messages),
			repoId: options.repoId
		});

		if (!this.datasets.some((dataset) => dataset.id === options.repoId)) {
			this.datasets = [{ id: options.repoId, isPrivate: options.isPrivate }, ...this.datasets];
		}

		this.lastDataset = options.repoId;
		writeStorage(HF_TRACES_DATASET_LOCALSTORAGE_KEY, options.repoId);

		return url;
	}

	/**
	 * Checks a pasted access token with the Hub and remembers it.
	 * @throws When the Hub rejects the token
	 */
	async signIn(token: string): Promise<HfUser> {
		const trimmed = token.trim();
		const user = await this.#checkToken(trimmed);

		this.#forgetOAuthTokens();
		this.#token = trimmed;
		this.authMethod = HfAuthMethod.ACCESS_TOKEN;
		writeStorage(HF_TOKEN_LOCALSTORAGE_KEY, trimmed);

		return user;
	}

	/**
	 * Start a sign-in with Hugging Face. Call it from the click that asks for
	 * it, with the popup opened in that same click (browsers block a popup
	 * opened later); without one, this tab goes to the authorization page.
	 */
	async signInWithHuggingFace(popup: Window | null): Promise<void> {
		const redirectUrl = HfOAuthService.redirectUrl();
		const record = readOAuthRecord();

		this.oauthError = null;
		this.isSigningInWithHf = true;

		try {
			// the client the app registered belongs to one redirect URL: a new origin registers again
			const clientId =
				record?.redirectUrl === redirectUrl && record.clientId
					? record.clientId
					: await HfOAuthService.register(redirectUrl);
			const { challenge, verifier } = await HfOAuthService.createPkce();
			const state = HfOAuthService.createState();

			writeOAuthRecord({
				clientId,
				pending: {
					codeVerifier: verifier,
					mode: popup ? HfOAuthFlowMode.POPUP : HfOAuthFlowMode.REDIRECT,
					returnUrl: window.location.href,
					startedAt: Date.now(),
					state
				},
				redirectUrl,
				tokens: record?.redirectUrl === redirectUrl ? record.tokens : undefined
			});

			const authorizationUrl = HfOAuthService.authorizationUrl({
				clientId,
				codeChallenge: challenge,
				redirectUrl,
				state
			});

			if (popup) popup.location.href = authorizationUrl.href;
			else window.location.assign(authorizationUrl.href);
		} catch (error) {
			popup?.close();
			this.#settle({ error: `${errorMessage(error)} ${TOKEN_FALLBACK_HINT}`, ok: false });
		}
	}

	signOut(): void {
		this.#token = null;
		this.user = null;
		this.authMethod = null;
		this.datasets = [];
		writeStorage(HF_TOKEN_LOCALSTORAGE_KEY, null);
		this.#forgetOAuthTokens();
	}

	async #checkToken(token: string): Promise<HfUser> {
		this.isCheckingToken = true;

		try {
			const user = await HfTracesService.whoAmI(token);

			this.user = user;
			void this.loadDatasets(token);

			return user;
		} finally {
			this.isCheckingToken = false;
		}
	}

	async #exchangeCode(
		record: HfOAuthRecord,
		code: string,
		codeVerifier: string
	): Promise<HfOAuthResult> {
		try {
			const tokens = await HfOAuthService.exchangeCode({
				clientId: record.clientId!,
				code,
				codeVerifier,
				redirectUrl: record.redirectUrl
			});

			if (!HfOAuthService.canWrite(tokens)) {
				return {
					error: `Hugging Face did not give Llama Chat write access to your repositories. ${TOKEN_FALLBACK_HINT}`,
					ok: false
				};
			}

			// one way of signing in at a time
			writeStorage(HF_TOKEN_LOCALSTORAGE_KEY, null);
			writeOAuthRecord({ ...record, pending: undefined, tokens });

			return { ok: true };
		} catch (error) {
			return { error: `${errorMessage(error)} ${TOKEN_FALLBACK_HINT}`, ok: false };
		}
	}

	#forgetOAuthTokens(): void {
		const record = readOAuthRecord();

		// the client registration stays: the next sign-in reuses it
		if (record?.tokens) writeOAuthRecord({ ...record, tokens: undefined });
	}

	/** The token to call the Hub with, renewing a sign-in with Hugging Face that is about to expire. */
	async #freshToken(): Promise<string | null> {
		if (this.authMethod !== HfAuthMethod.OAUTH) return this.#token;

		const record = readOAuthRecord();
		const tokens = record?.tokens;

		if (!record || !tokens) return null;

		if (!tokens.expiresAt || Date.now() < tokens.expiresAt - HF_OAUTH_EXPIRY_MARGIN_MS) {
			return tokens.accessToken;
		}

		if (!tokens.refreshToken || !record.clientId) return null;

		const renewed = await HfOAuthService.refresh(record.clientId, tokens.refreshToken);

		writeOAuthRecord({ ...record, tokens: renewed });
		this.#token = renewed.accessToken;

		return renewed.accessToken;
	}

	#listen(): void {
		if (!browser || typeof BroadcastChannel === 'undefined') return;

		this.#channel = new BroadcastChannel(HF_OAUTH_CHANNEL_NAME);
		this.#channel.onmessage = (event: MessageEvent<HfOAuthResult>) => this.#settle(event.data);
	}

	#loadToken(): void {
		const oauthToken = readOAuthRecord()?.tokens?.accessToken;
		const pasted = readStorage(HF_TOKEN_LOCALSTORAGE_KEY);

		this.#token = oauthToken ?? pasted;
		this.authMethod = oauthToken ? HfAuthMethod.OAUTH : pasted ? HfAuthMethod.ACCESS_TOKEN : null;
	}

	#publish(result: HfOAuthResult): void {
		this.#settle(result);
		// a channel does not hear its own messages: the other tabs do
		this.#channel?.postMessage(result);
	}

	#settle(result: HfOAuthResult): void {
		this.isSigningInWithHf = false;
		this.oauthError = result.ok ? null : (result.error ?? 'The sign-in failed.');

		if (!result.ok) return;

		// the tab that came back wrote the tokens: read them and check who signed in
		this.user = null;
		this.datasets = [];
		this.#loadToken();
		void this.restoreSession();
	}
}

export const huggingFaceStore = new HuggingFaceStore();

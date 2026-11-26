/**
 * The Hugging Face extension: one Hugging Face account, as a connector, and what it is used
 * for. Sharing conversations to datasets as agent traces, signing the Hugging Face MCP server
 * in, and gated model downloads. Built on @ggml-org/llama-huggingface.
 *
 * Everything reaches the core through what `activate` contributes here.
 */

import type { Extension } from '../types';
import { HUGGING_FACE_POPUP_CLOSE_GRACE_MS, HUGGING_FACE_SIGN_IN_TEXT } from './constants';
import {
	conversationShare,
	huggingFace,
	huggingFaceTools,
	isHuggingFaceMcpServer
} from './huggingface.svelte';
import HuggingFaceConnector from './HuggingFaceConnector.svelte';
import HuggingFaceConversationShare from './HuggingFaceConversationShare.svelte';
import HuggingFaceGatedNotice from './HuggingFaceGatedNotice.svelte';
import { HEADERS } from '#lib/constants/headers.constants.ts';
import { SHARE_ACTION } from '#lib/constants/icons.constants.ts';
import { toast } from 'svelte-sonner';

const EXTENSION_ID = 'huggingface';
const { CLOSE_WINDOW, FAILED, SIGNED_IN } = HUGGING_FACE_SIGN_IN_TEXT;

/** Finishes a sign-in when this page load is Hugging Face sending the browser back. */
async function completeSignIn(): Promise<void> {
	const outcome = await huggingFace.completeSignInFromLocation();

	if (!outcome?.result) return;

	const { result } = outcome;

	if (outcome.closeWindow) {
		window.close();

		// a browser may keep a window its script did not open in this document: say so
		setTimeout(() => {
			if (result.ok) toast.success(`${SIGNED_IN} ${CLOSE_WINDOW}`);
			else toast.error(`${result.error ?? FAILED} ${CLOSE_WINDOW}`);
		}, HUGGING_FACE_POPUP_CLOSE_GRACE_MS);

		return;
	}

	if (result.ok) toast.success(SIGNED_IN);
	else toast.error(result.error ?? FAILED);
}

const huggingFaceExtension: Extension = {
	activate(ctx) {
		ctx.contribute('connectors', { card: HuggingFaceConnector, id: EXTENSION_ID });

		ctx.contribute('conversationActions', {
			...SHARE_ACTION,
			id: EXTENSION_ID,
			run: (conversationId) => conversationShare.open({ conversationId })
		});
		ctx.contribute('messageActions', {
			...SHARE_ACTION,
			id: EXTENSION_ID,
			run: (target) => conversationShare.open(target)
		});
		ctx.contribute('overlays', HuggingFaceConversationShare);
		ctx.onDeactivate(() => conversationShare.close());

		// the one sign-in also covers the Hugging Face MCP server, and no other server
		ctx.contribute('serverAuth', {
			account: () => huggingFace.user?.name ?? null,
			covers: (serverUrl) => !!huggingFace.user && isHuggingFaceMcpServer(serverUrl),
			headers: async () => {
				const token = await huggingFace.freshToken();

				return token ? { [HEADERS.AUTHORIZATION]: `${HEADERS.BEARER}${token}` } : null;
			}
		});

		ctx.contribute('modelDownloadAuth', {
			// a sign-in that cannot be renewed must not stop a download that may need none
			token: async () => (await huggingFace.freshToken().catch(() => null)) ?? undefined
		});
		ctx.contribute('modelNotices', HuggingFaceGatedNotice);

		void completeSignIn();
		void huggingFace.restoreSession();
	}
};

export default huggingFaceExtension;

export { ConversationShareScope } from './constants';
export { buildConversationTrace, type ConversationTraceOptions } from './conversation-trace';
export { conversationShare, huggingFace, huggingFaceTools };

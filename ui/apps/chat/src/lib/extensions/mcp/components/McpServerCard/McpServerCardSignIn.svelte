<script lang="ts">
	import { mcpOAuthFlow } from '../../oauth/flow.svelte';
	import { mcpOAuthRedirectUrl } from '../../oauth/provider';
	import { mcpStore } from '../../stores/index.svelte';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Input } from '@ggml-org/llama-ui/ui/input';
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import { KeyRound, Loader2, LogIn, LogOut, ShieldCheck } from '@lucide/svelte';
	import { ActionIconCopyToClipboard } from '#lib/components/app/index.ts';
	import type { MCPServerSettingsEntry } from '#lib/types/index.ts';

	interface Props {
		server: MCPServerSettingsEntry;
		/** The server is connected right now. */
		connected: boolean;
	}

	let { connected, server }: Props = $props();

	const POPUP_NAME = 'llama-mcp-sign-in';
	const POPUP_FEATURES = 'popup,width=520,height=720';

	let target = $derived({ id: server.id, url: server.url, useProxy: server.useProxy });
	let signedIn = $derived(mcpOAuthFlow.isSignedIn(target));
	let signingIn = $derived(mcpOAuthFlow.isSigningIn(server.id));
	let needsSignIn = $derived(mcpOAuthFlow.needsSignIn(server.id));
	let needsClientId = $derived(mcpOAuthFlow.needsClientId(server.id));
	let error = $derived(mcpOAuthFlow.errorFor(server.id));
	let issuerHost = $derived(mcpOAuthFlow.issuerHost(target));
	let redirectUrl = $derived(mcpOAuthRedirectUrl());

	let clientId = $state('');
	let clientSecret = $state('');
	let signingOut = $state(false);

	function signIn() {
		// the popup opens in the click itself: a browser blocks one opened after an await
		const popup = window.open('', POPUP_NAME, POPUP_FEATURES);

		void mcpOAuthFlow.signIn(target, popup);
	}

	function useClientAndSignIn(event: SubmitEvent) {
		event.preventDefault();

		if (!clientId.trim()) return;

		mcpOAuthFlow.useClient(target, { clientId, clientSecret });
		clientSecret = '';
		signIn();
	}

	async function signOut() {
		signingOut = true;

		try {
			await mcpOAuthFlow.signOut(target);
			// its tools go with the tokens; the check that follows shows the sign-in again
			await mcpStore.disconnectServer(server.id);
			mcpStore.clearHealthCheck(server.id);
			await mcpStore.runHealthCheck(server, true);
		} finally {
			signingOut = false;
		}
	}
</script>

{#if signingIn}
	<div class="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
		<p class="flex items-center gap-2 text-caption text-muted-foreground">
			<Loader2 class="size-icon-md shrink-0 animate-spin" />

			Finish signing in in the window that opened.
		</p>

		<Button onclick={() => mcpOAuthFlow.cancelSignIn(server.id)} size="sm" variant="ghost">
			Cancel
		</Button>
	</div>
{:else if needsClientId}
	<form class="grid gap-2 rounded-md bg-muted/50 p-3" onsubmit={useClientAndSignIn}>
		<p class="text-caption text-muted-foreground">
			{issuerHost ?? 'This server'} does not register apps by itself. Register an OAuth app there with
			this redirect URL, then enter its client ID.
		</p>

		<div class="flex items-center gap-1 rounded bg-background px-2 py-1">
			<code class="min-w-0 flex-1 truncate text-caption">{redirectUrl}</code>

			<ActionIconCopyToClipboard ariaLabel="Copy the redirect URL" text={redirectUrl} />
		</div>

		<div class="grid gap-1">
			<Label class="text-caption" for="mcp-client-id-{server.id}">Client ID</Label>

			<Input bind:value={clientId} autocomplete="off" id="mcp-client-id-{server.id}" required />
		</div>

		<div class="grid gap-1">
			<Label class="text-caption" for="mcp-client-secret-{server.id}"
				>Client secret (if it has one)</Label
			>

			<Input
				bind:value={clientSecret}
				autocomplete="off"
				id="mcp-client-secret-{server.id}"
				type="password"
			/>
		</div>

		<Button class="justify-self-start" disabled={!clientId.trim()} size="sm" type="submit">
			<KeyRound class="size-icon-md" />

			Save and sign in
		</Button>
	</form>
{:else if needsSignIn}
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
		<p class="text-caption text-muted-foreground">This server needs you to sign in.</p>

		<Button onclick={signIn} size="sm">
			<LogIn class="size-icon-md" />

			{issuerHost ? `Sign in with ${issuerHost}` : 'Sign in'}
		</Button>
	</div>
{:else if signedIn && connected}
	<div class="flex items-center justify-between gap-3">
		<p class="flex items-center gap-1.5 text-caption text-muted-foreground">
			<ShieldCheck class="size-icon-md shrink-0" />

			{issuerHost ? `Signed in with ${issuerHost}` : 'Signed in'}
		</p>

		<Button disabled={signingOut} onclick={signOut} size="sm" variant="ghost">
			<LogOut class="size-icon-md" />

			Sign out
		</Button>
	</div>
{/if}

{#if error && !signingIn}
	<p class="text-caption text-destructive">{error}</p>
{/if}

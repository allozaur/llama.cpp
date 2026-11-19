<script lang="ts">
	import { ModelOrgAvatar } from '@ggml-org/llama-ui/models';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Checkbox } from '@ggml-org/llama-ui/ui/checkbox';
	import { Input } from '@ggml-org/llama-ui/ui/input';
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import * as RadioGroup from '@ggml-org/llama-ui/ui/radio-group';
	import * as Select from '@ggml-org/llama-ui/ui/select';
	import {
		Check,
		Copy,
		ExternalLink,
		Loader2,
		Lock,
		Plus,
		Share2,
		TriangleAlert
	} from '@lucide/svelte';
	import {
		HF_NEW_DATASET_VALUE,
		HF_NEW_TOKEN_URL,
		HF_OAUTH_POPUP_FEATURES,
		HF_OAUTH_POPUP_NAME,
		HF_REPO_ID_REGEX,
		HF_TRACES_DEFAULT_DATASET_NAME,
		HF_TRACES_DOCS_URL
	} from '#lib/constants/index.ts';
	import { HfAuthMethod, TraceShareScope } from '#lib/enums/index.ts';
	import { conversationsStore, huggingFaceStore, uiStore } from '#lib/stores/index.ts';
	import { copyToClipboard, filterByLeafNodeId } from '#lib/utils/index.ts';
	import { tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	let options = $derived(uiStore.conversationShare);
	let conversation = $derived(
		conversationsStore.conversations.find((conv) => conv.id === options?.conversationId)
	);

	let messages = $state<DatabaseMessage[]>([]);
	let token = $state('');
	let signInError = $state<string | null>(null);
	let scope = $state<TraceShareScope>(TraceShareScope.ALL);
	/** A listed dataset's ID, or HF_NEW_DATASET_VALUE to name a new one. */
	let datasetChoice = $state('');
	let newDataset = $state('');
	let newDatasetInput = $state<HTMLInputElement | null>(null);
	let isPrivate = $state(false);
	let includeAttachments = $state(false);
	let isSharing = $state(false);
	let shareError = $state<string | null>(null);
	let sharedUrl = $state<string | null>(null);

	// a fresh form every time the dialog opens
	$effect.pre(() => {
		if (!options) return;

		const { conversationId, messageId } = options;

		untrack(() => {
			token = '';
			signInError = null;
			scope = messageId ? TraceShareScope.UP_TO_MESSAGE : TraceShareScope.ALL;
			datasetChoice = '';
			newDataset = '';
			isPrivate = false;
			includeAttachments = false;
			shareError = null;
			sharedUrl = null;
			messages = [];

			if (!huggingFaceStore.isSigningInWithHf) huggingFaceStore.oauthError = null;
		});

		// the list is fetched again on every open, so datasets made elsewhere show up
		void huggingFaceStore.restoreSession().then(() => huggingFaceStore.loadDatasets());

		void conversationsStore.getConversationMessages(conversationId).then((loaded) => {
			if (uiStore.conversationShare?.conversationId === conversationId) messages = loaded;
		});
	});

	let leafId = $derived(
		scope === TraceShareScope.UP_TO_MESSAGE && options?.messageId
			? options.messageId
			: (conversation?.currNode ?? '')
	);
	let tracePath = $derived(messages.length ? filterByLeafNodeId(messages, leafId) : []);
	let wholeCount = $derived(
		messages.length ? filterByLeafNodeId(messages, conversation?.currNode ?? '').length : 0
	);
	let upToCount = $derived(
		messages.length && options?.messageId
			? filterByLeafNodeId(messages, options.messageId).length
			: 0
	);
	let hasAttachments = $derived(tracePath.some((message) => !!message.extra?.length));

	let user = $derived(huggingFaceStore.user);
	let datasets = $derived(huggingFaceStore.datasets);
	let isNewDataset = $derived(datasetChoice === HF_NEW_DATASET_VALUE);
	let dataset = $derived(isNewDataset ? newDataset.trim() : datasetChoice);
	let pickedDataset = $derived(datasets.find((entry) => entry.id === datasetChoice));

	// once the account's datasets are in, pick the one traces went to last, else offer a new one;
	// this also covers a sign-in that finished elsewhere (a popup, another tab)
	$effect(() => {
		if (!options || !user || datasetChoice || huggingFaceStore.isLoadingDatasets) return;

		const suggested = huggingFaceStore.suggestedDataset;
		const isListed = datasets.some((entry) => entry.id === suggested);

		untrack(() => {
			datasetChoice = isListed ? suggested : HF_NEW_DATASET_VALUE;
			newDataset = isListed ? `${user.name}/` : suggested;
		});
	});
	let isReadOnlyToken = $derived(
		huggingFaceStore.authMethod === HfAuthMethod.ACCESS_TOKEN && user?.tokenRole === 'read'
	);
	let isSigningInWithHf = $derived(huggingFaceStore.isSigningInWithHf);
	let isBusySigningIn = $derived(huggingFaceStore.isCheckingToken || isSigningInWithHf);
	let isDatasetValid = $derived(HF_REPO_ID_REGEX.test(dataset));
	// the owner alone, as the field starts, is not a mistake yet
	let isDatasetNameStarted = $derived(!!dataset && !dataset.endsWith('/'));
	let canShare = $derived(
		!!user && !isReadOnlyToken && isDatasetValid && tracePath.length > 0 && !isSharing
	);

	async function handleDatasetChoice(value: string) {
		if (value !== HF_NEW_DATASET_VALUE) return;

		await tick();
		newDatasetInput?.focus();
	}

	function close() {
		if (isSharing) return;

		uiStore.conversationShare = null;
	}

	async function handleSignIn(event: SubmitEvent) {
		event.preventDefault();

		if (!token.trim()) return;

		signInError = null;

		try {
			await huggingFaceStore.signIn(token);

			token = '';
		} catch (error) {
			signInError = error instanceof Error ? error.message : String(error);
		}
	}

	function handleSignInWithHf() {
		signInError = null;

		// opened in the click itself: a popup opened after an await is blocked
		const popup = window.open('about:blank', HF_OAUTH_POPUP_NAME, HF_OAUTH_POPUP_FEATURES);

		void huggingFaceStore.signInWithHuggingFace(popup);
	}

	function handleSignOut() {
		huggingFaceStore.signOut();
	}

	async function handleShare(event: SubmitEvent) {
		event.preventDefault();

		if (!canShare || !options) return;

		isSharing = true;
		shareError = null;

		try {
			sharedUrl = await huggingFaceStore.shareConversation({
				conversationId: options.conversationId,
				includeAttachments: hasAttachments && includeAttachments,
				isPrivate: isNewDataset ? isPrivate : !!pickedDataset?.isPrivate,
				repoId: dataset,
				upToMessageId: scope === TraceShareScope.UP_TO_MESSAGE ? options.messageId : undefined
			});
			toast.success('Conversation shared to Hugging Face');
		} catch (error) {
			shareError = error instanceof Error ? error.message : String(error);
		} finally {
			isSharing = false;
		}
	}

	async function handleCopyLink() {
		if (sharedUrl) await copyToClipboard(sharedUrl, 'Link copied');
	}

	function messageCountLabel(count: number): string {
		return count === 1 ? '1 message' : `${count} messages`;
	}
</script>

<AlertDialog.Root onOpenChange={(open) => !open && close()} open={options !== null}>
	<AlertDialog.Content class="sm:max-w-lg">
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<Share2 class="h-5 w-5" />

				Share to Hugging Face
			</AlertDialog.Title>

			<AlertDialog.Description>
				Upload {conversation ? `"${conversation.name}"` : 'this conversation'} to a Hugging Face dataset
				as an
				<a class="underline" href={HF_TRACES_DOCS_URL} rel="noopener noreferrer" target="_blank">
					agent trace
				</a>, which the Hub shows in its trace viewer.
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if sharedUrl}
			<div class="flex flex-col gap-3">
				<p class="flex items-center gap-2 text-sm">
					<Check class="h-4 w-4 text-primary" />
					Shared to <span class="font-medium">{dataset.trim()}</span>
				</p>

				<div class="flex gap-2">
					<Button class="flex-1" href={sharedUrl} rel="noopener noreferrer" target="_blank">
						<ExternalLink class="h-4 w-4" />
						Open on Hugging Face
					</Button>

					<Button onclick={handleCopyLink} variant="outline">
						<Copy class="h-4 w-4" />
						Copy link
					</Button>
				</div>
			</div>

			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Done</AlertDialog.Cancel>
			</AlertDialog.Footer>
		{:else if !user}
			<form class="contents" onsubmit={handleSignIn}>
				<div class="flex flex-col gap-2">
					<Button
						disabled={isBusySigningIn}
						onclick={handleSignInWithHf}
						type="button"
						variant="outline"
					>
						{#if isSigningInWithHf}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<ModelOrgAvatar org="huggingface" size="size-4" />
						{/if}
						Sign in with Hugging Face
					</Button>

					{#if isSigningInWithHf}
						<p class="text-xs text-muted-foreground">
							Finish signing in on the Hugging Face page.
							<button
								class="underline"
								onclick={() => huggingFaceStore.cancelSignInWithHf()}
								type="button"
							>
								Cancel
							</button>
						</p>
					{:else if huggingFaceStore.oauthError}
						<p class="text-xs text-destructive">{huggingFaceStore.oauthError}</p>
					{/if}
				</div>

				<div class="flex items-center gap-3 text-xs text-muted-foreground">
					<span class="h-px flex-1 bg-border"></span>
					or use an access token
					<span class="h-px flex-1 bg-border"></span>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="hf-token">Hugging Face access token</Label>

					<Input
						bind:value={token}
						autocomplete="off"
						disabled={isBusySigningIn}
						id="hf-token"
						placeholder="hf_..."
						type="password"
					/>

					<p class="text-xs text-muted-foreground">
						<a class="underline" href={HF_NEW_TOKEN_URL} rel="noopener noreferrer" target="_blank">
							Create a token with write access
						</a>. It stays in this browser and is sent only to huggingface.co.
					</p>

					{#if signInError}
						<p class="text-xs text-destructive">{signInError}</p>
					{/if}
				</div>

				<AlertDialog.Footer>
					<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>

					<Button disabled={!token.trim() || isBusySigningIn} type="submit">
						{#if huggingFaceStore.isCheckingToken}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						Sign in
					</Button>
				</AlertDialog.Footer>
			</form>
		{:else}
			<form class="contents" onsubmit={handleShare}>
				<div class="flex flex-col gap-4">
					<div class="flex items-center gap-2 text-sm">
						<ModelOrgAvatar org={user.name} size="size-6" />

						<span class="min-w-0 flex-1 truncate">
							Signed in as <span class="font-medium">{user.name}</span>
						</span>

						<Button disabled={isSharing} onclick={handleSignOut} size="sm" variant="ghost">
							Sign out
						</Button>
					</div>

					{#if isReadOnlyToken}
						<p class="text-xs text-destructive">
							This token can only read. <a
								class="underline"
								href={HF_NEW_TOKEN_URL}
								rel="noopener noreferrer"
								target="_blank">Create one with write access</a
							>, then sign out and in again.
						</p>
					{/if}

					{#if options?.messageId}
						<RadioGroup.Root
							class="gap-2"
							onValueChange={(value) => (scope = value as TraceShareScope)}
							value={scope}
						>
							<div class="flex items-center gap-2">
								<RadioGroup.Item id="share-scope-up-to" value={TraceShareScope.UP_TO_MESSAGE} />

								<Label class="cursor-pointer text-sm font-normal" for="share-scope-up-to">
									Up to this message
									{#if upToCount}<span class="text-muted-foreground"
											>({messageCountLabel(upToCount)})</span
										>{/if}
								</Label>
							</div>

							<div class="flex items-center gap-2">
								<RadioGroup.Item id="share-scope-all" value={TraceShareScope.ALL} />

								<Label class="cursor-pointer text-sm font-normal" for="share-scope-all">
									Whole conversation
									{#if wholeCount}<span class="text-muted-foreground"
											>({messageCountLabel(wholeCount)})</span
										>{/if}
								</Label>
							</div>
						</RadioGroup.Root>
					{/if}

					<div class="flex flex-col gap-2">
						<Label for="hf-dataset-choice">Dataset</Label>

						<Select.Root
							bind:value={datasetChoice}
							disabled={isSharing || (!datasetChoice && huggingFaceStore.isLoadingDatasets)}
							onValueChange={(value) => void handleDatasetChoice(value)}
							type="single"
						>
							<Select.Trigger class="w-full" id="hf-dataset-choice">
								<span class="flex min-w-0 items-center gap-2">
									{#if !datasetChoice}
										<Loader2 class="animate-spin" />

										<span class="text-muted-foreground">Loading your datasets...</span>
									{:else if isNewDataset}
										<Plus />

										<span>New dataset</span>
									{:else}
										<span class="truncate">{datasetChoice}</span>

										{#if pickedDataset?.isPrivate}<Lock />{/if}
									{/if}
								</span>
							</Select.Trigger>

							<Select.Content class="max-h-72">
								{#each datasets as entry (entry.id)}
									<Select.Item label={entry.id} value={entry.id}>
										<span class="min-w-0 truncate">{entry.id}</span>

										{#if entry.isPrivate}<Lock aria-label="Private" />{/if}
									</Select.Item>
								{/each}

								{#if datasets.length}
									<Select.Separator />
								{/if}

								<Select.Item label="New dataset" value={HF_NEW_DATASET_VALUE}>
									<Plus />

									New dataset
								</Select.Item>
							</Select.Content>
						</Select.Root>

						{#if isNewDataset}
							<Input
								bind:ref={newDatasetInput}
								bind:value={newDataset}
								aria-label="New dataset name"
								autocomplete="off"
								disabled={isSharing}
								id="hf-dataset"
								placeholder="{user.name}/{HF_TRACES_DEFAULT_DATASET_NAME}"
							/>
						{/if}

						<p class="text-xs text-muted-foreground">
							{#if isNewDataset && isDatasetNameStarted && !isDatasetValid}
								<span class="text-destructive">Use the form owner/name.</span>
							{:else if isNewDataset && datasets.some((entry) => entry.id === dataset)}
								{dataset} already exists: the trace goes to it.
							{:else if isNewDataset}
								Created on Hugging Face when you share. Each share adds one file to it.
							{:else}
								Each share adds one file to it.
							{/if}
						</p>
					</div>

					<div class="flex flex-col gap-3">
						{#if isNewDataset}
							<div class="flex items-center gap-2">
								<Checkbox bind:checked={isPrivate} disabled={isSharing} id="hf-private" />

								<Label class="cursor-pointer text-sm font-normal" for="hf-private">
									Make the new dataset private
								</Label>
							</div>
						{/if}

						{#if hasAttachments}
							<div class="flex items-center gap-2">
								<Checkbox
									bind:checked={includeAttachments}
									disabled={isSharing}
									id="hf-attachments"
								/>

								<Label class="cursor-pointer text-sm font-normal" for="hf-attachments">
									Include attachments
								</Label>
							</div>
						{/if}
					</div>

					<p class="flex gap-2 text-xs text-muted-foreground">
						<TriangleAlert class="h-4 w-4 shrink-0" />
						Traces can hold personal data, file paths, tool output and secrets. Review the conversation
						before you share it to a public dataset.
					</p>

					{#if shareError}
						<p class="text-xs text-destructive">{shareError}</p>
					{/if}
				</div>

				<AlertDialog.Footer>
					<AlertDialog.Cancel disabled={isSharing} type="button">Cancel</AlertDialog.Cancel>

					<Button disabled={!canShare} type="submit">
						{#if isSharing}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						Share
					</Button>
				</AlertDialog.Footer>
			</form>
		{/if}
	</AlertDialog.Content>
</AlertDialog.Root>

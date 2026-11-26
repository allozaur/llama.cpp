<script lang="ts">
	import type { HfAccount } from './account.svelte.js';
	import HfAccountPanel from './HfAccountPanel.svelte';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import { untrack } from 'svelte';

	interface Props {
		account: HfAccount;
		open: boolean;
		/** Why the account is asked for here. */
		description: string;
		tokenAlsoSentTo?: string;
	}

	let { account, description, open = $bindable(), tokenAlsoSentTo }: Props = $props();

	$effect(() => {
		if (open) untrack(() => void account.restoreSession());
	});
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="sm:max-w-lg">
		<AlertDialog.Header>
			<AlertDialog.Title>Hugging Face account</AlertDialog.Title>

			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>

		<HfAccountPanel {account} {tokenAlsoSentTo} />

		<AlertDialog.Footer>
			<AlertDialog.Cancel type="button">{account.user ? 'Done' : 'Cancel'}</AlertDialog.Cancel>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

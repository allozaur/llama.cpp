<script lang="ts" module>
	import { tabConversations } from '../screen/fixtures';
	import { defineMeta } from '@storybook/sveltekit';
	import ChatTabs from '#lib/components/app/chat/ChatTabs/ChatTabs.svelte';
	import { NEW_CHAT_TAB_ID } from '#lib/constants/index.ts';
	import { chatStore, conversationsStore, tabsStore } from '#lib/stores/index.ts';
	import { page } from '$app/state';

	const { Story } = defineMeta({
		component: ChatTabs,
		parameters: {
			layout: 'fullscreen'
		},
		title: 'Llama Chat/Chat/ChatTabs/ChatTabs'
	});

	/** The route the tabs are on: a conversation's, or a new chat's without an id. */
	function setRoute(id?: string) {
		page.params = id ? { id } : {};
		page.route = { id: id ? '/(chat)/chat/[id]' : '/(chat)' };
	}

	function seedTabs(routeId: string | undefined, openTabs: string[], loadingIds: string[] = []) {
		setRoute(routeId);

		conversationsStore.conversations = tabConversations;
		tabsStore.openTabs = openTabs;

		for (const conv of tabConversations) {
			chatStore.setChatLoading(conv.id, loadingIds.includes(conv.id));
		}
	}
</script>

<Story asChild beforeEach={() => seedTabs('conv-2', ['conv-1', 'conv-2', 'conv-3'])} name="Default">
	<div class="w-[56rem]" style="--sidebar-width: 0px">
		<ChatTabs />
	</div>
</Story>

<!-- a new-chat tab is open, so the New chat button is hidden -->
<Story
	asChild
	beforeEach={() => seedTabs(undefined, ['conv-1', 'conv-2', NEW_CHAT_TAB_ID])}
	name="NewChatTabActive"
>
	<div class="w-[56rem]" style="--sidebar-width: 0px">
		<ChatTabs />
	</div>
</Story>

<Story
	asChild
	beforeEach={() =>
		seedTabs('conv-1', ['conv-1', 'conv-2', 'conv-3', 'conv-5'], ['conv-1', 'conv-3'])}
	name="WithLoadingTabs"
>
	<div class="w-[56rem]" style="--sidebar-width: 0px">
		<ChatTabs />
	</div>
</Story>

<!-- more tabs than fit: edge fades show and the active tab scrolls into view -->
<Story
	asChild
	beforeEach={() =>
		seedTabs(
			'conv-9',
			tabConversations.map((c) => c.id),
			['conv-6']
		)}
	name="ManyTabsOverflow"
>
	<div class="w-[40rem]" style="--sidebar-width: 0px">
		<ChatTabs />
	</div>
</Story>

<!-- conversation id not in the store: falls back to the unnamed label -->
<Story
	asChild
	beforeEach={() => seedTabs('conv-missing', ['conv-1', 'conv-missing'])}
	name="UnnamedChat"
>
	<div class="w-[56rem]" style="--sidebar-width: 0px">
		<ChatTabs />
	</div>
</Story>

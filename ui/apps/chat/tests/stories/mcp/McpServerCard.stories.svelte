<script lang="ts" module>
	import { seedServerHealth, seedSignInStates, servers, signInServers } from './fixtures';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import McpServerCard from '#lib/extensions/mcp/components/McpServerCard/McpServerCard.svelte';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';
	import { expect } from 'storybook/test';

	const { Story } = defineMeta({
		component: McpServerCard,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/MCP/McpServerCard'
	});

	const handlers = {
		onDelete: () => console.log('delete'),
		onToggle: (enabled: boolean) => console.log('toggle', enabled),
		onUpdate: (updates: object) => console.log('update', updates)
	};
</script>

<Story asChild beforeEach={seedServerHealth} name="Default">
	<StateGallery columns={2} minItemWidth="24rem">
		<StateGalleryItem label="Connected">
			<McpServerCard {...handlers} enabled server={servers.connected} />
		</StateGalleryItem>

		<StateGalleryItem label="Connecting">
			<McpServerCard {...handlers} enabled server={servers.connecting} />
		</StateGalleryItem>

		<StateGalleryItem label="Error">
			<McpServerCard {...handlers} enabled server={servers.error} />
		</StateGalleryItem>

		<StateGalleryItem label="Disabled">
			<McpServerCard {...handlers} enabled={false} server={servers.disabled} />
		</StateGalleryItem>
	</StateGallery>
</Story>

<Story
	asChild
	beforeEach={seedSignInStates}
	name="Sign-in"
	play={async ({ canvas }) => {
		await expect(
			await canvas.findByRole('button', { name: 'Sign in with auth.example.com' })
		).toBeInTheDocument();
		await expect(
			canvas.getByText('Finish signing in in the window that opened.')
		).toBeInTheDocument();
		await expect(canvas.getByLabelText('Client ID')).toBeInTheDocument();
		await expect(canvas.getByText('Signed in with auth.example.com')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
	}}
>
	<StateGallery columns={2} minItemWidth="24rem">
		<StateGalleryItem label="Needs a sign-in">
			<McpServerCard {...handlers} enabled server={signInServers.needsSignIn} />
		</StateGalleryItem>

		<StateGalleryItem label="Signing in">
			<McpServerCard {...handlers} enabled server={signInServers.signingIn} />
		</StateGalleryItem>

		<StateGalleryItem label="Needs a client ID">
			<McpServerCard {...handlers} enabled server={signInServers.needsClientId} />
		</StateGalleryItem>

		<StateGalleryItem label="Signed in">
			<McpServerCard {...handlers} enabled server={signInServers.signedIn} />
		</StateGalleryItem>
	</StateGallery>
</Story>

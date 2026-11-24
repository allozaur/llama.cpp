<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ChatMessageActionCardContinueRequest from '#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardContinueRequest.svelte';
	import ChatMessageActionCardPermissionRequest from '#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardPermissionRequest.svelte';
	import { BuiltInTool } from '#lib/enums/index.ts';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';

	const { Story } = defineMeta({
		component: ChatMessageActionCardPermissionRequest,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Chat/ChatMessages/ChatMessageActionCard'
	});

	const onDecision = () => {};
</script>

<Story asChild name="States">
	<StateGallery columns={2}>
		<StateGalleryItem label="Permission" note="MCP server tool">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				request={{
					patterns: [],
					serverLabel: 'GitHub',
					toolCallId: 'call-1',
					toolKey: 'mcp:github:create_issue',
					toolName: 'create_issue'
				}}
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Permission, shell command" note="Pattern to remember, in a folder">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				request={{
					command: 'npm run test -- --run && git push origin main',
					cwd: '/Users/me/code/llama.cpp',
					patterns: ['npm run test *', 'git push *'],
					serverLabel: '',
					toolCallId: 'call-2',
					toolKey: `server:${BuiltInTool.SERVER_EXEC_SHELL_COMMAND}`,
					toolName: BuiltInTool.SERVER_EXEC_SHELL_COMMAND
				}}
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Continue request">
			<ChatMessageActionCardContinueRequest {onDecision} />
		</StateGalleryItem>
	</StateGallery>
</Story>

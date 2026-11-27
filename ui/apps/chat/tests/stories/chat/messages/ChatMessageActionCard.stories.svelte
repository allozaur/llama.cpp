<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ChatMessageActionCardContinueRequest from '#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardContinueRequest.svelte';
	import ChatMessageActionCardPermissionRequest from '#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardPermissionRequest.svelte';
	import ChatMessageActionCardSkillDetail from '#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardSkillDetail.svelte';
	import { BuiltInTool } from '#lib/enums/index.ts';
	import { type ToolCallPermission, toolCallPermissionDetail } from '#lib/extensions/index.ts';
	import McpSkillPermissionDetail from '#lib/extensions/mcp/components/skills/McpSkillPermissionDetail.svelte';
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

	const SKILL_URI = 'skill://hf-mem/SKILL.md';
	// a call that asks for what it loads, here a skill of an MCP server, in place of its tool
	const skillPermission: ToolCallPermission = {
		allow: () => {},
		alwaysLabel: 'Always allow this skill',
		detail: toolCallPermissionDetail(McpSkillPermissionDetail, {
			hasChanged: true,
			serverId: 'huggingface',
			skill: {
				frontmatter: {
					description:
						'Estimate the GPU memory needed to run a Hugging Face model and whether it fits on given GPUs, without downloading it.',
					name: 'hf-mem'
				},
				resources: [{ digest: `sha256:${'0'.repeat(64)}`, size: 1905, uri: SKILL_URI }],
				uri: SKILL_URI
			}
		}),
		isGranted: false,
		source: 'Hugging Face',
		subject: 'the skill hf-mem'
	};
	// the same for a skill of a folder on the machine llama-server runs on
	const localSkillPermission: ToolCallPermission = {
		allow: () => {},
		alwaysLabel: 'Always allow this skill',
		detail: toolCallPermissionDetail(ChatMessageActionCardSkillDetail, {
			description:
				'Build multiple genuinely different versions of a UI piece, rendered behind a visual picker.',
			hasChanged: false,
			path: '~/.agents/skills/prototype/SKILL.md'
		}),
		isGranted: false,
		source: '~/.agents/skills',
		subject: 'the skill prototype'
	};
</script>

<Story asChild name="States">
	<StateGallery columns={2}>
		<StateGalleryItem label="Permission" note="MCP server tool">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				serverLabel="GitHub"
				toolName="create_issue"
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Permission, built-in tool">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				serverLabel=""
				toolName={BuiltInTool.SERVER_EXEC_SHELL_COMMAND}
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Permission for what a call loads" note="a skill of an MCP server">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				permission={skillPermission}
				serverLabel={skillPermission.source}
				toolName={BuiltInTool.BROWSER_LOAD_SKILL}
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Permission for what a call loads" note="a skill of a folder">
			<ChatMessageActionCardPermissionRequest
				{onDecision}
				permission={localSkillPermission}
				serverLabel={localSkillPermission.source}
				toolName={BuiltInTool.BROWSER_LOAD_SKILL}
			/>
		</StateGalleryItem>

		<StateGalleryItem label="Continue request">
			<ChatMessageActionCardContinueRequest {onDecision} />
		</StateGalleryItem>
	</StateGallery>
</Story>

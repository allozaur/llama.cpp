<script lang="ts">
	import { MCP_SKILL_MANIFEST_NAME } from '../../skills/constants';
	import { mcpStore } from '../../stores/index.svelte';
	import DialogMcpResourcePreview from '../dialogs/DialogMcpResourcePreview.svelte';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Loader2 } from '@lucide/svelte';
	import type { Skill } from '@modelcontextprotocol/client/ext/skills';
	import { AttachmentType, MimeTypeText } from '#lib/enums/index.ts';
	import type { DatabaseMessageExtraMcpResource } from '#lib/types/index.ts';
	import { toast } from 'svelte-sonner';

	interface Props {
		/** The app's id of the server the skill is from. */
		serverId: string;
		skill: Skill;
	}

	let { serverId, skill }: Props = $props();

	let isReading = $state(false);
	// the file is fetched on the first click: looking at a skill is the need for it
	let preview = $state<DatabaseMessageExtraMcpResource | null>(null);
	let isPreviewOpen = $state(false);

	async function read() {
		isReading = true;

		try {
			const file = await mcpStore.skills.read(serverId, skill);

			preview = {
				content: file.text ?? '',
				mimeType: file.mimeType ?? MimeTypeText.MARKDOWN,
				name: skill.frontmatter.name,
				serverName: serverId,
				type: AttachmentType.MCP_RESOURCE,
				uri: file.uri
			};
			isPreviewOpen = true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isReading = false;
		}
	}
</script>

<Button
	class="h-6 px-2 text-caption"
	disabled={isReading}
	onclick={read}
	size="sm"
	variant="outline"
>
	{#if isReading}
		<Loader2 class="size-icon-xs animate-spin" />
	{/if}

	Read {MCP_SKILL_MANIFEST_NAME}
</Button>

{#if preview}
	<DialogMcpResourcePreview bind:open={isPreviewOpen} extra={preview} />
{/if}

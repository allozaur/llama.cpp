<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BackgroundTasksCard from '#lib/components/app/chat/ChatSideCards/BackgroundTasksCard.svelte';
	import { BackgroundTaskStatus } from '#lib/enums/index.ts';
	import type { BackgroundTask } from '#lib/types/index.ts';

	const { Story } = defineMeta({
		component: BackgroundTasksCard,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Chat/BackgroundTasksCard'
	});

	const NOW = 1_795_258_400_000;

	const DEV_SERVER: BackgroundTask = {
		command: 'npm run dev -- --port 5173',
		conversationId: 'chat-1',
		cwd: '/Users/me/projects/site',
		endedAt: null,
		exitCode: null,
		id: 3,
		key: 'a-3',
		nextOffset: 200,
		output:
			'\n> site@1.0.0 dev\n> vite dev --port 5173\n\n  \x1b[32m\x1b[1mVITE\x1b[22m v7.1.4\x1b[39m  ready in 412 ms\n\n  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:5173/\x1b[39m\n',
		startedAt: NOW - 134_000,
		status: BackgroundTaskStatus.RUNNING
	};

	const TASKS: BackgroundTask[] = [
		DEV_SERVER,
		{
			command: 'npx tsc --watch --noEmit',
			conversationId: 'chat-2',
			cwd: '/Users/me/projects/site',
			endedAt: null,
			exitCode: null,
			id: 2,
			key: 'a-2',
			nextOffset: 0,
			output: '',
			startedAt: NOW - 600_000,
			status: BackgroundTaskStatus.RUNNING
		},
		{
			command: 'python3 -m http.server 8000',
			conversationId: 'chat-1',
			cwd: '/Users/me/projects/site/dist',
			endedAt: NOW - 30_000,
			exitCode: 143,
			id: 1,
			key: 'a-1',
			nextOffset: 0,
			output: '',
			startedAt: NOW - 300_000,
			status: BackgroundTaskStatus.STOPPED
		},
		{
			command: 'cargo build --release',
			conversationId: 'chat-1',
			cwd: '/Users/me/projects/engine',
			endedAt: NOW - 90_000,
			exitCode: 101,
			id: 0,
			key: 'a-0',
			nextOffset: 0,
			output: '',
			startedAt: NOW - 200_000,
			status: BackgroundTaskStatus.EXITED
		}
	];
</script>

<Story asChild name="Tasks">
	<BackgroundTasksCard
		activeConversationId="chat-1"
		conversationHref={(id) => `#/chat/${id}`}
		home="/Users/me"
		now={NOW}
		tasks={TASKS}
	/>
</Story>

<Story asChild name="Open task">
	<BackgroundTasksCard home="/Users/me" now={NOW} openTask={DEV_SERVER} tasks={TASKS} />
</Story>

<Story asChild name="Stopping">
	<BackgroundTasksCard
		home="/Users/me"
		isStopping={(key) => key === 'a-3'}
		now={NOW}
		tasks={TASKS}
	/>
</Story>

<Story asChild name="Folded">
	<BackgroundTasksCard now={NOW} open={false} tasks={TASKS} />
</Story>

<script lang="ts">
	import { APP_NAME, NEW_CHAT_LABEL, ROUTES } from '#lib/constants/index.ts';
	import { useProjectNewChat } from '#lib/hooks/use-project-new-chat.svelte.ts';
	import { projectsStore } from '#lib/stores/index.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let project = $derived(projectsStore.get(page.params.projectId ?? ''));

	useProjectNewChat(() => project);

	$effect(() => {
		if (projectsStore.isInitialized && !project) void goto(ROUTES.PROJECTS);
	});
</script>

<svelte:head>
	<title>{NEW_CHAT_LABEL} · {project?.name ?? 'Project'} · {APP_NAME}</title>
</svelte:head>

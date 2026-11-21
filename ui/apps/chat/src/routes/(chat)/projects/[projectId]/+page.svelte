<script lang="ts">
	import { APP_NAME, ROUTES } from '#lib/constants/index.ts';
	import { useProjectNewChat } from '#lib/hooks/use-project-new-chat.svelte.ts';
	import { projectsStore } from '#lib/stores/index.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let project = $derived(projectsStore.get(page.params.projectId ?? ''));

	useProjectNewChat(() => project);

	$effect(() => {
		if (projectsStore.isInitialized && !project) void goto(resolve(ROUTES.PROJECTS));
	});
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} · {APP_NAME}</title>
</svelte:head>

<!--
	The onboarding wired to the app: reads what the server offers, decides which steps show, and
	starts the first chat. Mounted once, in the root layout.
-->
<script lang="ts">
	import { OnboardingDialog } from '#lib/components/app/onboarding/index.ts';
	import {
		ONBOARDING_MCP_SERVERS,
		ONBOARDING_WEB_SEARCH_SERVER_ID,
		ROUTES
	} from '#lib/constants/index.ts';
	import type { OnboardingStep } from '#lib/enums/index.ts';
	import {
		chatStore,
		conversationsStore,
		mcpStore,
		modelsStore,
		serverStore,
		toolsStore,
		uiStore
	} from '#lib/stores/index.ts';
	import { canonicalizeServerUrl } from '#lib/utils/index.ts';
	import { resolveOnboardingSteps, resolveOnboardingTasks } from '#lib/utils/onboarding.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	// steps the user has been on: they stay in the flow once what they asked for is done
	let visited = $state<OnboardingStep[]>([]);
	let modelsFetched = $state(false);

	let hasAudioModel = $derived.by(() => {
		void modelsStore.props.cacheVersion;

		return modelsStore.models.some((model) => modelsStore.props.modelSupportsAudio(model.model));
	});

	// recommended MCP servers that are added, by id
	let addedMcpIds = $derived.by(() => {
		const added = new Set(mcpStore.getServers().map((server) => canonicalizeServerUrl(server.url)));

		return ONBOARDING_MCP_SERVERS.filter((server) =>
			added.has(canonicalizeServerUrl(server.url))
		).map((server) => server.id);
	});

	// no first task without a model to answer it
	let tasks = $derived(
		modelsStore.models.length > 0
			? resolveOnboardingTasks({
					serverTools: toolsStore.serverTools.length > 0,
					webSearch: addedMcpIds.includes(ONBOARDING_WEB_SEARCH_SERVER_ID)
				})
			: []
	);

	let steps = $derived(
		resolveOnboardingSteps(
			{
				apiKeyRequired: page.status === 401 || page.status === 403,
				hasAudioModel,
				isRouter: serverStore.isRouterMode,
				mcpSuggestionCount: ONBOARDING_MCP_SERVERS.length - addedMcpIds.length,
				modelCount: modelsStore.models.length,
				serverReady: serverStore.props !== null && modelsFetched
			},
			visited
		)
	);

	// the models list is loaded by the chat page, which may not be the one under the dialog
	$effect(() => {
		if (!uiStore.onboardingOpen || !serverStore.props) return;

		untrack(() => void modelsStore.fetch().then(() => (modelsFetched = true)));
	});

	function handleFinish() {
		visited = [];
		uiStore.finishOnboarding();
	}

	async function handlePrompt(prompt: string) {
		await goto(ROUTES.START);

		conversationsStore.clearActiveConversation();

		await modelsStore.ensureFirstModelSelected();
		await chatStore.sendMessage(prompt);
	}
</script>

<OnboardingDialog
	onFinish={handleFinish}
	onPrompt={handlePrompt}
	onStepChange={(step) => (visited = [...visited, step])}
	open={uiStore.onboardingOpen}
	{steps}
	{tasks}
/>

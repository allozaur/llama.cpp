import {
	ONBOARDING_INTRO_STEPS,
	ONBOARDING_STEP_ORDER,
	ONBOARDING_TASK_COUNT,
	ONBOARDING_TASKS,
	type OnboardingTask
} from '#lib/constants/onboarding.constants.ts';
import { OnboardingStep } from '#lib/enums/onboarding.enums.ts';

export interface OnboardingStepsInput {
	/** The server answered 401 or 403: it wants an API key. */
	apiKeyRequired: boolean;
	/** The server props and the models list are in, so the fields below can be trusted. */
	serverReady: boolean;
	/** Router mode: the server can download and swap models. */
	isRouter: boolean;
	modelCount: number;
	/** A model with audio input is on the server. */
	hasAudioModel: boolean;
	/** Recommended MCP servers that are not added yet. */
	mcpSuggestionCount: number;
}

/**
 * The steps the onboarding shows, in order: the intro slides, the setup steps that
 * apply to this server, and the last step. `keep` lists steps that stay whatever the
 * input says: the ones already visited, so a step does not vanish once it is done.
 */
export function resolveOnboardingSteps(
	input: OnboardingStepsInput,
	keep: OnboardingStep[] = []
): OnboardingStep[] {
	// a model can be added from the app only on a router
	const canAddModels = input.serverReady && input.isRouter;
	const applies: Record<OnboardingStep, boolean> = {
		[OnboardingStep.CONNECTION]: input.apiKeyRequired,
		[OnboardingStep.DONE]: true,
		[OnboardingStep.INTRO_CHAT]: true,
		[OnboardingStep.INTRO_TOOLS]: true,
		[OnboardingStep.INTRO_VOICE]: true,
		[OnboardingStep.MODEL]: canAddModels && input.modelCount === 0,
		[OnboardingStep.POWER_UPS]: input.mcpSuggestionCount > 0,
		[OnboardingStep.VOICE]: canAddModels && input.modelCount > 0 && !input.hasAudioModel
	};

	return ONBOARDING_STEP_ORDER.filter((step) => applies[step] || keep.includes(step));
}

/** The first step after the intro slides, where "Skip intro" lands. */
export function firstSetupStep(steps: OnboardingStep[]): OnboardingStep | undefined {
	return steps.find((step) => !ONBOARDING_INTRO_STEPS.includes(step));
}

/** The first tasks to offer: the ones whose tools are there, up to ONBOARDING_TASK_COUNT. */
export function resolveOnboardingTasks(available: {
	serverTools: boolean;
	webSearch: boolean;
}): OnboardingTask[] {
	return ONBOARDING_TASKS.filter(
		(task) =>
			(!task.needsServerTools || available.serverTools) &&
			(!task.needsWebSearch || available.webSearch)
	).slice(0, ONBOARDING_TASK_COUNT);
}

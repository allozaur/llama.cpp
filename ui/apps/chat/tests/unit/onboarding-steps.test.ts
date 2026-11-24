import { ONBOARDING_INTRO_STEPS } from '#lib/constants/index.ts';
import { OnboardingStep } from '#lib/enums/index.ts';
import {
	firstSetupStep,
	type OnboardingStepsInput,
	resolveOnboardingSteps,
	resolveOnboardingTasks
} from '#lib/utils/onboarding.ts';
import { describe, expect, it } from 'vitest';

// a router with a chat model that hears and every recommended MCP server added
const SETTLED: OnboardingStepsInput = {
	apiKeyRequired: false,
	canImportChats: false,
	hasAudioModel: true,
	isRouter: true,
	mcpSuggestionCount: 0,
	modelCount: 2,
	serverReady: true
};

function setupSteps(input: Partial<OnboardingStepsInput>, keep?: OnboardingStep[]) {
	return resolveOnboardingSteps({ ...SETTLED, ...input }, keep).filter(
		(step) => !ONBOARDING_INTRO_STEPS.includes(step)
	);
}

describe('resolveOnboardingSteps', () => {
	it('shows the intro and the last step when nothing needs setting up', () => {
		expect(resolveOnboardingSteps(SETTLED)).toEqual([
			...ONBOARDING_INTRO_STEPS,
			OnboardingStep.DONE
		]);
	});

	it('asks for the API key only when the server wants one', () => {
		expect(setupSteps({ apiKeyRequired: true, serverReady: false })).toEqual([
			OnboardingStep.CONNECTION,
			OnboardingStep.DONE
		]);
	});

	it('offers a model on a router that has none', () => {
		expect(setupSteps({ hasAudioModel: false, modelCount: 0 })).toEqual([
			OnboardingStep.MODEL,
			OnboardingStep.DONE
		]);
	});

	it('offers a model that hears when models exist and none takes audio', () => {
		expect(setupSteps({ hasAudioModel: false })).toEqual([
			OnboardingStep.VOICE,
			OnboardingStep.DONE
		]);
	});

	it('leaves the model steps out on a single-model server', () => {
		expect(setupSteps({ hasAudioModel: false, isRouter: false, modelCount: 1 })).toEqual([
			OnboardingStep.DONE
		]);
		expect(setupSteps({ hasAudioModel: false, isRouter: false, modelCount: 0 })).toEqual([
			OnboardingStep.DONE
		]);
	});

	it('leaves the model steps out until the server has answered', () => {
		expect(setupSteps({ hasAudioModel: false, modelCount: 0, serverReady: false })).toEqual([
			OnboardingStep.DONE
		]);
	});

	it('offers MCP servers while some are not added', () => {
		expect(setupSteps({ mcpSuggestionCount: 2 })).toEqual([
			OnboardingStep.POWER_UPS,
			OnboardingStep.DONE
		]);
	});

	it('offers the chat import where a folder can be picked, after the MCP servers', () => {
		expect(setupSteps({ canImportChats: true })).toEqual([
			OnboardingStep.IMPORT,
			OnboardingStep.DONE
		]);
		expect(setupSteps({ canImportChats: true, mcpSuggestionCount: 1 })).toEqual([
			OnboardingStep.POWER_UPS,
			OnboardingStep.IMPORT,
			OnboardingStep.DONE
		]);
	});

	it('keeps a visited step after its condition is gone, in the flow order', () => {
		expect(setupSteps({ mcpSuggestionCount: 1 }, [OnboardingStep.MODEL])).toEqual([
			OnboardingStep.MODEL,
			OnboardingStep.POWER_UPS,
			OnboardingStep.DONE
		]);
	});
});

describe('firstSetupStep', () => {
	it('is the first step after the intro slides', () => {
		expect(firstSetupStep(resolveOnboardingSteps({ ...SETTLED, mcpSuggestionCount: 1 }))).toBe(
			OnboardingStep.POWER_UPS
		);
		expect(firstSetupStep(resolveOnboardingSteps(SETTLED))).toBe(OnboardingStep.DONE);
	});
});

describe('resolveOnboardingTasks', () => {
	const ids = (available: { serverTools: boolean; webSearch: boolean }) =>
		resolveOnboardingTasks(available).map((task) => task.id);

	it('offers only tasks that need no tool when none is there', () => {
		expect(ids({ serverTools: false, webSearch: false })).toEqual([
			'date',
			'explain',
			'help',
			'poem'
		]);
	});

	it('leads with the tasks whose tools are there, four at most', () => {
		expect(ids({ serverTools: true, webSearch: false })).toEqual([
			'files',
			'date',
			'explain',
			'help'
		]);
		expect(ids({ serverTools: true, webSearch: true })).toEqual([
			'files',
			'search',
			'date',
			'explain'
		]);
	});
});

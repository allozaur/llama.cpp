<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Dialog from '@ggml-org/llama-ui/ui/dialog';
	import { ArrowLeft, X } from '@lucide/svelte';
	import {
		OnboardingConnection,
		OnboardingDone,
		OnboardingIntro,
		OnboardingModels,
		OnboardingPowerUps
	} from '#lib/components/app/onboarding/index.ts';
	import {
		ONBOARDING_INTRO_STEPS,
		ONBOARDING_STEP_COPY,
		PANEL_CLOSE_MOBILE_CLASS
	} from '#lib/constants/index.ts';
	import { OnboardingStep } from '#lib/enums/index.ts';
	import { firstSetupStep } from '#lib/utils/onboarding.ts';

	interface Props {
		/** The steps to show, in order. */
		steps: OnboardingStep[];
		/** Whether a model can answer, so the last step offers its example prompts. */
		canChat?: boolean;
		open?: boolean;
		/** Closed for good: finished on the last step or dismissed on any. */
		onFinish?: () => void;
		/** An example prompt was picked on the last step. */
		onPrompt?: (prompt: string) => void;
		onStepChange?: (step: OnboardingStep) => void;
	}

	let {
		canChat = false,
		onFinish,
		onPrompt,
		onStepChange,
		open = $bindable(false),
		steps
	}: Props = $props();

	// tracked by id, not by index: the list can change under an open dialog
	let currentStep = $state<OnboardingStep | null>(null);

	let current = $derived(
		currentStep && steps.includes(currentStep) ? currentStep : (steps[0] ?? OnboardingStep.DONE)
	);
	let index = $derived(steps.indexOf(current));
	let copy = $derived(ONBOARDING_STEP_COPY[current]);
	let isIntro = $derived(ONBOARDING_INTRO_STEPS.includes(current));
	let isLast = $derived(index === steps.length - 1);

	let nextButton = $state<HTMLElement | null>(null);

	function goTo(step: OnboardingStep | undefined) {
		if (!step) return;

		currentStep = step;
		onStepChange?.(step);

		// Back and "Skip intro" can leave the footer, and focus would fall to the close button
		nextButton?.focus();
	}

	function finish() {
		open = false;
		currentStep = null;
		onFinish?.();
	}

	function handleOpenChange(value: boolean) {
		if (!value) finish();
	}

	function handlePrompt(prompt: string) {
		finish();
		onPrompt?.(prompt);
	}
</script>

<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<!-- a click beside the dialog must not end a first run by accident; Escape and the close button do -->
	<Dialog.Content
		class="flex flex-col gap-0 p-0 md:h-160! md:max-h-[calc(100dvh-4rem)]! md:w-176! md:max-w-[calc(100vw-4rem)]!"
		data-testid="onboarding"
		interactOutsideBehavior="ignore"
		onOpenAutoFocus={(event) => event.preventDefault()}
	>
		<Dialog.Header class="flex-row items-center gap-3 p-4" showCloseButton={false}>
			<ol aria-label="Step {index + 1} of {steps.length}" class="flex flex-1 items-center gap-1.5">
				{#each steps as step (step)}
					<li
						class={[
							'h-1 flex-1 rounded-full transition-colors',
							steps.indexOf(step) <= index ? 'bg-primary' : 'bg-muted'
						]}
					></li>
				{/each}
			</ol>

			<Dialog.Close
				class="rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden {PANEL_CLOSE_MOBILE_CLASS}"
			>
				<X class="size-icon-md" />

				<span class="sr-only">Close</span>
			</Dialog.Close>
		</Dialog.Header>

		<div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
			<div class="space-y-2">
				<Dialog.Title class={isIntro ? 'text-title text-balance' : 'text-heading'}>
					{copy.title}
				</Dialog.Title>

				{#if copy.description}
					<Dialog.Description>{copy.description}</Dialog.Description>
				{/if}
			</div>

			{#if isIntro}
				<OnboardingIntro step={current} />
			{:else if current === OnboardingStep.CONNECTION}
				<OnboardingConnection />
			{:else if current === OnboardingStep.MODEL}
				<OnboardingModels />
			{:else if current === OnboardingStep.VOICE}
				<OnboardingModels audioOnly />
			{:else if current === OnboardingStep.POWER_UPS}
				<OnboardingPowerUps />
			{:else}
				<OnboardingDone {canChat} onPrompt={handlePrompt} />
			{/if}
		</div>

		<Dialog.Footer class="flex-row items-center gap-2 border-t border-border/40 p-4">
			{#if index > 0}
				<Button onclick={() => goTo(steps[index - 1])} variant="ghost">
					<ArrowLeft class="size-icon-md" />

					Back
				</Button>
			{/if}

			<div class="flex-1"></div>

			{#if isIntro}
				<Button onclick={() => goTo(firstSetupStep(steps))} variant="ghost">Skip intro</Button>
			{/if}

			<!-- one button for both, so focus stays on it when the last step is reached -->
			<Button bind:ref={nextButton} onclick={() => (isLast ? finish() : goTo(steps[index + 1]))}>
				{isLast ? 'Start chatting' : 'Next'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

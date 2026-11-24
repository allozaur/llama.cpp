<!--
	The onboarding as a short conversation: the app says something, shows a piece of itself or asks
	for a setup choice, and the choice stays behind as the user's answer while the next step opens
	under it. A centered dialog on desktop, full screen on a phone.
-->
<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Dialog from '@ggml-org/llama-ui/ui/dialog';
	import { ArrowLeft } from '@lucide/svelte';
	import { ChatMessageUserBubble } from '#lib/components/app/index.ts';
	import {
		OnboardingConnection,
		OnboardingDone,
		OnboardingIntro,
		OnboardingModels,
		OnboardingPowerUps
	} from '#lib/components/app/onboarding/index.ts';
	import {
		ONBOARDING_INTRO_STEPS,
		ONBOARDING_NO_ANSWER,
		ONBOARDING_STEP_COPY,
		type OnboardingTask
	} from '#lib/constants/index.ts';
	import { OnboardingStep } from '#lib/enums/index.ts';
	import { firstSetupStep } from '#lib/utils/onboarding.ts';

	interface Props {
		/** The steps to show, in order. */
		steps: OnboardingStep[];
		open?: boolean;
		/** First tasks offered on the last step; none when no model can answer. */
		tasks?: OnboardingTask[];
		/** Closed for good: finished on the last step or dismissed on any. */
		onFinish?: () => void;
		/** A first task was picked on the last step. */
		onPrompt?: (prompt: string) => void;
		onStepChange?: (step: OnboardingStep) => void;
	}

	let {
		onFinish,
		onPrompt,
		onStepChange,
		open = $bindable(false),
		steps,
		tasks = []
	}: Props = $props();

	// tracked by id, not by index: the list can change under an open dialog
	let currentStep = $state<OnboardingStep | null>(null);
	// what the user chose on a setup step, shown as their message once the step is passed
	let answers = $state<Partial<Record<OnboardingStep, string>>>({});

	let current = $derived(
		currentStep && steps.includes(currentStep) ? currentStep : (steps[0] ?? OnboardingStep.DONE)
	);
	let index = $derived(steps.indexOf(current));
	// the conversation so far: the steps the user was on, without the ones skipped over
	let seen = $state<OnboardingStep[]>([]);
	let shownSteps = $derived(
		steps
			.slice(0, index + 1)
			.filter((step, i) => i === 0 || step === current || seen.includes(step))
	);
	let isIntro = $derived(ONBOARDING_INTRO_STEPS.includes(current));
	let isLast = $derived(index === steps.length - 1);
	let skipTarget = $derived(isIntro ? firstSetupStep(steps) : OnboardingStep.DONE);

	let nextButton = $state<HTMLElement | null>(null);

	function goTo(step: OnboardingStep | undefined) {
		if (!step) return;

		seen = [...seen, current, step];
		currentStep = step;
		onStepChange?.(step);

		// the button that was pressed can leave the footer, and focus would fall to the close button
		nextButton?.focus();
	}

	function finish() {
		open = false;
		currentStep = null;
		seen = [];
		answers = {};
		onFinish?.();
	}

	function handleOpenChange(value: boolean) {
		if (!value) finish();
	}

	function handlePrompt(prompt: string) {
		finish();
		onPrompt?.(prompt);
	}

	let scroller = $state<HTMLElement | null>(null);

	// Brings a step to the top when it joins the conversation. Scrolls the conversation alone:
	// scrollIntoView would also move the dialog, which can scroll on its own.
	function reveal(node: HTMLElement) {
		scroller?.scrollTo({ behavior: 'smooth', top: node.offsetTop });
	}
</script>

<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<!-- a click beside the dialog must not end a first run by accident; Escape and the close button do -->
	<Dialog.Content
		class="flex flex-col gap-6 overflow-hidden p-4 md:h-176! md:max-h-[calc(100dvh-4rem)]! md:w-192! md:max-w-[calc(100vw-4rem)]! md:gap-8 md:p-8"
		data-testid="onboarding"
		interactOutsideBehavior="ignore"
		onOpenAutoFocus={(event) => event.preventDefault()}
	>
		<Dialog.Header>
			<!-- the icon as Llama Sans's cap-height glyph, U+E000, which sits quietly in a heading -->
			<Dialog.Title>
				Welcome to <span class="whitespace-nowrap">&#xE000; Llama Chat</span>
			</Dialog.Title>

			<Dialog.Description class="sr-only">
				Step {index + 1} of {steps.length}
			</Dialog.Description>
		</Dialog.Header>

		<!-- bleeds to the dialog's edges, so the scrollbar sits there and not beside the text -->
		<div
			bind:this={scroller}
			class="relative -mx-4 min-h-0 flex-1 overflow-y-auto px-4 md:-mx-8 md:px-8"
		>
			<div class="flex flex-col gap-10 pb-2 md:gap-12">
				{#each shownSteps as step (step)}
					<section
						{@attach reveal}
						class="flex flex-col gap-5 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
					>
						<p class="text-pretty">{ONBOARDING_STEP_COPY[step]}</p>

						{#if ONBOARDING_INTRO_STEPS.includes(step)}
							<OnboardingIntro {step} />
						{:else if step !== current}
							<div class="flex flex-col items-end">
								<ChatMessageUserBubble content={answers[step] ?? ONBOARDING_NO_ANSWER} />
							</div>
						{:else if step === OnboardingStep.CONNECTION}
							<OnboardingConnection onAnswer={(answer) => (answers[step] = answer)} />
						{:else if step === OnboardingStep.MODEL}
							<OnboardingModels onAnswer={(answer) => (answers[step] = answer)} />
						{:else if step === OnboardingStep.VOICE}
							<OnboardingModels audioOnly onAnswer={(answer) => (answers[step] = answer)} />
						{:else if step === OnboardingStep.POWER_UPS}
							<OnboardingPowerUps onAnswer={(answer) => (answers[step] = answer)} />
						{:else}
							<OnboardingDone onPrompt={handlePrompt} {tasks} />
						{/if}
					</section>
				{/each}
			</div>
		</div>

		<Dialog.Footer class="flex-row items-center gap-2">
			{#if index > 0}
				<Button onclick={() => goTo(steps[index - 1])} variant="ghost">
					<ArrowLeft class="size-icon-md" />

					Back
				</Button>
			{/if}

			<div class="flex-1"></div>

			{#if !isLast}
				<Button onclick={() => goTo(skipTarget)} variant="ghost">
					{isIntro ? 'Skip intro' : 'Skip setup'}
				</Button>
			{/if}

			<!-- one button for every step, so focus stays on it from the first to the last -->
			<Button bind:ref={nextButton} onclick={() => (isLast ? finish() : goTo(steps[index + 1]))}>
				{isLast ? 'Start chatting' : 'Continue'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

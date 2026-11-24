<!--
	The onboarding as a short conversation: the app says something, shows a piece of itself or asks
	for a setup choice, and the choice stays behind as the user's answer while the next step opens
	under it. A centered dialog on desktop, full screen on a phone.
-->
<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Dialog from '@ggml-org/llama-ui/ui/dialog';
	import { ArrowLeft, X } from '@lucide/svelte';
	import { ChatMessageUserBubble, Logo } from '#lib/components/app/index.ts';
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
		ONBOARDING_PHASE_LABELS,
		ONBOARDING_STEP_COPY,
		type OnboardingTask,
		PANEL_CLOSE_MOBILE_CLASS
	} from '#lib/constants/index.ts';
	import { OnboardingStep } from '#lib/enums/index.ts';
	import { firstSetupStep, onboardingPhase } from '#lib/utils/onboarding.ts';

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
	let phase = $derived(onboardingPhase(current));
	let phases = $derived([...new Set(steps.map(onboardingPhase))]);
	let isIntro = $derived(phase === 0);
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
		class="flex flex-col gap-0 overflow-hidden p-0 md:h-168! md:max-h-[calc(100dvh-4rem)]! md:w-184! md:max-w-[calc(100vw-4rem)]!"
		data-testid="onboarding"
		interactOutsideBehavior="ignore"
		onOpenAutoFocus={(event) => event.preventDefault()}
	>
		<Dialog.Header
			class="grid grid-cols-[2.5rem_1fr_2.5rem] items-center p-3"
			showCloseButton={false}
		>
			<div>
				{#if index > 0}
					<Button
						aria-label="Back"
						class="text-muted-foreground"
						onclick={() => goTo(steps[index - 1])}
						size="icon"
						variant="ghost"
					>
						<ArrowLeft class="size-icon-md" />
					</Button>
				{/if}
			</div>

			<Logo class="justify-self-center" style="--size: 1.5rem" />

			<Dialog.Close
				class="grid size-9 place-items-center justify-self-end rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden {PANEL_CLOSE_MOBILE_CLASS}"
			>
				<X class="size-icon-md" />

				<span class="sr-only">Close</span>
			</Dialog.Close>
		</Dialog.Header>

		<Dialog.Title class="sr-only">Welcome to Llama Chat</Dialog.Title>

		<Dialog.Description class="sr-only">
			Step {index + 1} of {steps.length}: {ONBOARDING_PHASE_LABELS[phase]}
		</Dialog.Description>

		<div bind:this={scroller} class="relative min-h-0 flex-1 overflow-y-auto">
			<div class="mx-auto flex w-full max-w-136 flex-col gap-8 px-6 pt-2 pb-8">
				{#each shownSteps as step (step)}
					{@const copy = ONBOARDING_STEP_COPY[step]}

					<section
						{@attach reveal}
						class="flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
					>
						{#if copy.heading}
							<h2 class="text-heading">{copy.heading}</h2>
						{/if}

						<p class="text-pretty">{copy.text}</p>

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

		<Dialog.Footer class="flex-col items-center gap-1 p-4 sm:flex-col sm:items-center">
			<!-- one button for every step, so focus stays on it from the first to the last -->
			<Button
				bind:ref={nextButton}
				class="w-56 rounded-full"
				onclick={() => (isLast ? finish() : goTo(steps[index + 1]))}
			>
				{isLast ? 'Start chatting' : 'Continue'}
			</Button>

			<Button
				class={['text-muted-foreground', isLast && 'invisible']}
				onclick={() => goTo(skipTarget)}
				size="sm"
				variant="ghost"
			>
				{isIntro ? 'Skip intro' : 'Skip setup'}
			</Button>

			<ol aria-hidden="true" class="flex items-center gap-1">
				{#each phases as item (item)}
					<li
						class={[
							'h-0.5 w-4 rounded-full transition-colors',
							item === phase ? 'bg-foreground' : 'bg-muted-foreground/30'
						]}
					></li>
				{/each}
			</ol>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

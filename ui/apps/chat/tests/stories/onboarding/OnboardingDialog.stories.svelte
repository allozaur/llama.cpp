<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OnboardingDialog from '#lib/components/app/onboarding/OnboardingDialog.svelte';
	import { ONBOARDING_STEP_ORDER } from '#lib/constants/index.ts';
	import { OnboardingStep } from '#lib/enums/index.ts';

	// the dialog with a given list of steps; the app decides the list with resolveOnboardingSteps
	const { Story } = defineMeta({
		args: {
			open: true,
			steps: ONBOARDING_STEP_ORDER
		},
		component: OnboardingDialog,
		parameters: {
			layout: 'fullscreen'
		},
		title: 'Llama Chat/Onboarding/OnboardingDialog'
	});

	const DESKTOP = { viewport: { isRotated: false, value: 'desktop' } };
	const MOBILE = { viewport: { isRotated: false, value: 'mobile2' } };
</script>

<!-- every step, starting on the first intro slide -->
<Story globals={DESKTOP} name="Desktop" />

<!-- full screen -->
<Story globals={MOBILE} name="Mobile" />

<!-- a server that needs nothing set up: the intro, then the last step -->
<Story
	args={{
		canChat: true,
		steps: [
			OnboardingStep.INTRO_CHAT,
			OnboardingStep.INTRO_TOOLS,
			OnboardingStep.INTRO_VOICE,
			OnboardingStep.DONE
		]
	}}
	globals={DESKTOP}
	name="Nothing To Set Up"
/>

<Story
	args={{ steps: [OnboardingStep.CONNECTION, OnboardingStep.DONE] }}
	globals={DESKTOP}
	name="Connection"
/>

<Story
	args={{ steps: [OnboardingStep.MODEL, OnboardingStep.DONE] }}
	globals={DESKTOP}
	name="Get A Model"
/>

<Story
	args={{ steps: [OnboardingStep.POWER_UPS, OnboardingStep.DONE] }}
	globals={DESKTOP}
	name="Power-ups"
/>

<Story
	args={{ steps: [OnboardingStep.POWER_UPS, OnboardingStep.DONE] }}
	globals={MOBILE}
	name="Power-ups Mobile"
/>

<Story args={{ canChat: true, steps: [OnboardingStep.DONE] }} globals={DESKTOP} name="Done" />

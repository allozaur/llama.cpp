/**
 *
 * ONBOARDING
 *
 * The first-run flow: three slides on what the app can do, then the setup steps that
 * apply to this server (API key, a first model, a model that hears, MCP servers).
 * Which steps show is decided by `resolveOnboardingSteps` in `#lib/utils/onboarding.ts`.
 *
 */

/** The flow wired to the stores; mounted once, in the root layout. */
export { default as Onboarding } from './Onboarding.svelte';

/** The dialog itself: a centered dialog on desktop, full screen on a phone. */
export { default as OnboardingDialog } from './OnboardingDialog.svelte';

/** An intro slide: a fragment of the real UI under the slide's sentence. */
export { default as OnboardingIntro } from './OnboardingIntro.svelte';

/** Setup step: enter the API key the server asks for. */
export { default as OnboardingConnection } from './OnboardingConnection.svelte';

/** Setup step: pick a model to download, from the catalog or a Hugging Face search. */
export { default as OnboardingModels } from './OnboardingModels.svelte';

/** Setup step: switch recommended MCP servers on. */
export { default as OnboardingPowerUps } from './OnboardingPowerUps.svelte';

/** Last step: example prompts that start a first chat. */
export { default as OnboardingDone } from './OnboardingDone.svelte';

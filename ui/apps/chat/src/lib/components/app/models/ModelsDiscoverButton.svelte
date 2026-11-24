<script lang="ts">
	import { Button, type ButtonSize, type ButtonVariant } from '@ggml-org/llama-ui/ui/button';
	import { DialogConfirmation } from '#lib/components/app/dialogs/index.ts';
	import { DISCOVER_ICON, SETTINGS_KEYS } from '#lib/constants/index.ts';
	import { settingsStore, uiStore } from '#lib/stores/index.ts';

	interface Props {
		class?: string;
		size?: ButtonSize;
		variant?: ButtonVariant;
	}

	let { class: className, size = 'sm', variant = 'default' }: Props = $props();

	let showEnableDialog = $state(false);

	function handleClick() {
		if (uiStore.isDiscoverEnabled) uiStore.openModelsDiscover();
		else showEnableDialog = true;
	}

	// the same three settings "Enable Discover Models" turns on in Settings > General
	function handleEnable() {
		settingsStore.updateMultipleConfig({
			[SETTINGS_KEYS.ENABLE_DISCOVER_MODELS]: true,
			[SETTINGS_KEYS.SHOW_MODELS_MANAGER]: true,
			[SETTINGS_KEYS.USE_HUGGING_FACE_HUB]: true
		});

		showEnableDialog = false;
		uiStore.openModelsDiscover();
	}
</script>

<Button class={['gap-1.5', className]} onclick={handleClick} {size} {variant}>
	<DISCOVER_ICON class="size-icon-md" />

	Discover Models
</Button>

<DialogConfirmation
	bind:open={showEnableDialog}
	confirmText="Turn on"
	description="Discover Models lists and downloads GGUF models from Hugging Face, so the app will contact llama.app and huggingface.co. You can turn it off again in Settings, under General."
	icon={DISCOVER_ICON}
	onCancel={() => (showEnableDialog = false)}
	onConfirm={handleEnable}
	title="Turn on Discover Models?"
/>

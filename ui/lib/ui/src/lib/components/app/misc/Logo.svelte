<script>
	import icon from '@ggml-org/llama-brand/logo/svg/icon/icon-light.svg?raw';
	import { getLogoMark } from './logo-context.js';

	// llama-brand's icon unless the app set its own mark (setLogoMark)
	const mark = getLogoMark();
	const svg = mark?.svg ?? icon;

	// llama-brand draws the icon in its ink; currentColor lets it follow the text colour.
	const logoMark =
		(mark?.monochrome ?? true) ? svg.replace(/fill="#[0-9a-f]{3,8}"/gi, 'fill="currentColor"') : svg;

	let { class: className = '', style = '' } = $props();
</script>

<div class={className} {style}>
	{@html logoMark}
</div>

<style>
	div :global(svg) {
		width: var(--size, 1rem);
		height: var(--size, 1rem);
	}
</style>

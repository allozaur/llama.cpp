<script lang="ts">
	interface Props {
		/** Key names; `mod` is Cmd on Apple devices and Ctrl elsewhere. */
		keys: string[];
	}

	let { keys }: Props = $props();

	const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const NAMES: Record<string, string> = {
		enter: 'Enter',
		mod: isApple ? 'Cmd' : 'Ctrl',
		shift: 'Shift'
	};
</script>

<kbd class="inline-flex items-center gap-0.5 font-sans text-xs opacity-70">
	{keys.map((key) => NAMES[key] ?? key.toUpperCase()).join(' + ')}
</kbd>

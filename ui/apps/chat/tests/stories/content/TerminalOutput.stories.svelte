<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TerminalOutput from '#lib/components/app/content/TerminalOutput.svelte';

	const { Story } = defineMeta({
		component: TerminalOutput,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Content/TerminalOutput'
	});

	const VITE_OUTPUT = [
		'',
		'> llama-chat@0.1.0 dev',
		'> vite dev --port 5173',
		'',
		'',
		'  \x1b[32m\x1b[1mVITE\x1b[22m v7.1.4\x1b[39m  \x1b[2mready in \x1b[0m\x1b[1m412\x1b[22m\x1b[2m\x1b[0m ms\x1b[22m',
		'',
		'  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m',
		'  \x1b[32m➜\x1b[39m  \x1b[1mNetwork\x1b[22m: \x1b[36mhttp://192.168.1.20:\x1b[1m5173\x1b[22m/\x1b[39m',
		'\x1b[2m11:52:01 AM\x1b[22m \x1b[36m\x1b[1m[vite]\x1b[22m\x1b[39m \x1b[32mhmr update \x1b[39m\x1b[2m/src/routes/+page.svelte\x1b[22m',
		'\x1b[2m11:52:09 AM\x1b[22m \x1b[33m\x1b[1m[vite]\x1b[22m\x1b[39m \x1b[33mwarning: unused export\x1b[39m',
		'\x1b[31m\x1b[1mError:\x1b[22m\x1b[39m Cannot find module ./missing',
		''
	].join('\n');

	const PROGRESS_OUTPUT = 'downloading 10%\rdownloading 55%\rdownloading 100%\ndone';

	const LONG_OUTPUT = Array.from({ length: 200 }, (_, i) => `[${i + 1}] building chunk ${i}`).join(
		'\n'
	);
</script>

<Story asChild name="Dev server">
	<div class="w-[36rem]">
		<TerminalOutput class="h-72 rounded-md px-3 py-2" output={VITE_OUTPUT} />
	</div>
</Story>

<Story asChild name="Follows the tail">
	<div class="w-[36rem]">
		<TerminalOutput class="h-72 rounded-md px-3 py-2" output={LONG_OUTPUT} />
	</div>
</Story>

<Story asChild name="Progress bar">
	<div class="w-[36rem]">
		<TerminalOutput class="h-24 rounded-md px-3 py-2" output={PROGRESS_OUTPUT} />
	</div>
</Story>

<Story asChild name="Empty">
	<div class="w-[36rem]">
		<TerminalOutput class="h-24 rounded-md px-3 py-2" output="" />
	</div>
</Story>

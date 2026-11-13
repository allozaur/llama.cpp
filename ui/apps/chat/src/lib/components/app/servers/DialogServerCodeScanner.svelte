<script lang="ts">
	import { Button } from '@ggml/llama-ui/ui/button';
	import * as Dialog from '@ggml/llama-ui/ui/dialog';
	import { Camera, CameraOff } from '@lucide/svelte';
	import { scanFrameForCode } from '$lib/utils/qr-scan';
	import { normalizeShareCode } from '$lib/utils/server';

	/** How often to ask the detector for a frame; the call is slow. */
	const SCAN_INTERVAL_MS = 350;

	interface Props {
		onCode?: (code: string) => void;
		onOpenChange?: (open: boolean) => void;
		open?: boolean;
	}

	let { onCode, onOpenChange, open = $bindable(false) }: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let error = $state('');

	function handleOpenChange(value: boolean) {
		open = value;
		onOpenChange?.(value);
	}

	// The camera belongs to the dialog: it starts when the dialog opens, and the
	// tracks are released the moment it leaves the screen, so the recording
	// indicator never stays on behind a closed dialog.
	$effect(() => {
		if (!open) return;

		const element = video;

		if (!element) return;

		let cancelled = false;
		let stream: MediaStream | null = null;
		let timer: ReturnType<typeof setInterval> | null = null;

		error = '';

		void (async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: 'environment' }
				});

				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop());

					return;
				}

				element.srcObject = stream;
				await element.play();

				timer = setInterval(async () => {
					const value = await scanFrameForCode(element);
					const code = value ? normalizeShareCode(value) : '';

					if (!code) return;

					handleOpenChange(false);
					onCode?.(code);
				}, SCAN_INTERVAL_MS);
			} catch {
				if (!cancelled) error = 'Cannot read the camera. Paste the code instead.';
			}
		})();

		return () => {
			cancelled = true;

			if (timer) clearInterval(timer);

			stream?.getTracks().forEach((track) => track.stop());
			element.srcObject = null;
		};
	});
</script>

<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<Dialog.Content class="max-w-md!">
		<Dialog.Header>
			<Dialog.Title class="select-none">Scan the access code</Dialog.Title>

			<Dialog.Description>
				Point the camera at the QR code llama-server prints with --connect.
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-3">
				<CameraOff class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

				<p class="text-sm break-words text-muted-foreground">{error}</p>
			</div>
		{:else}
			<video
				bind:this={video}
				autoplay
				class="aspect-square w-full rounded-lg bg-black object-cover"
				muted
				playsinline
			></video>
		{/if}

		<div class="flex items-center justify-between gap-3">
			<p class="flex items-center gap-2 text-xs text-muted-foreground">
				<Camera class="h-3.5 w-3.5" />

				Checked every {SCAN_INTERVAL_MS / 1000}s
			</p>

			<Button onclick={() => handleOpenChange(false)} size="sm" variant="secondary">Close</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts" module>
	import { tv } from '$lib/components/ui/utils';
	import type { VariantProps } from 'tailwind-variants';

	export const alertVariants = tv({
		// a card: the same glass, hairline, highlight and shadow, on the card radius
		base: 'card-surface relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-(--card-radius) px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-icon-md [&>svg]:translate-y-0.5 [&>svg]:text-current',
		defaultVariants: {
			variant: 'default'
		},
		variants: {
			variant: {
				default: '',
				// the card's slots pointed at the danger tint
				destructive:
					'text-fg-danger [--card-background:var(--alert-danger-background)] [--card-edge-mid:var(--alert-danger-edge-mid)] [--card-edge-side:var(--alert-danger-edge-side)] *:data-[slot=alert-description]:text-fg-danger/90'
			}
		}
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '$lib/components/ui/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		children,
		class: className,
		ref = $bindable(null),
		variant = 'default',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	class={cn(alertVariants({ variant }), className)}
	data-slot="alert"
	{...restProps}
	role="alert"
>
	{@render children?.()}
</div>

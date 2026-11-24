import { prefersReducedMotion } from 'svelte/motion';
import { fly, type TransitionConfig } from 'svelte/transition';

export interface UseSheetPagesReturn<P> {
	/** The page on top of the stack. */
	readonly page: P;
	/** Whether a page sits over the first one, so the header shows back instead of close. */
	readonly canGoBack: boolean;
	push(next: P): void;
	pop(): void;
	/** Back to the first page, for each time the sheet opens. */
	reset(): void;
	/** The slide between pages: the next one comes in from the right, the previous one from the left. */
	transition(node: Element, params: { incoming: boolean }): TransitionConfig;
}

/**
 * A stack of pages inside a phone sheet, the native way: tapping a row pushes its page, back pops it.
 */
export function useSheetPages<P>(root: P): UseSheetPagesReturn<P> {
	let stack = $state<P[]>([root]);
	// 1 slides the next page in from the right, -1 brings the previous one back from the left
	let direction = 1;

	return {
		get canGoBack() {
			return stack.length > 1;
		},
		get page() {
			return stack[stack.length - 1];
		},
		pop() {
			direction = -1;
			stack = stack.slice(0, -1);
		},
		push(next: P) {
			direction = 1;
			stack = [...stack, next];
		},
		reset() {
			stack = [root];
		},
		transition(node: Element, { incoming }: { incoming: boolean }) {
			const offset = prefersReducedMotion.current ? 0 : 32;
			const sign = incoming ? direction : -direction;

			return fly(node, { duration: 220, opacity: 0, x: sign * offset });
		}
	};
}

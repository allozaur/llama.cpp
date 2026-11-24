import { SIDEBAR_FOOTER_ITEMS } from '#lib/constants/index.ts';
import type { NavigationItem } from '#lib/extensions/index.ts';
import type { DesktopIconStripItem } from '#lib/types/index.ts';

/** The sidebar footer's items: the app's own, with what extensions contribute to the footer and show right now. */
export function sidebarFooterItems(contributed: NavigationItem[]): DesktopIconStripItem[] {
	const items = contributed
		.filter((item) => item.placement === 'footer' && (item.shown?.() ?? true))
		.map(
			(item): DesktopIconStripItem => ({
				contributed: item,
				icon: item.icon,
				keys: item.keys,
				tooltip: item.tooltip
			})
		);

	// Models opens the footer: contributed items follow it, ahead of the rest
	return [...SIDEBAR_FOOTER_ITEMS.slice(0, 1), ...items, ...SIDEBAR_FOOTER_ITEMS.slice(1)];
}

import { SIDEBAR_FOOTER_ITEMS } from '$lib/constants';
import type { NavigationItem } from '$lib/extensions';
import type { DesktopIconStripItem } from '$lib/types';

/** The sidebar footer's items: the app's own, with what extensions contribute to the footer. */
export function sidebarFooterItems(contributed: NavigationItem[]): DesktopIconStripItem[] {
	const items = contributed
		.filter((item) => item.placement === 'footer')
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

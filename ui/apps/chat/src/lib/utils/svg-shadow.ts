const SVG_VIEWBOX_ATTR = 'viewBox';
const SVG_DIMENSION_PATTERN = /^\s*(\d*\.?\d+)\s*(px)?\s*$/;

/**
 * Reads a plain (unitless or px) svg width/height attribute as a number.
 */
function readSvgDimension(svg: SVGSVGElement, attr: 'width' | 'height'): number | null {
	const match = svg.getAttribute(attr)?.match(SVG_DIMENSION_PATTERN);
	const value = match ? Number(match[1]) : NaN;

	return value > 0 ? value : null;
}

/**
 * Gives an svg with a fixed width and height but no viewBox a matching viewBox,
 * so css max-width scales the drawing instead of clipping it.
 */
function ensureSvgViewBox(svg: SVGSVGElement): void {
	if (svg.hasAttribute(SVG_VIEWBOX_ATTR)) return;

	const width = readSvgDimension(svg, 'width');
	const height = readSvgDimension(svg, 'height');

	if (width && height) svg.setAttribute(SVG_VIEWBOX_ATTR, `0 0 ${width} ${height}`);
}

/**
 * Mounts svg markup inside an open shadow root on the host element.
 * The shadow boundary scopes the svg <style> and its animations to the host,
 * so model authored css can not reach the surrounding page. The caller passes
 * markup that is already sanitized, this only isolates and sizes it.
 */
export function mountSvgShadow(host: HTMLElement, markup: string, style: string): void {
	const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

	root.innerHTML = markup ? `<style>${style}</style>${markup}` : '';

	const svg = root.querySelector('svg');

	if (svg) ensureSvgViewBox(svg);
}

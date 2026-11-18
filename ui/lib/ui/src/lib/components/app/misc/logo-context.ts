import { getContext, hasContext, setContext } from "svelte";

/** The mark `Logo` draws in place of llama-brand's icon, set by the app (a white label's own logo). */
export interface LogoMark {
  /** The mark's SVG markup */
  svg: string;
  /** Draw it in the text colour (every `fill="#..."` becomes `currentColor`); off keeps its own colours */
  monochrome?: boolean;
}

const LOGO_MARK_KEY = Symbol("llama-ui:logo-mark");

/** Sets the mark every `Logo` below this component draws. Call it during component init, e.g. in the root layout. */
export function setLogoMark(mark: LogoMark): void {
  setContext(LOGO_MARK_KEY, mark);
}

/** The mark set by `setLogoMark()` above this component, if any */
export function getLogoMark(): LogoMark | undefined {
  return hasContext(LOGO_MARK_KEY)
    ? getContext<LogoMark>(LOGO_MARK_KEY)
    : undefined;
}

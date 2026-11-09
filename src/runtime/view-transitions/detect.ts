import type { ResuxViewTransitionOptions } from "./types.js";

export function isViewTransitionSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as { startViewTransition?: unknown }).startViewTransition ===
      "function"
  );
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function shouldPerformViewTransition(
  options?: ResuxViewTransitionOptions,
  nextMeta?: { viewTransition?: boolean },
  prevMeta?: { viewTransition?: boolean },
  routerConfig?: { viewTransition?: boolean },
): boolean {
  if (options?.viewTransition !== undefined) {
    return Boolean(options.viewTransition);
  }
  if (nextMeta?.viewTransition !== undefined) {
    return Boolean(nextMeta.viewTransition);
  }
  if (prevMeta?.viewTransition !== undefined) {
    return Boolean(prevMeta.viewTransition);
  }
  return Boolean(routerConfig?.viewTransition);
}

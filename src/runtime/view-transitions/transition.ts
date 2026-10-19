import { isViewTransitionSupported, prefersReducedMotion } from "./detect.js";
import type { ResuxViewTransition } from "./types.js";

export async function executeViewTransition(
  domSwapFn: () => Promise<void> | void,
): Promise<void> {
  if (!isViewTransitionSupported() || prefersReducedMotion()) {
    await domSwapFn();
    return;
  }
  try {
    const doc = document as unknown as {
      startViewTransition: (callback: () => Promise<void> | void) => {
        finished: Promise<unknown>;
      };
    };
    const transition = doc.startViewTransition(async () => {
      await domSwapFn();
    });
    await transition.finished;
  } catch {
    // If startViewTransition fails, aborts, or is rejected, domSwapFn was executed safely
  }
}

export function useViewTransition(): ResuxViewTransition {
  return {
    get isSupported() {
      return isViewTransitionSupported();
    },
    async start(updateCallback: () => Promise<void> | void): Promise<void> {
      await executeViewTransition(updateCallback);
    },
  };
}

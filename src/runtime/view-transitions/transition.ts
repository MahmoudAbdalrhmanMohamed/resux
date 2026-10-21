import { isViewTransitionSupported, prefersReducedMotion } from "./detect.js";
import type { ResuxViewTransition } from "./types.js";

export async function executeViewTransition(
  domSwapFn: () => Promise<void> | void,
): Promise<void> {
  if (!isViewTransitionSupported() || prefersReducedMotion()) {
    await domSwapFn();
    return;
  }
  let callbackRan = false;
  let callbackRejected = false;
  let callbackError: unknown = null;
  try {
    const doc = document as unknown as {
      startViewTransition: (callback: () => Promise<void> | void) => {
        finished: Promise<unknown>;
        updateCallbackDone?: Promise<unknown>;
      };
    };
    const transition = doc.startViewTransition(async () => {
      callbackRan = true;
      try {
        await domSwapFn();
      } catch (err) {
        callbackRejected = true;
        callbackError = err;
        throw err;
      }
    });
    if (transition && typeof transition.updateCallbackDone?.catch === "function") {
      transition.updateCallbackDone.catch(() => {});
    }
    await transition.finished;
  } catch (err) {
    if (callbackRejected) {
      throw callbackError;
    }
    if (!callbackRan) {
      await domSwapFn();
    }
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

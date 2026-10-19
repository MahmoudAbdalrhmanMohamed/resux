import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isViewTransitionSupported,
  prefersReducedMotion,
  shouldPerformViewTransition,
} from "../src/runtime/view-transitions/detect.js";
import {
  executeViewTransition,
  useViewTransition,
} from "../src/runtime/view-transitions/transition.js";
import * as viewTransitionsModule from "../src/runtime/view-transitions/index.js";
import type {
  ResuxViewTransition,
  ResuxViewTransitionOptions,
} from "../src/runtime/view-transitions/types.js";

const originalDocument = (globalThis as Record<string, unknown>).document;
const originalWindow = (globalThis as Record<string, unknown>).window;

afterEach(() => {
  if (originalDocument === undefined) {
    delete (globalThis as Record<string, unknown>).document;
  } else {
    (globalThis as Record<string, unknown>).document = originalDocument;
  }

  if (originalWindow === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    (globalThis as Record<string, unknown>).window = originalWindow;
  }
});

describe("View Transitions Types & Detection", () => {
  describe("isViewTransitionSupported", () => {
    it("returns false when document is undefined", () => {
      delete (globalThis as Record<string, unknown>).document;
      expect(isViewTransitionSupported()).toBe(false);
    });

    it("returns false when document exists but startViewTransition is missing", () => {
      (globalThis as Record<string, unknown>).document = {};
      expect(isViewTransitionSupported()).toBe(false);
    });

    it("returns false when startViewTransition is not a function", () => {
      (globalThis as Record<string, unknown>).document = {
        startViewTransition: true,
      };
      expect(isViewTransitionSupported()).toBe(false);
    });

    it("returns true when document.startViewTransition is a function", () => {
      (globalThis as Record<string, unknown>).document = {
        startViewTransition: () => {},
      };
      expect(isViewTransitionSupported()).toBe(true);
    });
  });

  describe("prefersReducedMotion", () => {
    it("returns false when window is undefined", () => {
      delete (globalThis as Record<string, unknown>).window;
      expect(prefersReducedMotion()).toBe(false);
    });

    it("returns false when window.matchMedia is undefined", () => {
      (globalThis as Record<string, unknown>).window = {};
      expect(prefersReducedMotion()).toBe(false);
    });

    it("returns false when window.matchMedia is not a function", () => {
      (globalThis as Record<string, unknown>).window = {
        matchMedia: "not-a-function",
      };
      expect(prefersReducedMotion()).toBe(false);
    });

    it("returns false when matches is false", () => {
      const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
      (globalThis as Record<string, unknown>).window = {
        matchMedia: matchMediaMock,
      };
      expect(prefersReducedMotion()).toBe(false);
      expect(matchMediaMock).toHaveBeenCalledWith(
        "(prefers-reduced-motion: reduce)",
      );
    });

    it("returns true when matches is true", () => {
      const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
      (globalThis as Record<string, unknown>).window = {
        matchMedia: matchMediaMock,
      };
      expect(prefersReducedMotion()).toBe(true);
      expect(matchMediaMock).toHaveBeenCalledWith(
        "(prefers-reduced-motion: reduce)",
      );
    });
  });

  describe("shouldPerformViewTransition", () => {
    it("returns false when all inputs are undefined", () => {
      expect(shouldPerformViewTransition()).toBe(false);
      expect(
        shouldPerformViewTransition(undefined, undefined, undefined, undefined),
      ).toBe(false);
    });

    it("prioritizes options.viewTransition over nextMeta, prevMeta, and routerConfig", () => {
      // options = false overrides everything even if all others are true
      expect(
        shouldPerformViewTransition(
          { viewTransition: false },
          { viewTransition: true },
          { viewTransition: true },
          { viewTransition: true },
        ),
      ).toBe(false);

      // options = true overrides everything even if all others are false
      expect(
        shouldPerformViewTransition(
          { viewTransition: true },
          { viewTransition: false },
          { viewTransition: false },
          { viewTransition: false },
        ),
      ).toBe(true);
    });

    it("prioritizes nextMeta over prevMeta and routerConfig when options is undefined", () => {
      // nextMeta = false overrides prevMeta and routerConfig
      expect(
        shouldPerformViewTransition(
          undefined,
          { viewTransition: false },
          { viewTransition: true },
          { viewTransition: true },
        ),
      ).toBe(false);

      // nextMeta = true overrides prevMeta and routerConfig
      expect(
        shouldPerformViewTransition(
          undefined,
          { viewTransition: true },
          { viewTransition: false },
          { viewTransition: false },
        ),
      ).toBe(true);

      // options object without viewTransition property falls through to nextMeta
      expect(
        shouldPerformViewTransition(
          {},
          { viewTransition: true },
          { viewTransition: false },
          { viewTransition: false },
        ),
      ).toBe(true);
    });

    it("prioritizes prevMeta over routerConfig when options and nextMeta are undefined", () => {
      // prevMeta = false overrides routerConfig
      expect(
        shouldPerformViewTransition(
          undefined,
          undefined,
          { viewTransition: false },
          { viewTransition: true },
        ),
      ).toBe(false);

      // prevMeta = true overrides routerConfig
      expect(
        shouldPerformViewTransition(
          undefined,
          undefined,
          { viewTransition: true },
          { viewTransition: false },
        ),
      ).toBe(true);

      // empty options and nextMeta objects fall through to prevMeta
      expect(
        shouldPerformViewTransition(
          {},
          {},
          { viewTransition: true },
          { viewTransition: false },
        ),
      ).toBe(true);
    });

    it("falls back to routerConfig when options, nextMeta, and prevMeta are undefined", () => {
      expect(
        shouldPerformViewTransition(
          undefined,
          undefined,
          undefined,
          { viewTransition: true },
        ),
      ).toBe(true);

      expect(
        shouldPerformViewTransition(
          undefined,
          undefined,
          undefined,
          { viewTransition: false },
        ),
      ).toBe(false);

      expect(
        shouldPerformViewTransition({}, {}, {}, { viewTransition: true }),
      ).toBe(true);

      expect(
        shouldPerformViewTransition({}, {}, {}, { viewTransition: false }),
      ).toBe(false);
    });
  });

  describe("types validation", () => {
    it("conforms to ResuxViewTransition and ResuxViewTransitionOptions interface structure", () => {
      const options: ResuxViewTransitionOptions = {
        viewTransition: true,
      };
      expect(options.viewTransition).toBe(true);

      const transition: ResuxViewTransition = {
        isSupported: true,
        start: async (callback) => {
          await callback();
        },
      };
      expect(transition.isSupported).toBe(true);
      expect(typeof transition.start).toBe("function");
    });
  });

  describe("executeViewTransition", () => {
    it("executes domSwapFn directly when startViewTransition is unsupported", async () => {
      delete (globalThis as Record<string, unknown>).document;
      let executed = false;
      await executeViewTransition(() => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it("executes domSwapFn directly when document exists but startViewTransition is missing", async () => {
      (globalThis as Record<string, unknown>).document = {};
      let executed = false;
      await executeViewTransition(async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it("executes domSwapFn directly when prefersReducedMotion is true (bypassing startViewTransition)", async () => {
      const startViewTransitionMock = vi.fn();
      (globalThis as Record<string, unknown>).document = {
        startViewTransition: startViewTransitionMock,
      };
      (globalThis as Record<string, unknown>).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      };

      let executed = false;
      await executeViewTransition(() => {
        executed = true;
      });

      expect(executed).toBe(true);
      expect(startViewTransitionMock).not.toHaveBeenCalled();
    });

    it("delegates to document.startViewTransition when supported, running domSwapFn and awaiting transition.finished", async () => {
      let domSwapExecuted = false;
      let finishedResolved = false;

      let capturedCallback: (() => Promise<void> | void) | null = null;
      const finishedPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          finishedResolved = true;
          resolve();
        }, 10);
      });

      const startViewTransitionMock = vi.fn().mockImplementation((cb) => {
        capturedCallback = cb;
        return {
          finished: finishedPromise,
        };
      });

      (globalThis as Record<string, unknown>).document = {
        startViewTransition: startViewTransitionMock,
      };
      (globalThis as Record<string, unknown>).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };

      const executionPromise = executeViewTransition(async () => {
        domSwapExecuted = true;
      });

      expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
      expect(capturedCallback).toBeTypeOf("function");

      // Invoking callback passed to startViewTransition
      await (capturedCallback as any)();
      expect(domSwapExecuted).toBe(true);

      await executionPromise;
      expect(finishedResolved).toBe(true);
    });

    it("gracefully handles rejection from transition.finished without throwing", async () => {
      const startViewTransitionMock = vi.fn().mockReturnValue({
        finished: Promise.reject(new Error("Transition aborted")),
      });

      (globalThis as Record<string, unknown>).document = {
        startViewTransition: startViewTransitionMock,
      };
      (globalThis as Record<string, unknown>).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };

      let executed = false;
      await expect(
        executeViewTransition(() => {
          executed = true;
        }),
      ).resolves.toBeUndefined();
      expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
    });

    it("gracefully handles synchronous error thrown by startViewTransition without throwing", async () => {
      const startViewTransitionMock = vi.fn().mockImplementation(() => {
        throw new Error("Synchronous failure in startViewTransition");
      });

      (globalThis as Record<string, unknown>).document = {
        startViewTransition: startViewTransitionMock,
      };
      (globalThis as Record<string, unknown>).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };

      await expect(
        executeViewTransition(() => {}),
      ).resolves.toBeUndefined();
    });
  });

  describe("useViewTransition", () => {
    it("returns isSupported dynamically reflecting isViewTransitionSupported()", () => {
      delete (globalThis as Record<string, unknown>).document;
      const transition = useViewTransition();
      expect(transition.isSupported).toBe(false);

      (globalThis as Record<string, unknown>).document = {
        startViewTransition: () => {},
      };
      expect(transition.isSupported).toBe(true);
    });

    it("start() triggers executeViewTransition with the provided callback", async () => {
      let callbackExecuted = false;
      delete (globalThis as Record<string, unknown>).document;

      const transition = useViewTransition();
      await transition.start(async () => {
        callbackExecuted = true;
      });

      expect(callbackExecuted).toBe(true);
    });
  });

  describe("view-transitions barrel re-exports (index.ts)", () => {
    it("exports all expected helpers, functions, and composables", () => {
      expect(typeof viewTransitionsModule.isViewTransitionSupported).toBe("function");
      expect(typeof viewTransitionsModule.prefersReducedMotion).toBe("function");
      expect(typeof viewTransitionsModule.shouldPerformViewTransition).toBe("function");
      expect(typeof viewTransitionsModule.executeViewTransition).toBe("function");
      expect(typeof viewTransitionsModule.useViewTransition).toBe("function");
    });
  });
});


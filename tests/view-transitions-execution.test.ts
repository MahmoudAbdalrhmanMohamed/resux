import { describe, expect, it, vi } from "vitest";
import { executeViewTransition, useViewTransition } from "../src/runtime/view-transitions/transition.js";
import * as viewTransitionsModule from "../src/runtime/view-transitions/index.js";
import type { ResuxViewTransition, ResuxViewTransitionOptions } from "../src/runtime/view-transitions/types.js";
import { mockBrowserWithViewTransition, restoreBrowserGlobalsAfterEach } from "./helpers/view-transition-fixtures.js";

restoreBrowserGlobalsAfterEach();

describe("View Transitions Types & Detection", () => {
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

      mockBrowserWithViewTransition(startViewTransitionMock);

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

      mockBrowserWithViewTransition(startViewTransitionMock);

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

      mockBrowserWithViewTransition(startViewTransitionMock);

      await expect(
        executeViewTransition(() => {}),
      ).resolves.toBeUndefined();
    });

    it("rethrows when domSwapFn rejects with falsy values like undefined or null", async () => {
      const startViewTransitionMock = vi.fn().mockImplementation((cb) => {
        const updateCallbackDone = Promise.resolve().then(() => cb());
        return {
          finished: updateCallbackDone,
          updateCallbackDone,
        };
      });

      mockBrowserWithViewTransition(startViewTransitionMock);

      await expect(
        executeViewTransition(async () => {
          throw undefined;
        }),
      ).rejects.toBeUndefined();
    });

    it("attaches rejection handler to updateCallbackDone avoiding unhandled rejection", async () => {
      const fakeUpdateCallbackDone = {
        catch: vi.fn(),
      };

      const startViewTransitionMock = vi.fn().mockImplementation(() => {
        return {
          finished: Promise.resolve(),
          updateCallbackDone: fakeUpdateCallbackDone,
        };
      });

      mockBrowserWithViewTransition(startViewTransitionMock);

      await executeViewTransition(() => {});
      expect(fakeUpdateCallbackDone.catch).toHaveBeenCalled();
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

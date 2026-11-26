import { describe, expect, it, vi } from "vitest";
import { isViewTransitionSupported, prefersReducedMotion, shouldPerformViewTransition } from "../src/runtime/view-transitions/detect.js";
import { restoreBrowserGlobalsAfterEach } from "./helpers/view-transition-fixtures.js";

restoreBrowserGlobalsAfterEach();

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

});

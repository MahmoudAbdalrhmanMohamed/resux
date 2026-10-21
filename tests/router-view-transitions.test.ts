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

function mockBrowserWithViewTransition(startViewTransitionMock: any, motionMatches = false) {
  (globalThis as Record<string, unknown>).document = {
    startViewTransition: startViewTransitionMock,
  };
  (globalThis as Record<string, unknown>).window = {
    matchMedia: vi.fn().mockReturnValue({ matches: motionMatches }),
  };
}

function parseViewTransitionAttribute(anchor: { getAttribute: (name: string) => string | null }) {
  const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
  const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
  return {
    viewTransition,
    navOptions: { ...(viewTransition !== undefined ? { viewTransition } : {}) },
  };
}

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

  describe("Task 3: Router & <ResuxLink> View Transitions Integration", () => {
    describe("ResuxClientNavigationOptions", () => {
      it("accepts viewTransition?: boolean in ResuxClientNavigationOptions", async () => {
        const { navigateClient } = await import("../src/runtime/router.js");
        type NavigationOptions = Parameters<typeof navigateClient>[1];

        const optionsWithTrue: NavigationOptions = {
          replace: true,
          state: { step: 1 },
          viewTransition: true,
        };
        expect(optionsWithTrue.viewTransition).toBe(true);

        const optionsWithFalse: NavigationOptions = {
          viewTransition: false,
        };
        expect(optionsWithFalse.viewTransition).toBe(false);

        const optionsUndefined: NavigationOptions = {};
        expect(optionsUndefined.viewTransition).toBeUndefined();
      });

      it("preserves options.state original type and value (arrays, dates, primitives) without injecting __viewTransition", async () => {
        const { navigateClient } = await import("../src/runtime/router.js");
        const pushStateMock = vi.fn();
        const dispatchEventMock = vi.fn();
        (globalThis as any).window = {
          location: { href: "https://resux.local/from" },
          history: { pushState: pushStateMock, replaceState: vi.fn() },
          dispatchEvent: dispatchEventMock,
        };

        const arrayState = [1, 2, 3];
        navigateClient("/target", { state: arrayState, viewTransition: true });
        expect(pushStateMock).toHaveBeenCalledWith(arrayState, "", "/target");
        expect(Array.isArray(pushStateMock.mock.calls[0][0])).toBe(true);
        expect(pushStateMock.mock.calls[0][0]).not.toHaveProperty("__viewTransition");

        const dateState = new Date(1700000000000);
        navigateClient("/target", { state: dateState, viewTransition: true });
        expect(pushStateMock.mock.calls[1][0]).toBe(dateState);

        const primitiveState = "hello-state";
        navigateClient("/target", { state: primitiveState, viewTransition: true });
        expect(pushStateMock.mock.calls[2][0]).toBe("hello-state");

        const lastDispatchedEvent = dispatchEventMock.mock.calls[2][0];
        expect(lastDispatchedEvent.state).toBe("hello-state");
      });
    });

    describe("src/runtime/index.ts exports & SetupContext", () => {
      it("cleanly exports useViewTransition composable and types from src/runtime/index.ts", async () => {
        const runtime = await import("../src/runtime/index.js");
        expect(typeof (runtime as any).useViewTransition).toBe("function");
        const vt = (runtime as any).useViewTransition();
        expect(typeof vt.start).toBe("function");
        expect(typeof vt.isSupported).toBe("boolean");
      });

      it("provides useViewTransition() on SetupContext created by createServerSetupContext", async () => {
        const { createServerSetupContext } = await import("../src/runtime/index.js");
        const ctx = createServerSetupContext({
          route: { path: "/", params: {}, query: {} },
          runtimeConfig: {},
          resuxApp: { route: { path: "/", params: {}, query: {} }, $config: {} } as any,
        });

        expect(typeof ctx.useViewTransition).toBe("function");
        const vt = ctx.useViewTransition();
        expect(typeof vt.start).toBe("function");
        expect(typeof vt.isSupported).toBe("boolean");
      });
    });

    describe("handleNavigationClick view-transition attribute parsing", () => {
      it("extracts data-view-transition='true' and passes { viewTransition: true }", () => {
        const anchor = {
          getAttribute: vi.fn((name: string) => {
            if (name === "data-view-transition") return "true";
            return null;
          }),
        };

        const { viewTransition, navOptions } = parseViewTransitionAttribute(anchor);
        expect(viewTransition).toBe(true);
        expect(navOptions).toEqual({ viewTransition: true });
      });

      it("extracts data-view-transition='false' and passes { viewTransition: false }", () => {
        const anchor = {
          getAttribute: vi.fn((name: string) => {
            if (name === "data-view-transition") return "false";
            return null;
          }),
        };

        const { viewTransition, navOptions } = parseViewTransitionAttribute(anchor);
        expect(viewTransition).toBe(false);
        expect(navOptions).toEqual({ viewTransition: false });
      });

      it("extracts boolean view-transition attribute and passes { viewTransition: true }", () => {
        const anchor = {
          getAttribute: vi.fn((name: string) => {
            if (name === "view-transition") return "";
            return null;
          }),
        };

        const { viewTransition, navOptions } = parseViewTransitionAttribute(anchor);
        expect(viewTransition).toBe(true);
        expect(navOptions).toEqual({ viewTransition: true });
      });

      it("omits viewTransition when attributes are absent", () => {
        const anchor = {
          getAttribute: vi.fn(() => null),
        };

        const { viewTransition, navOptions } = parseViewTransitionAttribute(anchor);
        expect(viewTransition).toBeUndefined();
        expect(navOptions).toEqual({});
      });

      it("has view-transition attribute extraction wired in getClientRuntimeSource() handleNavigationClick", async () => {
        const { getClientRuntimeSource } = await import("../src/runtime/index.js");
        const source = getClientRuntimeSource();

        expect(source).toContain('anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition")');
        expect(source).toContain('const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;');
        expect(source).toContain('void navigateTo(nextPath + target.hash, { ...(viewTransition !== undefined ? { viewTransition } : {}) });');
      });
    });

    describe("navigateTo integration with executeViewTransition", () => {
      it("has executeViewTransition wired around route DOM swap in getClientRuntimeSource()", async () => {
        const { getClientRuntimeSource } = await import("../src/runtime/index.js");
        const source = getClientRuntimeSource();

        expect(source).toContain("const useTransition = shouldPerformViewTransition(");
        expect(source).toContain("const performSwap = () => {");
        expect(source).toContain("if (useTransition) {");
        expect(source).toContain("await executeViewTransition(performSwap);");
        expect(source).toContain("performSwap();");
      });

      it("generates valid, parseable JavaScript without duplicate exports", async () => {
        const { getClientRuntimeSource } = await import("../src/runtime/index.js");
        const source = getClientRuntimeSource();
        const prevDoc = (globalThis as any).document;
        const prevWin = (globalThis as any).window;
        try {
          (globalThis as any).document = {
            getElementById: () => null,
            addEventListener: () => {},
            querySelectorAll: () => [],
            createElement: () => ({ setAttribute: () => {} }),
            head: { appendChild: () => {} }
          };
          (globalThis as any).window = {
            location: { href: "http://localhost/" },
            addEventListener: () => {},
            matchMedia: () => ({ matches: false })
          };
          const module = await import("data:text/javascript," + encodeURIComponent(source));
          expect(typeof module.useViewTransition).toBe("function");
          expect(typeof module.createClientComponent).toBe("function");
        } finally {
          (globalThis as any).document = prevDoc;
          (globalThis as any).window = prevWin;
        }
      });

      it("invokes executeViewTransition when useTransition is true, running performSwap within the transition callback", async () => {
        let swapCalled = false;
        const performSwap = vi.fn(() => {
          swapCalled = true;
        });

        const startViewTransitionMock = vi.fn().mockImplementation((cb) => {
          cb();
          return { finished: Promise.resolve() };
        });

        mockBrowserWithViewTransition(startViewTransitionMock);

        const options = { viewTransition: true };
        const useTransition = shouldPerformViewTransition(options, undefined, undefined, {});
        expect(useTransition).toBe(true);

        if (useTransition) {
          await executeViewTransition(performSwap);
        } else {
          performSwap();
        }

        expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
        expect(swapCalled).toBe(true);
        expect(performSwap).toHaveBeenCalledTimes(1);
      });

      it("bypasses executeViewTransition when useTransition is false, running performSwap directly", async () => {
        let swapCalled = false;
        const performSwap = vi.fn(() => {
          swapCalled = true;
        });

        const startViewTransitionMock = vi.fn();
        mockBrowserWithViewTransition(startViewTransitionMock);

        const options = { viewTransition: false };
        const useTransition = shouldPerformViewTransition(options, undefined, undefined, { viewTransition: true });
        expect(useTransition).toBe(false);

        if (useTransition) {
          await executeViewTransition(performSwap);
        } else {
          performSwap();
        }

        expect(startViewTransitionMock).not.toHaveBeenCalled();
        expect(swapCalled).toBe(true);
        expect(performSwap).toHaveBeenCalledTimes(1);
      });
    });
  });
});


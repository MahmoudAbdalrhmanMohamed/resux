import { describe, expect, it, vi } from "vitest";
import { shouldPerformViewTransition } from "../src/runtime/view-transitions/detect.js";
import { executeViewTransition, useViewTransition } from "../src/runtime/view-transitions/transition.js";
import { mockBrowserWithViewTransition, parseViewTransitionAttribute, restoreBrowserGlobalsAfterEach } from "./helpers/view-transition-fixtures.js";

restoreBrowserGlobalsAfterEach();

describe("View Transitions Types & Detection", () => {
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

      it("renders ResuxLink dynamic view-transition=false as data-view-transition='false' in both SSR and client runtime", async () => {
        const { defineComponent, getClientRuntimeSource, renderApp } = await import("../src/runtime/index.js");
        const Page = defineComponent({
          id: "vt-link-page",
          name: "VtLinkPage",
          file: "VtLinkPage.vue",
          script: () => ({ disableVt: false }),
          template: [
            {
              type: "element",
              tag: "ResuxLink",
              attrs: [
                { name: "to", kind: "static", value: "/next" },
                { name: "view-transition", kind: "dynamic", value: "disableVt", bindingId: "b0" },
              ],
              events: [],
              children: [{ type: "text", kind: "static", value: "Next" }],
            },
          ],
        });

        const rendered = await renderApp({
          page: Page,
          route: { path: "/", params: {}, query: {} },
        });
        expect(rendered.html).toContain('data-view-transition="false"');

        const clientSource = getClientRuntimeSource();
        expect(clientSource).toContain('const isViewTransitionAttr = attrName === "data-view-transition" || attrName === "view-transition";');
        expect(clientSource).toContain('if (value !== null && value !== undefined && (value !== false || isViewTransitionAttr))');
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

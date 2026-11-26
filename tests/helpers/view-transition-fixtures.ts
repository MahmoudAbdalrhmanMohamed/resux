import { afterEach, vi } from "vitest";

const originalDocument = (globalThis as Record<string, unknown>).document;
const originalWindow = (globalThis as Record<string, unknown>).window;

export function mockBrowserWithViewTransition(startViewTransitionMock: any, motionMatches = false) {
  (globalThis as Record<string, unknown>).document = {
    startViewTransition: startViewTransitionMock,
  };
  (globalThis as Record<string, unknown>).window = {
    matchMedia: vi.fn().mockReturnValue({ matches: motionMatches }),
  };
}

export function parseViewTransitionAttribute(anchor: { getAttribute: (name: string) => string | null }) {
  const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
  const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
  return {
    viewTransition,
    navOptions: { ...(viewTransition !== undefined ? { viewTransition } : {}) },
  };
}


/** Registers an afterEach hook that restores the browser globals mocked by a test. */
export function restoreBrowserGlobalsAfterEach() {
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
}

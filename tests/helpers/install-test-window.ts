import type { Window } from "happy-dom";

const managedGlobalKeys = [
  "document",
  "window",
  "location",
  "history",
  "IntersectionObserver",
  "__RESUX__",
  "__RESUX_INSTALLED__",
] as const;

export function installTestWindow(
  window: Window,
  manifestUrl: string,
  extras: Record<string, unknown> = {},
): () => void {
  (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = manifestUrl;

  const assignments = {
    document: window.document,
    window,
    location: window.location,
    history: window.history,
    __RESUX__: {
      route: { path: "/", params: {}, query: {} },
      scopes: {},
      modules: {},
    },
    __RESUX_INSTALLED__: false,
    ...extras,
  };
  const keys = new Set<PropertyKey>([
    ...managedGlobalKeys,
    ...Reflect.ownKeys(extras),
  ]);
  const descriptors = new Map<PropertyKey, PropertyDescriptor | undefined>();

  for (const key of keys) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }

  Object.assign(globalThis, assignments);

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;

    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  };
}

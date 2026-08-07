import { describe, expect, it } from "vitest";
import {
  createError,
  defineComponent,
  renderApp,
  useError,
  useResuxApp,
  type ComponentDefinition,
  type RuntimeConfig,
} from "resuxjs/runtime";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe("runtime concurrent SSR regressions", () => {
  it("keeps useResuxApp request-local across overlapping async renders", async () => {
    const enteredA = deferred();
    const enteredB = deferred();
    const releaseA = deferred();
    const releaseB = deferred();

    const page: ComponentDefinition = defineComponent({
      id: "concurrent-app-context",
      name: "ConcurrentAppContext",
      file: "ConcurrentAppContext.vue",
      handlers: [],
      async script() {
        const firstPath = useResuxApp().route.path;
        if (firstPath === "/a") {
          enteredA.resolve();
          await releaseA.promise;
        } else if (firstPath === "/b") {
          enteredB.resolve();
          await releaseB.promise;
        }
        const secondPath = useResuxApp().route.path;
        return { result: `${firstPath}:${secondPath}` };
      },
      template: [{ type: "interpolation", expression: "result", bindingId: "b0" }],
    });

    const renderA = renderApp({
      page,
      route: { path: "/a", params: {}, query: {} },
    });
    await enteredA.promise;

    const renderB = renderApp({
      page,
      route: { path: "/b", params: {}, query: {} },
    });
    await enteredB.promise;

    releaseA.resolve();
    const resultA = await renderA;
    releaseB.resolve();
    const resultB = await renderB;

    expect(resultA.html).toContain("/a:/a");
    expect(resultB.html).toContain("/b:/b");
  });

  it("isolates useError state between overlapping server renders", async () => {
    const enteredA = deferred();
    const enteredB = deferred();
    const releaseA = deferred();
    const releaseB = deferred();

    const page: ComponentDefinition = defineComponent({
      id: "concurrent-error-context",
      name: "ConcurrentErrorContext",
      file: "ConcurrentErrorContext.vue",
      handlers: [],
      async script() {
        const routePath = useResuxApp().route.path;
        const error = useError();
        const initial = error.value?.message ?? "empty";
        error.value = createError(routePath === "/a" ? "error-a" : "error-b");

        if (routePath === "/a") {
          enteredA.resolve();
          await releaseA.promise;
        } else {
          enteredB.resolve();
          await releaseB.promise;
        }

        return {
          result: `${initial}:${error.value?.message ?? "empty"}`,
        };
      },
      template: [{ type: "interpolation", expression: "result", bindingId: "b0" }],
    });

    const renderA = renderApp({
      page,
      route: { path: "/a", params: {}, query: {} },
    });
    await enteredA.promise;

    const renderB = renderApp({
      page,
      route: { path: "/b", params: {}, query: {} },
    });
    await enteredB.promise;

    releaseA.resolve();
    const resultA = await renderA;
    releaseB.resolve();
    const resultB = await renderB;

    expect(resultA.html).toContain("empty:error-a");
    expect(resultB.html).toContain("empty:error-b");
  });

  it("keeps global template translations bound to the active request", async () => {
    const enteredA = deferred();
    const enteredB = deferred();
    const releaseA = deferred();
    const releaseB = deferred();

    const page: ComponentDefinition = defineComponent({
      id: "concurrent-i18n-context",
      name: "ConcurrentI18nContext",
      file: "ConcurrentI18nContext.vue",
      handlers: [],
      async script() {
        const routePath = useResuxApp().route.path;
        if (routePath === "/a") {
          enteredA.resolve();
          await releaseA.promise;
        } else {
          enteredB.resolve();
          await releaseB.promise;
        }
        return {};
      },
      template: [{ type: "interpolation", expression: "$t('greeting')", bindingId: "b0" }],
    });

    const englishConfig: RuntimeConfig = {
      public: {
        i18n: {
          defaultLocale: "en",
          fallbackLocale: "en",
          strategy: "prefix_except_default",
          locales: [{ code: "en", dir: "ltr" }],
          messages: { en: { greeting: "Hello A" } },
        },
      },
    };
    const arabicConfig: RuntimeConfig = {
      public: {
        i18n: {
          defaultLocale: "ar",
          fallbackLocale: "ar",
          strategy: "prefix_except_default",
          locales: [{ code: "ar", dir: "rtl" }],
          messages: { ar: { greeting: "مرحبا ب" } },
        },
      },
    };

    const renderA = renderApp({
      page,
      route: { path: "/a", params: {}, query: {} },
      runtimeConfig: englishConfig,
    });
    await enteredA.promise;

    const renderB = renderApp({
      page,
      route: { path: "/b", params: {}, query: {} },
      runtimeConfig: arabicConfig,
    });
    await enteredB.promise;

    releaseA.resolve();
    const resultA = await renderA;
    releaseB.resolve();
    const resultB = await renderB;

    expect(resultA.html).toContain("Hello A");
    expect(resultB.html).toContain("مرحبا ب");
  });
});

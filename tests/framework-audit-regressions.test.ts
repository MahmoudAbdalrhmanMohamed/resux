import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";
import { createResuxHooks } from "../src/core/hooks.js";
import { loadResuxDeployConfig } from "../src/deploy/common.js";
import {
  buildLocalePath,
  normalizeI18nRuntimeConfig,
  resolveI18nRoute,
} from "../src/i18n/shared.js";
import { useI18n } from "../src/i18n/index.js";
import {
  addComponent,
  withResuxKitContext,
} from "../src/kit/index.js";
import { nextTick, ref, watch } from "../src/reactivity/index.js";
import type { ResuxModuleContext } from "../src/core/module-container.js";
import type { ResuxAppLike } from "../src/runtime/index.js";

const tempRoots: string[] = [];
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocation = globalThis.location;

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }

  if (originalWindow === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalDocument === undefined) {
    delete (globalThis as Record<string, unknown>).document;
  } else {
    globalThis.document = originalDocument;
  }
  if (originalLocation === undefined) {
    delete (globalThis as Record<string, unknown>).location;
  } else {
    globalThis.location = originalLocation;
  }
  delete (globalThis as { __RESUX_APP__?: unknown }).__RESUX_APP__;
});

describe("framework audit regressions", () => {
  it("defers hook registrations made during a dispatch until the next dispatch", async () => {
    const hooks = createResuxHooks();
    const calls: string[] = [];
    let registered = false;

    hooks.hook("build:before", () => {
      calls.push("first");
      if (!registered) {
        registered = true;
        hooks.hook("build:before", () => {
          calls.push("late");
        });
      }
    });

    const payload = {
      appRoot: "/tmp/app",
      outDir: "/tmp/app/.resux",
      mode: "build" as const,
    };
    await hooks.callHook("build:before", payload);
    expect(calls).toEqual(["first"]);

    await hooks.callHook("build:before", payload);
    expect(calls).toEqual(["first", "first", "late"]);
  });

  it("keeps the Resux Kit context active after an await in module setup", async () => {
    const components: unknown[] = [];
    const context = {
      addComponent(component: unknown) {
        components.push(component);
      },
    } as unknown as ResuxModuleContext;

    await withResuxKitContext(context, async () => {
      await Promise.resolve();
      addComponent("components/AfterAwait.vue");
    });

    expect(components).toEqual(["components/AfterAwait.vue"]);
    expect(() => addComponent("components/Outside.vue")).toThrow("outside of a module setup context");
  });

  it("stops recursively queued watch jobs instead of hanging the scheduler", async () => {
    const count = ref(0);
    const stop = watch(count, () => {
      count.value += 1;
    });

    count.value = 1;
    await expect(nextTick()).rejects.toThrow("recursively queued job");
    stop();
    expect(count.value).toBeGreaterThan(1);
  });

  it("reads deployment options from the compiled full Resux config", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-compiled-deploy-"));
    tempRoots.push(root);
    const outDir = path.join(root, ".resux");
    await mkdir(path.join(outDir, "server"), { recursive: true });
    await writeFile(
      path.join(outDir, "server", "config.mjs"),
      `export default { deploy: { target: "netlify", nitroPreset: "netlify" } };\n`,
      "utf8",
    );

    await expect(loadResuxDeployConfig(root, outDir)).resolves.toEqual({
      target: "netlify",
      nitroPreset: "netlify",
    });
  });

  it("canonicalizes explicit default-locale prefixes before switching locales", () => {
    const config = normalizeI18nRuntimeConfig({
      defaultLocale: "en",
      fallbackLocale: "en",
      strategy: "prefix_except_default",
      locales: [
        { code: "en", dir: "ltr" },
        { code: "ar", dir: "rtl" },
      ],
      messages: { en: {}, ar: {} },
    });
    if (!config) {
      throw new Error("Expected i18n config.");
    }

    expect(resolveI18nRoute("/en/about", config)).toMatchObject({
      locale: { code: "en" },
      basePath: "/about",
      localizedPath: "/about",
    });
    expect(buildLocalePath("/en/about?tab=1#details", "ar", config)).toBe(
      "/ar/about?tab=1#details",
    );
  });

  it("preserves the browser query and hash when switching locale", () => {
    const window = new Window({ url: "https://example.com/ar/about?tab=team#people" });
    Object.assign(globalThis, {
      window,
      document: window.document,
      location: window.location,
    });

    const runtimeConfig = {
      public: {
        i18n: {
          defaultLocale: "en",
          fallbackLocale: "en",
          strategy: "prefix_except_default",
          locales: [
            { code: "en", dir: "ltr" },
            { code: "ar", dir: "rtl" },
          ],
          messages: { en: {}, ar: {} },
        },
      },
    };
    (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__ = {
      route: { path: "/ar/about", params: {}, query: { tab: "team" } },
      payload: { state: {}, data: {} },
      $config: runtimeConfig,
      provides: {},
      provide() {},
    } as unknown as ResuxAppLike;

    expect(useI18n().switchLocalePath("en")).toBe("/about?tab=team#people");
  });
});

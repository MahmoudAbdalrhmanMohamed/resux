import { describe, expect, it } from "vitest";
import { createResuxHooks } from "../src/core/hooks.js";
import { ResuxModuleContainer } from "../src/core/module-container.js";
import { assertSafeCreateTarget } from "../src/create.js";
import {
  normalizeI18nRuntimeConfig,
  translateRaw,
  translateText,
} from "../src/i18n/shared.js";

describe("full-history security regressions", () => {
  it("rejects destructive force targets that contain the current project", () => {
    expect(() => assertSafeCreateTarget("/workspace/project", "/workspace/project", true))
      .toThrow(/Refusing to use --force/);
    expect(() => assertSafeCreateTarget("/workspace", "/workspace/project", true))
      .toThrow(/Refusing to use --force/);
    expect(() => assertSafeCreateTarget("/workspace/project/new-app", "/workspace/project", true))
      .not.toThrow();
    expect(() => assertSafeCreateTarget("/workspace/project", "/workspace/project", false))
      .not.toThrow();
  });

  it("rejects prototype pollution keys in runtime config extensions", () => {
    const config: Record<string, unknown> = {};
    const container = new ResuxModuleContainer();
    const context = container.createContext(
      config,
      "/workspace/project",
      "/workspace/project/.resux",
      createResuxHooks(),
    );
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;

    expect(() => context.extendRuntimeConfig(malicious)).toThrow(/unsafe key/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not resolve inherited or prototype-chain translation keys", () => {
    const config = normalizeI18nRuntimeConfig({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: [{ code: "en" }],
      messages: {
        en: {
          safe: { label: "Safe value" },
        },
      },
    });

    expect(config).not.toBeNull();
    expect(translateRaw(config!, "en", "safe.label")).toBe("Safe value");
    expect(translateRaw(config!, "en", "constructor.name")).toBeUndefined();
    expect(translateText(config!, "en", "__proto__.polluted")).toBe("__proto__.polluted");
  });
});

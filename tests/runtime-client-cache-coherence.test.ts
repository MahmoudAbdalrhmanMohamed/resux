import { describe, expect, it } from "vitest";
import { ResuxHooks } from "../src/core/hooks.js";
import {
  RESUX_HANDLER_MODULES_PATH,
  RESUX_RUNTIME_CLIENT_CACHE_CONTROL,
  RESUX_RUNTIME_CLIENT_PATH,
  RESUX_VUE_ISLAND_MODULES_PATH,
  ResuxModuleContainer,
} from "../src/core/module-container.js";

function createModuleContext(config: Record<string, unknown>) {
  return new ResuxModuleContainer().createContext(
    config,
    "/app",
    "/app/.resux",
    new ResuxHooks(),
  );
}

describe("resumability client asset cache coherence", () => {
  it.each([
    RESUX_RUNTIME_CLIENT_PATH,
    RESUX_HANDLER_MODULES_PATH,
    RESUX_VUE_ISLAND_MODULES_PATH,
  ])("prevents modules from long-caching stable resumability asset %s", (assetPath) => {
    const config: Record<string, unknown> = {};
    const context = createModuleContext(config);

    context.addRouteRule(assetPath, {
      cache: { maxAge: 31_536_000 },
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-resux-test": "preserved",
      },
    });

    const routeRules = config.routeRules as Record<string, Record<string, unknown>>;
    const rule = routeRules[assetPath];
    expect(rule?.cache).toBe(false);
    expect(rule?.headers).toEqual({
      "x-resux-test": "preserved",
      "cache-control": RESUX_RUNTIME_CLIENT_CACHE_CONTROL,
    });
  });

  it("keeps cache policies for independently cacheable generated assets unchanged", () => {
    const config: Record<string, unknown> = {};
    const context = createModuleContext(config);

    context.addRouteRule("/__resux/image", {
      cache: { maxAge: 31_536_000 },
    });

    const routeRules = config.routeRules as Record<string, Record<string, unknown>>;
    expect(routeRules["/__resux/image"]?.cache).toEqual({ maxAge: 31_536_000 });
  });
});

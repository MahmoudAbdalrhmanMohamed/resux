import { describe, expect, it } from "vitest";
import { ResuxHooks } from "../src/core/hooks.js";
import {
  RESUX_RUNTIME_CLIENT_CACHE_CONTROL,
  RESUX_RUNTIME_CLIENT_PATH,
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

describe("runtime client cache coherence", () => {
  it("prevents modules from long-caching the stable runtime-client URL", () => {
    const config: Record<string, unknown> = {};
    const context = createModuleContext(config);

    context.addRouteRule(RESUX_RUNTIME_CLIENT_PATH, {
      cache: { maxAge: 31_536_000 },
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-resux-test": "preserved",
      },
    });

    const routeRules = config.routeRules as Record<string, Record<string, unknown>>;
    const rule = routeRules[RESUX_RUNTIME_CLIENT_PATH];
    expect(rule?.cache).toBe(false);
    expect(rule?.headers).toEqual({
      "x-resux-test": "preserved",
      "cache-control": RESUX_RUNTIME_CLIENT_CACHE_CONTROL,
    });
  });

  it("keeps cache policies for other generated assets unchanged", () => {
    const config: Record<string, unknown> = {};
    const context = createModuleContext(config);

    context.addRouteRule("/__resux/handlers/**", {
      cache: { maxAge: 31_536_000 },
    });

    const routeRules = config.routeRules as Record<string, Record<string, unknown>>;
    expect(routeRules["/__resux/handlers/**"]?.cache).toEqual({ maxAge: 31_536_000 });
  });
});

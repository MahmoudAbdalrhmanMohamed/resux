import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime lazy-package cache key: the
// server engine (src/runtime/index.ts packageCacheKey) normalizes and SORTS
// the css list, so the same package requested with a differently ordered css
// list shares one cache entry. The client copy joined the css list raw, so an
// ordering difference produced a second key and a duplicate package load.

describe("client runtime package cache key", () => {
  it("dedupes css ordering like the server engine", async () => {
    const results = await runClientEngineProbe(`
      const a = packageCacheKey("pkg", { css: ["one.css", "two.css"] });
      const b = packageCacheKey("pkg", { css: ["two.css", "one.css"] });
      t("css order does not fork the cache key", a === b, a + " vs " + b);
      const padded = packageCacheKey("pkg", { css: ["  one.css ", "", "two.css"] });
      t("css entries are trimmed and blanks dropped", padded === a, padded);
      const str = packageCacheKey("pkg", { css: "one.css,two.css" });
      t("string css normalizes too", typeof str === "string" && str.length > 0, str);
      const named = packageCacheKey("pkg", { css: ["one.css", "two.css"], preferDefault: false });
      t("preferDefault=false changes the key", named !== a, named);
      const clientOnly = packageCacheKey("pkg", { css: ["one.css", "two.css"], clientOnly: true });
      t("clientOnly mode changes the key", clientOnly !== a, clientOnly);
      const other = packageCacheKey("pkg", { css: ["one.css", "two.css"], exportName: "Thing" });
      t("exportName changes the key", other !== a, other);
    `);
    expectAllPass(results);
  });
});

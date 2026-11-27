import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A page that imports a helper such as `googleFont` from "resuxjs/fonts" must not
// drag the build-time Vite plugins (fontless, fontaine) into its handler bundle.
// The module's default export is a top-level call, so bundlers (rolldown >= 1.2.12)
// keep it, and everything it references, unless the call is marked pure.
describe("built-in module entries stay tree-shakeable", () => {
  for (const entry of ["fonts", "icons", "i18n"]) {
    it(`resuxjs/${entry} marks its defineResuxModule default export as pure`, () => {
      const source = readFileSync(new URL(`../dist/${entry}/index.js`, import.meta.url), "utf8");
      const match = source.match(/var \w+_default = ([^\n]*defineResuxModule\()/);
      expect(match, "default export declaration not found").not.toBeNull();
      expect(match![1]).toMatch(/\/\* @__PURE__ \*\/\s*defineResuxModule\(/);
    });
  }
});

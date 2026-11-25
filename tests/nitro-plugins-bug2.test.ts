import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("bug 2: nitro server plugins bundling", () => {
  it("nitro.config.ts in templates/default does not ignore server/plugins and bundles them", async () => {
    const configPath = path.resolve(__dirname, "../templates/default/nitro.config.ts");
    const content = await readFile(configPath, "utf8");

    // The ignore must be narrowed so it only excludes top-level Resux plugins, NOT server/plugins
    expect(content).not.toMatch(/ignore:\s*\[[^\]]*["']plugins\/\*\*["']/);
    // It should explicitly target ./plugins/** or narrow the ignore
    expect(content).toMatch(/["']\.\/plugins\/\*\*["']|["']\^\/?plugins\/["']/);

    // It should include server/plugins or scan server
    const hasServerPlugins = content.includes("server/plugins") || content.includes('"server"');
    expect(hasServerPlugins).toBe(true);
  });
});

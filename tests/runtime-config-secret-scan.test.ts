import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function buildWithPublicConfig(publicConfig: string): Promise<string[]> {
  const root = path.join(os.tmpdir(), `resux-secret-scan-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(path.join(root, "pages"), { recursive: true });
  await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
  await writeFile(
    path.join(root, "resux.config.ts"),
    `export default defineResuxConfig({ runtimeConfig: { public: ${publicConfig} } })`,
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    await buildProject(root);
    return warn.mock.calls.map((call) => String(call[0]));
  } finally {
    warn.mockRestore();
  }
}

describe("public runtimeConfig secret scan", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns about secrets nested at any depth, and stays quiet for safe config", async () => {
    const nested = await buildWithPublicConfig(
      `{ apiBase: "/api", api: { credentials: { password: "hunter2" } }, list: [{ endpoint: "https://user:pass@example.com/x" }] }`,
    );
    const messages = nested.join("\n");
    expect(messages).toContain('Unsafe key name "api.credentials.password"');
    expect(messages).toContain('public runtimeConfig key "list[0].endpoint"');

    const safe = await buildWithPublicConfig(`{ apiBase: "/api", site: { name: "Resux", links: ["/a", "/b"] } }`);
    expect(safe.filter((line) => line.includes("[resux-safety]"))).toEqual([]);
  }, 60000);
});

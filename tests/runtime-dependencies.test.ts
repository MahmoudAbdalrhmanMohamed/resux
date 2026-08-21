import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { collectServerRuntimeDependencyNames } from "../src/deploy/runtime-dependencies.js";

it("ignores import-like text embedded in strings while collecting runtime dependencies", async () => {
  const serverRoot = path.join(
    os.tmpdir(),
    `resux-runtime-dependencies-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(serverRoot, { recursive: true });
  await writeFile(
    path.join(serverRoot, "bundle.mjs"),
    [
      'import "real-dep/subpath";',
      'import { format } from "node:util";',
      'export { value } from "@scope/exported/feature";',
      'const lazy = () => import("lazy-dep/tool");',
      'const diagnostic = \'Error: Resux Vercel server runtime requires "\';',
      'const embedded = `code: import { format } from "fake-package";`;',
      'void format; void lazy; void diagnostic; void embedded;',
    ].join("\n"),
    "utf8",
  );

  await expect(collectServerRuntimeDependencyNames(serverRoot)).resolves.toEqual([
    "@scope/exported",
    "lazy-dep",
    "real-dep",
  ]);
});

import { readFile, writeFile } from "node:fs/promises";

for (const file of ["src/cli.ts", "scripts/verify-deploy-targets.mjs"]) {
  let source = await readFile(file, "utf8");
  const target = `  compatibilityDate: "2026-05-02",\n`;
  const replacement = `  compatibilityDate: "2026-05-02",\n  cloudflare: {\n    nodeCompat: true\n  },\n`;
  const count = source.split(target).length - 1;
  if (count !== 1) {
    throw new Error(`${file}: expected exactly one compatibilityDate target, got ${count}`);
  }
  source = source.replace(target, replacement);
  await writeFile(file, source, "utf8");
}

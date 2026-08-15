import { readFile, writeFile, rm } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one patch anchor, found ${count}`);
  await writeFile(path, source.replace(before, after), "utf8");
}

await replaceOnce(
  "src/compiler/index.ts",
  `          if (calleeName === "toRefs" || ["data", "pending", "error", "value"].includes(propertyName)) {\n            bindings.add(element.name.text);\n          }`,
  `          if (isObjectTemplateRefBinding(calleeName, propertyName)) {\n            bindings.add(element.name.text);\n          }`
);

await replaceOnce(
  "src/compiler/index.ts",
  `function isObjectTemplateRefFactory(name: string): boolean {\n  return isAsyncDataFactory(name) || name === "toRefs";\n}\n`,
  `function isObjectTemplateRefFactory(name: string): boolean {\n  return isAsyncDataFactory(name) || name === "toRefs" || name === "useI18n";\n}\n\nfunction isObjectTemplateRefBinding(factory: string, property: string): boolean {\n  if (factory === "toRefs") {\n    return true;\n  }\n  if (factory === "useI18n") {\n    return property === "locale" || property === "dir";\n  }\n  return ["data", "pending", "error", "value"].includes(property);\n}\n`
);

await rm("scripts/pr36-i18n-template-ref-fix.mjs");
await rm(".github/workflows/pr36-i18n-template-ref-fix.yml");

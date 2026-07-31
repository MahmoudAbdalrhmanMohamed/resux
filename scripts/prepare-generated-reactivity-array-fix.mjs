import { readFile, writeFile } from "node:fs/promises";

const file = "scripts/apply-generated-reactivity-fixes.mjs";
let source = await readFile(file, "utf8");
const marker = `await writeFile(runtimePath, source, "utf8");`;
const patch = `replaceOnce(
  "generated reactive array length trigger",
  \`    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key);
      }
      return success;
    },\`,
  \`    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const oldLength = Array.isArray(rawTarget) ? rawTarget.length : 0;
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key);
        if (
          Array.isArray(rawTarget)
          && key !== "length"
          && /^(?:0|[1-9]\\\\d*)$/.test(String(key))
          && Number(key) >= oldLength
          && Number(key) < 4294967295
        ) {
          __rxTrigger(rawTarget, "length");
        }
      }
      return success;
    },\`,
);

${marker}`;
const first = source.indexOf(marker);
if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
  throw new Error("Could not uniquely locate generated reactivity write step.");
}
source = source.slice(0, first) + patch + source.slice(first + marker.length);
await writeFile(file, source, "utf8");

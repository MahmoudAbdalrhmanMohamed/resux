import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";

// Regression: identifiers that only appear in TypeScript type positions inside a handler body
// (generic arguments, annotations, assertions) are not runtime captures.

function compileHandler(body: string): void {
  compileVueSource(
    `<script setup lang="ts">
const count = useState("count", () => 0)
async function go() {
${body}
}
</script>
<template><button @click="go">Go</button></template>`,
    { file: "Types.vue", id: "m0", name: "Types" }
  );
}

describe("handler type annotations are not captures", () => {
  const cases: Array<[string, string]> = [
    ["object type in a generic argument", "const r = await $fetch<{ orderId: string }>('/api/x'); count.value = r.orderId.length"],
    ["named type in a generic argument", "const r = await $fetch<Order>('/api/x'); count.value = 1"],
    ["variable annotation with an object type", "const r: { total: number } = { total: 1 }; count.value = r.total"],
    ["as assertion with an object type", "const r = ({ total: 1 }) as { total: number }; count.value = r.total"],
  ];
  for (const [name, body] of cases) {
    it(`accepts ${name}`, () => {
      expect(() => compileHandler(body)).not.toThrow();
    });
  }

  it("still rejects a real capture", () => {
    expect(() => compileHandler("const x = notDefined.value; count.value = x")).toThrow(/not resumable/);
  });
});

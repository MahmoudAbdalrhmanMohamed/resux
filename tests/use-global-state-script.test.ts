import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";

// Regression: useGlobalState is documented and auto-imported, but the generated script did not
// destructure it from the setup context, so any component using it threw
// "useGlobalState is not defined" at render time.

const source = `<script setup lang="ts">
const cart = useGlobalState<number[]>("cart", () => [])
function add() { cart.value = [...cart.value, 1] }
</script>
<template><button @click="add">{{ cart.length }}</button></template>`;

describe("useGlobalState in generated scripts", () => {
  const component = compileVueSource(source, { file: "G.vue", id: "m0", name: "G" });
  const destructure = /const \{[^}]*\buseGlobalState\b[^}]*\} = __ctx/;

  it("is destructured from the setup context in the server source", () => {
    expect(component.serverSource).toMatch(destructure);
  });

  it("is destructured from the setup context in the client source", () => {
    expect(component.clientSource).toMatch(destructure);
  });
});

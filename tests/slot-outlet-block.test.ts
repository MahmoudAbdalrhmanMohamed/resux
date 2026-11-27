import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";

// A <slot> with bound props is a block, so a child re-render asks the parent for fresh slot content
// even when the slot is not inside a v-if or v-for.

function slotNode(template: string) {
  const result = compileVueSource(
    `<script setup lang="ts">\nconst n = ref(1)\n</script>\n<template>${template}</template>`,
    { file: "Child.vue", id: "m0", name: "Child" },
  );
  const find = (nodes: any[]): any => {
    for (const node of nodes) {
      if (node.tag === "slot") return node;
      const inner = find(node.children ?? []);
      if (inner) return inner;
    }
    return undefined;
  };
  return find(result.template as any[]);
}

describe("compiler: slot outlet blocks", () => {
  it("makes a scoped slot with bound props a block", () => {
    const slot = slotNode(`<header><slot name="header" :count="n">fallback</slot></header>`);
    expect(slot.if?.blockId).toBeTruthy();
  });

  it("leaves a slot with only static attributes unblocked", () => {
    const slot = slotNode(`<header><slot name="header">fallback</slot></header>`);
    expect(slot.if).toBeUndefined();
  });
});

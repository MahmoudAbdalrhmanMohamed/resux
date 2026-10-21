import { describe, it, expect } from "vitest";
import { transformStaticIcons } from "../../src/icons/transform.js";
import { registerStaticIcon } from "../../src/icons/registry.js";

describe("build-time static icon transform", () => {
  it("inlines resolved static SVG icons into template markup", () => {
    registerStaticIcon("static:star", { path: "M10 10", viewBox: "0 0 24 24" });

    const source = `<template><div><Icon name="static:star" size="18px" /></div></template>`;
    const transformed = transformStaticIcons(source, { mode: "svg" });

    expect(transformed).toContain("<svg");
    expect(transformed).toContain('viewBox="0 0 24 24"');
    expect(transformed).toContain('d="M10 10"');
    expect(transformed).toContain('width="18px"');
    expect(transformed).not.toContain('<Icon name="static:star"');
  });

  it("inlines CSS mask mode for static icons when mode is css", () => {
    registerStaticIcon("static:bolt", { path: "M5 5", viewBox: "0 0 24 24" });

    const source = `<template><Icon name="static:bolt" mode="css" size="24px" /></template>`;
    const transformed = transformStaticIcons(source);

    expect(transformed).toContain("resux-icon--css");
    expect(transformed).toContain("mask:");
    expect(transformed).not.toContain('<Icon name="static:bolt"');
  });

  it("preserves component tag when :ssr='false' or ssr='false' so client can hydrate", () => {
    registerStaticIcon("static:client-icon", { path: "M1 1" });

    const source = `<template><Icon name="static:client-icon" :ssr="false" size="20px" /></template>`;
    const transformed = transformStaticIcons(source);

    expect(transformed).toBe(source);
  });

  it("leaves components with dynamic attributes or directives intact", () => {
    registerStaticIcon("static:client-icon", { path: "M1 1" });

    const source = `<template><Icon name="static:client-icon" :size="dynamicSize" @click="handleClick" /></template>`;
    const transformed = transformStaticIcons(source);

    expect(transformed).toBe(source);
  });

  it("handles paired <Icon></Icon> tags without leaving orphan closing tags", () => {
    registerStaticIcon("static:paired", { path: "M2 2", viewBox: "0 0 24 24" });

    const source = `<template><Icon name="static:paired"></Icon></template>`;
    const transformed = transformStaticIcons(source);

    expect(transformed).toContain("<svg");
    expect(transformed).not.toContain("</Icon>");
  });

  it("leaves dynamic :name bindings intact for runtime component resolution", () => {
    const source = `<template><Icon :name="dynamicIcon" size="24px" /></template>`;
    const transformed = transformStaticIcons(source);

    expect(transformed).toBe(source);
  });

  it("escapes quotes in CSS mode style attribute", () => {
    const input = '<Icon name="material-symbols:call" mode="css" />';
    const output = transformStaticIcons(input);
    expect(output).toContain('&quot;');
    expect(output).not.toContain('style="mask: url("data:');
  });
});

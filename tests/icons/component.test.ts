// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { createApp } from "vue";
import { Icon, ResuxIcon } from "../../src/icons/component.js";
import { registerStaticIcon } from "../../src/icons/registry.js";

describe("Icon component", () => {
  it("renders an SVG icon by default", () => {
    registerStaticIcon("test:star", { path: "M10 10" });

    const container = document.createElement("div");
    const app = createApp(Icon, {
      name: "test:star",
      size: "20px",
    });
    app.mount(container);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("20px");
    expect(svg?.querySelector("path")?.getAttribute("d")).toBe("M10 10");
    app.unmount();
  });

  it("renders a CSS mask icon when mode is css", () => {
    registerStaticIcon("test:css-icon", { path: "M5 5" });

    const container = document.createElement("div");
    const app = createApp(Icon, {
      name: "test:css-icon",
      mode: "css",
      size: "32px",
    });
    app.mount(container);

    const span = container.querySelector("span.resux-icon--css");
    expect(span).not.toBeNull();
    expect(span?.getAttribute("style")).toContain("mask:");
    app.unmount();
  });

  it("supports :ssr='false' prop to render a lightweight placeholder", () => {
    registerStaticIcon("test:client-only", { path: "M2 2" });

    const container = document.createElement("div");
    const app = createApp(Icon, {
      name: "test:client-only",
      ssr: false,
    });
    app.mount(container);

    const placeholder = container.querySelector("[data-icon-ssr='false']");
    expect(placeholder).not.toBeNull();
    app.unmount();
  });

  it("exports ResuxIcon as alias of Icon", () => {
    expect(ResuxIcon).toBe(Icon);
  });
});

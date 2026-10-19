import { describe, it, expect } from "vitest";
import { renderSvgIcon } from "../../src/icons/svg-mode.js";
import type { IconData } from "../../src/icons/types.js";

describe("svg mode renderer", () => {
  it("renders a single path SVG VNode", () => {
    const data: IconData = {
      path: "M1 1h10v10H1z",
      viewBox: "0 0 24 24",
    };
    const vnode = renderSvgIcon(data, "24px");
    expect(vnode.type).toBe("svg");
    expect(vnode.props?.viewBox).toBe("0 0 24 24");
    expect(vnode.props?.width).toBe("24px");
    expect(vnode.props?.height).toBe("24px");
    expect(Array.isArray(vnode.children)).toBe(true);
  });

  it("renders multi-path SVG VNode preserving presentation attributes", () => {
    const data: IconData = {
      viewBox: "0 0 32 32",
      paths: [
        { d: "M1 1", opacity: "0.5" },
        { d: "M2 2", fill: "red" },
      ],
    };
    const vnode = renderSvgIcon(data, "2rem", "custom-class");
    expect(vnode.props?.class).toContain("custom-class");
    expect(Array.isArray(vnode.children)).toBe(true);
    expect((vnode.children as any[]).length).toBe(2);
  });
});

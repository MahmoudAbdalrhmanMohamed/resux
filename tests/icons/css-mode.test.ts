import { describe, it, expect } from "vitest";
import { iconDataToSvgString, svgToDataUri, buildCssMaskStyle } from "../../src/icons/css-mode.js";
import type { IconData } from "../../src/icons/types.js";

describe("css mask mode renderer", () => {
  it("converts IconData into an SVG string", () => {
    const data: IconData = {
      path: "M1 1h10v10H1z",
      viewBox: "0 0 32 32",
    };
    const svg = iconDataToSvgString(data);
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('d="M1 1h10v10H1z"');
  });

  it("converts SVG string into safe data URI", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M0 0#test"/></svg>`;
    const uri = svgToDataUri(svg);
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(uri).not.toContain("#test");
    expect(uri).toContain("%23test");
  });

  it("builds CSS mask style object", () => {
    const data: IconData = { path: "M0 0", viewBox: "0 0 24 24" };
    const style = buildCssMaskStyle(data, "1.5rem");

    expect(style.width).toBe("1.5rem");
    expect(style.height).toBe("1.5rem");
    expect(style.backgroundColor).toBe("currentColor");
    expect(style.mask).toContain("data:image/svg+xml;utf8,");
  });
});

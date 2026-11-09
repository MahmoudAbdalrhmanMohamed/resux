import { describe, it, expect } from "vitest";
import { parseSvgText } from "../../src/icons/parser.js";

describe("svg parser", () => {
  it("parses simple SVG into IconData", () => {
    const svg = `<svg viewBox="0 0 32 32"><path d="M1 1h10v10H1z"/></svg>`;
    const result = parseSvgText(svg);
    expect(result).not.toBeNull();
    expect(result?.viewBox).toBe("0 0 32 32");
    expect(result?.path).toBe("M1 1h10v10H1z");
  });

  it("preserves group inherited attributes", () => {
    const svg = `
      <svg viewBox="0 0 24 24" fill="none">
        <g stroke="currentColor" stroke-width="2">
          <path d="M2 2h20"/>
        </g>
      </svg>
    `;
    const result = parseSvgText(svg);
    expect(result?.paths?.[0]).toMatchObject({
      d: "M2 2h20",
      stroke: "currentColor",
      strokeWidth: "2",
    });
  });

  it("handles empty or invalid svg gracefully", () => {
    expect(parseSvgText("")).toBeNull();
    expect(parseSvgText("<div>not svg</div>")).toBeNull();
  });
});

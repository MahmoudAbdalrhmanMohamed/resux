import { describe, it, expect } from "vitest";
import type {
  IconData,
  IconPathData,
  IconProps,
  ResuxIconsConfig,
  IconMode,
} from "../../src/icons/types.js";
import {
  DEFAULT_ICON_API_PROVIDER,
  DEFAULT_ICON_SIZE,
  DEFAULT_ICON_MODE,
  ICON_FETCH_TIMEOUT_MS,
  ICON_FETCH_MAX_BYTES,
  ICON_FETCH_CACHE_MAX_ENTRIES,
} from "../../src/icons/constants.js";

describe("icons types and constants", () => {
  it("exports expected default constants", () => {
    expect(DEFAULT_ICON_API_PROVIDER).toBe("https://api.iconify.design");
    expect(DEFAULT_ICON_SIZE).toBe("1.25rem");
    expect(DEFAULT_ICON_MODE).toBe("svg");
    expect(ICON_FETCH_TIMEOUT_MS).toBe(10_000);
    expect(ICON_FETCH_MAX_BYTES).toBe(256 * 1024);
    expect(ICON_FETCH_CACHE_MAX_ENTRIES).toBe(256);
  });

  it("satisfies IconData interface constraints", () => {
    const sampleData: IconData = {
      path: "M0 0h24v24H0z",
      viewBox: "0 0 24 24",
      fill: "currentColor",
    };
    expect(sampleData.viewBox).toBe("0 0 24 24");
  });
});

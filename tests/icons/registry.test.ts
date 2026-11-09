import { describe, it, expect } from "vitest";
import {
  iconRegistry,
  iconAliases,
  registerStaticIcon,
  getStaticIcon,
} from "../../src/icons/registry.js";

describe("static icons registry", () => {
  it("contains essential built-in icons", () => {
    expect(iconRegistry["material-symbols:call"]).toBeDefined();
    expect(iconRegistry["material-symbols:mail"]).toBeDefined();
    expect(iconRegistry["ph:check-circle-thin"]).toBeDefined();
    expect(iconRegistry["line-md:email-filled"]).toBeDefined();
  });

  it("contains essential aliases", () => {
    expect(iconAliases["call"]).toBe("material-symbols:call");
    expect(iconAliases["mail"]).toBe("material-symbols:mail");
    expect(iconAliases["search"]).toBe("hugeicons:search-01");
  });

  it("supports dynamic registration", () => {
    registerStaticIcon("custom:star", { path: "M0 0l12 12" });
    expect(getStaticIcon("custom:star")?.path).toBe("M0 0l12 12");
  });
});

import { isLogLevel, levelEnabled, minLevel } from "./levels.ts";

describe("levels", () => {
  it("knows its levels", () => {
    expect(isLogLevel("warn")).toBe(true);
    expect(isLogLevel("verbose")).toBe(false);
  });

  it("defaults to debug in development and info in production", () => {
    expect(minLevel(undefined, false)).toBe("debug");
    expect(minLevel(undefined, true)).toBe("info");
    expect(minLevel("nonsense", true)).toBe("info");
    expect(minLevel("error", false)).toBe("error");
  });

  it("lets through the level and those above it", () => {
    expect(levelEnabled("warn", "info")).toBe(true);
    expect(levelEnabled("info", "info")).toBe(true);
    expect(levelEnabled("debug", "info")).toBe(false);
  });
});

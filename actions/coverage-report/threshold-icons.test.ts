import { test, expect, describe } from "vitest";
import { COLOR_ICON, buildThresholdIcons, formatOutput } from "./threshold-icons";

describe("COLOR_ICON", () => {
  test("has all expected keys", () => {
    expect(Object.keys(COLOR_ICON).sort()).toEqual(
      ["100", "green", "grey", "orange", "red", "yellow"].sort(),
    );
  });
});

describe("buildThresholdIcons", () => {
  test("maps thresholds to icons", () => {
    const result = buildThresholdIcons({ "90": "green", "80": "yellow" });
    expect(result).toContain(`90: '${COLOR_ICON["green"]}'`);
    expect(result).toContain(`80: '${COLOR_ICON["yellow"]}'`);
  });

  test("adds 100 entry when missing", () => {
    const result = buildThresholdIcons({ "90": "green" });
    expect(result).toContain(`100: '${COLOR_ICON["100"]}'`);
  });

  test("preserves existing 100 entry", () => {
    const result = buildThresholdIcons({ "100": "green", "90": "yellow" });
    expect(result).toContain(`100: '${COLOR_ICON["green"]}'`);
    expect(result).not.toContain(COLOR_ICON["100"]);
  });

  test("falls back to ⬜ for unknown color", () => {
    const result = buildThresholdIcons({ "50": "purple" });
    expect(result).toContain("50: '⬜'");
  });

  test("handles full typical config", () => {
    const result = buildThresholdIcons({
      "90": "green",
      "80": "yellow",
      "50": "orange",
      "1": "red",
      "0": "grey",
    });
    expect(result).toContain(`90: '${COLOR_ICON["green"]}'`);
    expect(result).toContain(`80: '${COLOR_ICON["yellow"]}'`);
    expect(result).toContain(`50: '${COLOR_ICON["orange"]}'`);
    expect(result).toContain(`1: '${COLOR_ICON["red"]}'`);
    expect(result).toContain(`0: '${COLOR_ICON["grey"]}'`);
    expect(result).toContain(`100: '${COLOR_ICON["100"]}'`);
  });

  test("handles empty object (only adds 100)", () => {
    const result = buildThresholdIcons({});
    expect(result).toBe(`100: '${COLOR_ICON["100"]}'`);
  });
});

describe("formatOutput", () => {
  test("wraps icons in GitHub Actions output format", () => {
    const icons = `90: '${COLOR_ICON["green"]}', 80: '${COLOR_ICON["yellow"]}'`;
    expect(formatOutput(icons)).toBe(`threshold-icons={${icons}}`);
  });
});

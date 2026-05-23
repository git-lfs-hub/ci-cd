import { test, expect, describe } from "vitest";
import { parseThresholds, resolveColor, makeBadge } from "./coverage-badge";

describe("parseThresholds", () => {
  test("sorts descending by min", () => {
    const result = parseThresholds({ "50": "orange", "90": "green", "80": "yellow" });
    expect(result).toEqual([
      { min: 90, color: "green" },
      { min: 80, color: "yellow" },
      { min: 50, color: "orange" },
    ]);
  });

  test("handles single entry", () => {
    const result = parseThresholds({ "0": "grey" });
    expect(result).toEqual([{ min: 0, color: "grey" }]);
  });

  test("handles empty object", () => {
    expect(parseThresholds({})).toEqual([]);
  });
});

describe("resolveColor", () => {
  const thresholds = parseThresholds({
    "90": "green",
    "80": "yellow",
    "50": "orange",
    "1": "red",
    "0": "grey",
  });

  test("returns green for 95%", () => {
    expect(resolveColor(95, thresholds)).toBe("green");
  });

  test("returns green at exact boundary 90%", () => {
    expect(resolveColor(90, thresholds)).toBe("green");
  });

  test("returns yellow for 85%", () => {
    expect(resolveColor(85, thresholds)).toBe("yellow");
  });

  test("returns orange for 50%", () => {
    expect(resolveColor(50, thresholds)).toBe("orange");
  });

  test("returns red for 1%", () => {
    expect(resolveColor(1, thresholds)).toBe("red");
  });

  test("returns grey for 0%", () => {
    expect(resolveColor(0, thresholds)).toBe("grey");
  });

  test("returns grey fallback with empty thresholds", () => {
    expect(resolveColor(50, [])).toBe("grey");
  });

  test("returns green for 100%", () => {
    expect(resolveColor(100, thresholds)).toBe("green");
  });
});

describe("makeBadge", () => {
  test("produces correct badge object", () => {
    expect(makeBadge(85.5, "yellow")).toEqual({
      subject: "Coverage",
      status: "85.5%",
      color: "yellow",
    });
  });

  test("handles 0%", () => {
    expect(makeBadge(0, "grey")).toEqual({
      subject: "Coverage",
      status: "0%",
      color: "grey",
    });
  });

  test("handles 100%", () => {
    expect(makeBadge(100, "green")).toEqual({
      subject: "Coverage",
      status: "100%",
      color: "green",
    });
  });
});

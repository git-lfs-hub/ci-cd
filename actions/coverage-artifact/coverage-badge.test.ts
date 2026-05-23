import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import {
  parseThresholds,
  resolveColor,
  makeBadge,
  main,
} from "./coverage-badge";
import { join } from "node:path";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("parseThresholds", () => {
  test("sorts descending by min", () => {
    const result = parseThresholds({
      50: "orange",
      90: "green",
      80: "yellow",
    });
    expect(result).toEqual([
      { min: 90, color: "green" },
      { min: 80, color: "yellow" },
      { min: 50, color: "orange" },
    ]);
  });

  test("handles single entry", () => {
    const result = parseThresholds({ 0: "grey" });
    expect(result).toEqual([{ min: 0, color: "grey" }]);
  });

  test("handles empty object", () => {
    expect(parseThresholds({})).toEqual([]);
  });
});

describe("resolveColor", () => {
  const thresholds = parseThresholds({
    90: "green",
    80: "yellow",
    50: "orange",
    1: "red",
    0: "grey",
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

describe("main", () => {
  let origCwd: string;
  let tmpDir: string;

  beforeEach(async () => {
    origCwd = process.cwd();
    tmpDir = await mkdtemp(join(tmpdir(), "badge-test-"));
    process.chdir(tmpDir);
    await mkdir(join(tmpDir, "coverage"), { recursive: true });
    await Bun.write(
      join(tmpDir, "coverage/coverage-summary.json"),
      JSON.stringify({ total: { statements: { pct: 85.5 } } }),
    );
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(tmpDir, { recursive: true });
  });

  test("reads summary, resolves color, writes badge.json", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await main(JSON.stringify({ 90: "green", 80: "yellow", 0: "red" }));
    const badge = await Bun.file(
      join(tmpDir, "coverage/coverage-badge.json"),
    ).json();
    expect(badge).toEqual({
      subject: "Coverage",
      status: "85.5%",
      color: "yellow",
    });
    expect(spy).toHaveBeenCalledWith(
      "::notice file=coverage/coverage-badge.json::File written: coverage/coverage-badge.json",
    );
    spy.mockRestore();
  });
});

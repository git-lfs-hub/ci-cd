import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { download, summaryOutputLine, main } from "./download-main-coverage";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("summaryOutputLine", () => {
  test("formats GITHUB_OUTPUT line", () => {
    expect(summaryOutputLine("coverage/main/coverage-summary.json")).toBe(
      "main-json-summary=coverage/main/coverage-summary.json",
    );
  });
});

describe("download", () => {
  let tmpDir: string;
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;

  const fakeFiles: Record<string, object> = {
    "coverage-summary.json": { total: { statements: { pct: 80 } } },
    "coverage-final.json": { "/src/index.ts": {} },
  };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "dl-cov-test-"));
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const name = new URL(req.url).pathname.split("/").pop()!;
        if (name in fakeFiles) {
          return new Response(JSON.stringify(fakeFiles[name]));
        }
        return new Response("Not found", { status: 404 });
      },
    });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterEach(async () => {
    server.stop(true);
    await rm(tmpDir, { recursive: true });
  });

  test("downloads files and emits ::notice::", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const destDir = join(tmpDir, "coverage/main");
    const results = await download(baseUrl, destDir);

    expect(results).toHaveLength(2);
    expect(results[0]).toContain("coverage-summary.json");
    expect(results[1]).toContain("coverage-final.json");

    const summary = await Bun.file(
      join(destDir, "coverage-summary.json"),
    ).json();
    expect(summary.total.statements.pct).toBe(80);

    const final = await Bun.file(join(destDir, "coverage-final.json")).json();
    expect(final).toHaveProperty("/src/index.ts");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0]![0]).toMatch(
      /::notice file=.*coverage-summary\.json::File written:/,
    );
    expect(spy.mock.calls[1]![0]).toMatch(
      /::notice file=.*coverage-final\.json::File written:/,
    );
    spy.mockRestore();
  });

  test("throws on 404", async () => {
    server.stop(true);
    server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("Not found", { status: 404 });
      },
    });
    const destDir = join(tmpDir, "coverage/missing");
    await expect(
      download(`http://localhost:${server.port}`, destDir),
    ).rejects.toThrow("404");
  });

  test("main() downloads and writes GITHUB_OUTPUT", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const origCwd = process.cwd();
    process.chdir(tmpDir);
    const outputFile = join(tmpDir, "github-output");
    await Bun.write(outputFile, "");

    await main(baseUrl, outputFile);

    const output = await Bun.file(outputFile).text();
    expect(output).toContain(
      "main-json-summary=coverage/main/coverage-summary.json",
    );

    const summary = await Bun.file(
      join(tmpDir, "coverage/main/coverage-summary.json"),
    ).json();
    expect(summary.total.statements.pct).toBe(80);
    process.chdir(origCwd);
    vi.restoreAllMocks();
  });
});

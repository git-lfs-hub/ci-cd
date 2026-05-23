import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import {
  applyStagingSuffix,
  createVarsInputJson,
  validateWranglerJson,
  main,
  type Vars,
} from "./staging";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("applyStagingSuffix", () => {
  test("appends -staging to existing values", () => {
    const result = applyStagingSuffix({
      cloudflare: { workerName: "my-worker" },
      s3: { bucket: "my-bucket" },
    });
    expect(result.cloudflare?.workerName).toBe("my-worker-staging");
    expect(result.s3?.bucket).toBe("my-bucket-staging");
  });

  test("uses defaults when fields missing", () => {
    const result = applyStagingSuffix({});
    expect(result.cloudflare?.workerName).toBe("lfs-server-staging");
    expect(result.s3?.bucket).toBe("lfs-objects-staging");
  });

  test("preserves other top-level keys", () => {
    const result = applyStagingSuffix({ extra: "kept" } as Vars);
    expect(result.extra).toBe("kept");
  });

  test("preserves other nested keys", () => {
    const result = applyStagingSuffix({
      cloudflare: {
        workerName: "w",
        accountId: "abc",
      } as Vars["cloudflare"] & { accountId: string },
      s3: {
        bucket: "b",
        region: "us-east-1",
      } as Vars["s3"] & { region: string },
    });
    expect(
      (result.cloudflare as Record<string, string>).accountId,
    ).toBe("abc");
    expect((result.s3 as Record<string, string>).region).toBe("us-east-1");
  });
});

describe("createVarsInputJson", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "staging-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
    vi.restoreAllMocks();
  });

  test("writes staging vars and emits ::notice::", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const outPath = join(tmpDir, "vars.input.json");
    const input = JSON.stringify({
      cloudflare: { workerName: "prod-worker" },
      s3: { bucket: "prod-bucket" },
    });

    await createVarsInputJson(input, outPath);

    const written = await Bun.file(outPath).json();
    expect(written.cloudflare.workerName).toBe("prod-worker-staging");
    expect(written.s3.bucket).toBe("prod-bucket-staging");
    expect(spy).toHaveBeenCalledWith(
      `::notice file=${outPath}::File written: ${outPath}`,
    );
  });

  test("throws on empty input", async () => {
    const outPath = join(tmpDir, "vars.input.json");
    await expect(createVarsInputJson("", outPath)).rejects.toThrow(
      "GLH_VARS_JSON is empty",
    );
  });
});

describe("validateWranglerJson", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "staging-validate-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  test("passes when names match and end with -staging", async () => {
    const varsPath = join(tmpDir, "vars.json");
    const wranglerPath = join(tmpDir, "wrangler.jsonc");
    await Bun.write(
      varsPath,
      JSON.stringify({ cloudflare: { workerName: "app-staging" } }),
    );
    await Bun.write(wranglerPath, JSON.stringify({ name: "app-staging" }));

    await expect(
      validateWranglerJson(varsPath, wranglerPath),
    ).resolves.toBeUndefined();
  });

  test("throws on name mismatch", async () => {
    const varsPath = join(tmpDir, "vars.json");
    const wranglerPath = join(tmpDir, "wrangler.jsonc");
    await Bun.write(
      varsPath,
      JSON.stringify({ cloudflare: { workerName: "app-staging" } }),
    );
    await Bun.write(wranglerPath, JSON.stringify({ name: "other-staging" }));

    await expect(
      validateWranglerJson(varsPath, wranglerPath),
    ).rejects.toThrow("workerName mismatch");
  });

  test("throws on missing -staging suffix", async () => {
    const varsPath = join(tmpDir, "vars.json");
    const wranglerPath = join(tmpDir, "wrangler.jsonc");
    await Bun.write(
      varsPath,
      JSON.stringify({ cloudflare: { workerName: "app-prod" } }),
    );
    await Bun.write(wranglerPath, JSON.stringify({ name: "app-prod" }));

    await expect(
      validateWranglerJson(varsPath, wranglerPath),
    ).rejects.toThrow("missing -staging suffix");
  });

  test("throws both errors when mismatch and no suffix", async () => {
    const varsPath = join(tmpDir, "vars.json");
    const wranglerPath = join(tmpDir, "wrangler.jsonc");
    await Bun.write(
      varsPath,
      JSON.stringify({ cloudflare: { workerName: "app-prod" } }),
    );
    await Bun.write(wranglerPath, JSON.stringify({ name: "other-prod" }));

    await expect(
      validateWranglerJson(varsPath, wranglerPath),
    ).rejects.toThrow(/mismatch.*suffix/s);
  });
});

describe("main", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "staging-main-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
    vi.restoreAllMocks();
  });

  test("dispatches create-vars-input-json", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const outPath = join(tmpDir, "vars.input.json");
    const varsJson = JSON.stringify({ cloudflare: { workerName: "w" } });

    await main("create-vars-input-json", {
      varsJson,
      outPath,
      varsPath: "",
      wranglerPath: "",
    });

    const written = await Bun.file(outPath).json();
    expect(written.cloudflare.workerName).toBe("w-staging");
  });

  test("dispatches validate-wrangler-json", async () => {
    const varsPath = join(tmpDir, "vars.json");
    const wranglerPath = join(tmpDir, "wrangler.jsonc");
    await Bun.write(
      varsPath,
      JSON.stringify({ cloudflare: { workerName: "app-staging" } }),
    );
    await Bun.write(wranglerPath, JSON.stringify({ name: "app-staging" }));

    await expect(
      main("validate-wrangler-json", {
        varsJson: "",
        outPath: "",
        varsPath,
        wranglerPath,
      }),
    ).resolves.toBeUndefined();
  });

  test("throws on unknown command", async () => {
    await expect(
      main("bogus", {
        varsJson: "",
        outPath: "",
        varsPath: "",
        wranglerPath: "",
      }),
    ).rejects.toThrow("Usage:");
  });

  test("throws on undefined command", async () => {
    await expect(
      main(undefined, {
        varsJson: "",
        outPath: "",
        varsPath: "",
        wranglerPath: "",
      }),
    ).rejects.toThrow("Usage:");
  });
});

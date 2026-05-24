#!/usr/bin/env bun

import process from "node:process";
export {};

export interface Vars {
  cloudflare?: { workerName?: string };
  s3?: { bucket?: string };
  [key: string]: unknown;
}

export function applyStagingSuffix(vars: Vars): Vars {
  return {
    ...vars,
    cloudflare: {
      ...vars.cloudflare,
      workerName:
        (vars.cloudflare?.workerName ?? "lfs-server") + "-staging",
    },
    s3: {
      ...vars.s3,
      bucket: (vars.s3?.bucket ?? "lfs-objects") + "-staging",
    },
  };
}

export async function createVarsInputJson(varsJson: string, outPath: string) {
  if (!varsJson) {
    throw new Error(
      "GLH_VARS_JSON is empty; set vars|secrets.GLH_VARS_JSON in caller.",
    );
  }
  const vars: Vars = JSON.parse(varsJson);
  const staging = applyStagingSuffix(vars);
  await Bun.write(outPath, JSON.stringify(staging, null, 2) + "\n");
  console.log(`::notice file=${outPath}::File written: ${outPath}`);
}

export async function validateWranglerJson(
  varsPath: string,
  wranglerPath: string,
) {
  const vars: Vars = await Bun.file(varsPath).json();
  const wrangler = Bun.JSONC.parse(await Bun.file(wranglerPath).text()) as Record<string, unknown>;
  const varName: string = vars.cloudflare?.workerName ?? "";
  const wranglerName = String(wrangler.name ?? "");

  const errors: string[] = [];
  if (varName !== wranglerName) {
    errors.push(
      `workerName mismatch: ${varsPath}='${varName}' ${wranglerPath}='${wranglerName}'`,
    );
  }
  if (!varName.endsWith("-staging")) {
    errors.push(`workerName missing -staging suffix: '${varName}'`);
  }
  if (errors.length) {
    throw new Error(errors.join("; "));
  }
}

export async function main(
  cmd: string | undefined,
  args: {
    varsJson: string;
    outPath: string;
    varsPath: string;
    wranglerPath: string;
  },
) {
  if (cmd === "create-vars-input-json") {
    await createVarsInputJson(args.varsJson, args.outPath);
  } else if (cmd === "validate-wrangler-json") {
    await validateWranglerJson(args.varsPath, args.wranglerPath);
  } else {
    throw new Error(
      "Usage: staging.ts <create-vars-input-json|validate-wrangler-json>",
    );
  }
}

/* istanbul ignore next */
if (import.meta.main) {
  await main(process.argv[2], {
    varsJson: process.env.GLH_VARS_JSON ?? "",
    outPath: process.argv[3] ?? "vars.input.json",
    varsPath: process.argv[3] ?? "vars.json",
    wranglerPath: process.argv[4] ?? "wrangler.jsonc",
  });
}

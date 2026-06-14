#!/usr/bin/env bun
// Surface deployed Worker URLs from wrangler's NDJSON output as a top-of-run
// annotation + job-summary list. Reads WRANGLER_OUTPUT_FILE_PATH.
import { appendFileSync, existsSync } from "node:fs";

const outputFile = process.env.WRANGLER_OUTPUT_FILE_PATH;
if (!outputFile || !existsSync(outputFile)) process.exit(0);

const deploys = parseDeploys(await Bun.file(outputFile).text());
if (deploys.length === 0) process.exit(0);

summary("### 🚀 Deployed");
for (const { name, url } of deploys) {
  console.log(`::notice title=Deployed ${name}::${url}`);
  summary(`- **${name}** → ${url}`);
}

function parseDeploys(ndjson: string) {
  return ndjson
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WranglerOutputEntry)
    .filter((entry): entry is WranglerDeployEntry => entry.type === "deploy")
    .flatMap((entry) =>
      (entry.targets ?? [])
        .filter((target) => target.startsWith("https://"))
        .map((url) => ({ name: entry.worker_name as string, url })),
    );
}

type WranglerOutputEntry = { type: string; worker_name?: string; targets?: string[] };
type WranglerDeployEntry = WranglerOutputEntry & { type: "deploy" };

function summary(line: string) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, line + "\n");
}

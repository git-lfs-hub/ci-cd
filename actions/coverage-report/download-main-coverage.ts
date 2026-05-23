#!/usr/bin/env bun

import process from "node:process";
import { mkdir } from "node:fs/promises";
export {};

const FILES = ["coverage-summary.json", "coverage-final.json"];

export async function download(baseUrl: string, destDir: string) {
  await mkdir(destDir, { recursive: true });

  const results: string[] = [];
  for (const f of FILES) {
    const url = `${baseUrl}/${f}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
    const dest = `${destDir}/${f}`;
    await Bun.write(dest, await resp.arrayBuffer());
    console.log(`::notice file=${dest}::File written: ${dest}`);
    results.push(dest);
  }
  return results;
}

export function summaryOutputLine(summaryPath: string) {
  return `main-json-summary=${summaryPath}`;
}

export async function main(baseUrl: string, outputPath: string) {
  const results = await download(baseUrl, "coverage/main");
  const summaryPath = results.find((p) => p.endsWith("coverage-summary.json"))!;
  await Bun.write(outputPath, summaryOutputLine(summaryPath) + "\n");
}

/* istanbul ignore next */
if (import.meta.main) {
  const baseUrl = process.argv[2];
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!baseUrl || !outputPath) {
    console.error("Usage: download-main-coverage.ts <base-url>");
    process.exit(1);
  }
  await main(baseUrl, outputPath);
}

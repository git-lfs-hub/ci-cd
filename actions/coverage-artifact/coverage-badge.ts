#!/usr/bin/env bun

import process from "node:process";
import { type Thresholds, resolveThresholds } from "../coverage-defaults";

export function sortedThresholds(raw: Thresholds) {
  return Object.entries(raw)
    .map(([min, color]) => ({ min: Number(min), color: color as string }))
    .sort((a, b) => b.min - a.min);
}

export function resolveColor(pct: number, thresholds: { min: number; color: string }[]) {
  return thresholds.find((t) => pct >= t.min)?.color ?? "grey";
}

export function makeBadge(pct: number, color: string) {
  return { subject: "Coverage", status: `${pct}%`, color };
}

export async function main(thresholdsJson: string) {
  const summary = await Bun.file("coverage/coverage-summary.json").json();
  const pct = summary.total.statements.pct as number;

  const thresholds = sortedThresholds(resolveThresholds(thresholdsJson));
  const color = resolveColor(pct, thresholds);
  await Bun.write("coverage/coverage-badge.json", JSON.stringify(makeBadge(pct, color)));
  console.log(
    "::notice file=coverage/coverage-badge.json::File written: coverage/coverage-badge.json",
  );
}

/* istanbul ignore next */
if (import.meta.main) {
  await main(process.argv[2] ?? "");
}

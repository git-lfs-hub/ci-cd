#!/usr/bin/env bun

import process from "node:process";
export {}; // shuts up the `await` .ts errors

export function parseThresholds(raw: Record<string, string>) {
  return Object.entries(raw)
    .map(([min, color]) => ({ min: Number(min), color: color as string }))
    .sort((a, b) => b.min - a.min);
}

export function resolveColor(
  pct: number,
  thresholds: { min: number; color: string }[],
) {
  return thresholds.find((t) => pct >= t.min)?.color ?? "grey";
}

export function makeBadge(pct: number, color: string) {
  return { subject: "Coverage", status: `${pct}%`, color };
}

export async function main(thresholdsJson: string) {
  const summary = await Bun.file("coverage/coverage-summary.json").json();
  const pct = summary.total.statements.pct as number;

  const raw: Record<string, string> = JSON.parse(thresholdsJson);
  const thresholds = parseThresholds(raw);
  const color = resolveColor(pct, thresholds);
  await Bun.write("coverage/badge.json", JSON.stringify(makeBadge(pct, color)));
}

// istanbul ignore next
if (import.meta.main) {
  await main(process.argv[2] ?? "");
}

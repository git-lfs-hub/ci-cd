#!/usr/bin/env bun

import process from "node:process";
export {}; // shuts up the `await` .ts errors

const summary = await Bun.file("coverage/coverage-summary.json").json();
const pct = summary.total.statements.pct as number;

const raw: Record<string, string> = JSON.parse(process.argv[2] ?? "");
const thresholds = Object.entries(raw)
  .map(([min, color]) => ({ min: Number(min), color: color as string }))
  .sort((a, b) => b.min - a.min);

const color = thresholds.find((t) => pct >= t.min)?.color ?? "grey";
await Bun.write(
  "coverage/badge.json",
  JSON.stringify({ subject: "Coverage", status: `${pct}%`, color }),
);

#!/usr/bin/env bun

export {}; // shuts up the `await` .ts errors

const summary = await Bun.file("coverage/coverage-summary.json").json();

const pct = summary.total.statements.pct as number;
const color =
  pct >= 80 ? "green" : pct >= 60 ? "yellow" : pct >= 40 ? "orange" : "red";

await Bun.write(
  "coverage/badge.json",
  JSON.stringify({ subject: "Coverage", status: `${pct}%`, color }),
);

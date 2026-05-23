#!/usr/bin/env bun

import process from "node:process";
export {};

const COLOR_ICON: Record<string, string> = {
  green: "🟢",
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
  grey: "⬜",
};

const thresholds: Record<string, string> = JSON.parse(process.argv[2] ?? "");
const icons = Object.entries(thresholds)
  .map(([pct, color]) => `${pct}: '${COLOR_ICON[color] ?? "⬜"}'`)
  .join(", ");

const output = `threshold-icons={${icons}}`;
await Bun.file(process.env.GITHUB_OUTPUT!)
  .writer()
  .write(output + "\n");

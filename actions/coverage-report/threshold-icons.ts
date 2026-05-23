#!/usr/bin/env bun

import process from "node:process";
export {};

export const COLOR_ICON: Record<string, string> = {
  "100": "🏅", // medal "🟩", // green square
  green: "🟢", // green circle
  yellow: "🟡", // yellow circle
  orange: "🟠", // orange circle
  red: "🔴", // red circle
  grey: "⬜", // gray circle
};

export function buildThresholdIcons(thresholds: Record<string, string>) {
  if (!("100" in thresholds)) thresholds["100"] = "100";
  return Object.entries(thresholds)
    .map(([pct, color]) => `${pct}: '${COLOR_ICON[color] ?? "⬜"}'`)
    .join(", ");
}

export function formatOutput(icons: string) {
  return `threshold-icons={${icons}}`;
}

if (import.meta.main) {
  const thresholds: Record<string, string> = JSON.parse(process.argv[2] ?? "");
  const icons = buildThresholdIcons(thresholds);
  const output = formatOutput(icons);
  await Bun.file(process.env.GITHUB_OUTPUT!)
    .writer()
    .write(output + "\n");
}

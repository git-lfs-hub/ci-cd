#!/usr/bin/env bun

import process from "node:process";
import { type Thresholds, resolveThresholds } from "../coverage-defaults";

export const COLOR_ICON: Record<string, string> = {
  "100": "🏅", // medal "🟩", // green square
  green: "🟢", // green circle
  yellow: "🟡", // yellow circle
  orange: "🟠", // orange circle
  red: "🔴", // red circle
  grey: "⬜", // gray circle
};

export function thresholdIcons(thresholds: Thresholds) {
  if (!(100 in thresholds)) thresholds[100] = "100";
  return Object.entries(thresholds)
    .map(([pct, color]) => `${pct}: '${COLOR_ICON[color] ?? "⬜"}'`)
    .join(", ");
}

export function formatOutput(icons: string) {
  return `threshold-icons={${icons}}`;
}

export async function main(thresholdsJson: string, outputPath: string) {
  const icons = thresholdIcons(resolveThresholds(thresholdsJson));
  const output = formatOutput(icons);
  await Bun.write(outputPath, output + "\n");
}

/* istanbul ignore next */
if (import.meta.main) {
  await main(process.argv[2] ?? "", process.env.GITHUB_OUTPUT!);
}

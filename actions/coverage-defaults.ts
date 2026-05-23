export type Thresholds = Record<number, string>;

export const DEFAULT_THRESHOLDS: Thresholds = {
  95: "green",
  90: "yellow",
  80: "orange",
  1: "red",
  0: "grey",
};

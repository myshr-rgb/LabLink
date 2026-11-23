import { FACTOR_KEYS, type Factors } from "./types";
/** Validate all policy weights before they enter the engine. */
export function validWeights(weights: Factors): boolean {
  return (
    FACTOR_KEYS.every(
      (key) =>
        Number.isFinite(weights[key]) && weights[key] >= 0 && weights[key] <= 1,
    ) &&
    Math.abs(FACTOR_KEYS.reduce((sum, key) => sum + weights[key], 0) - 1) <=
      0.001 + Number.EPSILON
  );
}
/** Calculate the ranking score rounded to three decimal places. */
export function score(values: Factors, weights: Factors): number {
  return (
    Math.round(
      1000 *
        FACTOR_KEYS.reduce((sum, key) => sum + values[key] * weights[key], 0),
    ) / 1000
  );
}

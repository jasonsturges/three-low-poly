import { createRandom, type RandomSource } from "./Random";

/** Unseeded default — unique each runtime. Pass a {@link RandomSource} to override. */
const defaultSource = createRandom();

/**
 * Generates a random number between `min` and `max`.
 */
export function randomFloat(min = 0, max = 1, source: RandomSource = defaultSource) {
  return source.float(min, max);
}

/**
 * Generates a random integer between `min` and `max`.
 */
export function randomInteger(min = 0, max = 1, source: RandomSource = defaultSource) {
  return source.int(min, max);
}

/**
 * Generates a random number skewed towards the maximum value.
 *
 * @param {number} [exponent=0.5] - Controls the skew of the distribution.
 *                                  A smaller value (e.g., 0.3) skews the values towards the max.
 *                                  A larger value (e.g., 0.8) creates a more even distribution.
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards `max`.
 */
export function logarithmicRandomMax(
  exponent = 0.5,
  min = 0,
  max = 1,
  source: RandomSource = defaultSource,
) {
  return source.skewMax(exponent, min, max);
}

/**
 * Generates a random number skewed towards the minimum value.
 *
 * @param {number} [exponent=0.5] - Controls the skew of the distribution.
 *                                  A smaller value (e.g., 0.3) skews the values towards the min.
 *                                  A larger value (e.g., 0.8) creates a more even distribution.
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards `min`.
 */
export function logarithmicRandomMin(
  exponent = 0.5,
  min = 0,
  max = 1,
  source: RandomSource = defaultSource,
) {
  return source.skewMin(exponent, min, max);
}

/**
 * Generates a random number with an inverse logarithmic distribution, biased towards the maximum value.
 *
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards the maximum.
 */

function inverseLogarithmicRandomMax(min = 0, max = 1, source: RandomSource = defaultSource) {
  const randomValue = 1 - Math.log(1 - source.next()) / Math.log(2);
  return min + (max - min) * randomValue;
}

/**
 * Generates a random number with an inverse logarithmic distribution, biased towards the minimum value.
 *
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards the minimum.
 */
function inverseLogarithmicRandomMin(min = 0, max = 1, source: RandomSource = defaultSource) {
  const randomValue = Math.log(1 - source.next()) / Math.log(2);
  const adjustedValue = -randomValue;
  const clampedValue = Math.min(Math.max(adjustedValue, 0), 1);
  return min + (max - min) * clampedValue;
}
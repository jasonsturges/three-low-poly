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
 * Random number in `[min, max]` skewed toward `max`. See {@link RandomSource.skewMax}.
 *
 * `exponent` is the bias strength — **higher skews harder** toward `max`; `1` is uniform, `< 1` reverses.
 * Defaults to `2`.
 */
export function randomSkewMax(exponent = 2, min = 0, max = 1, source: RandomSource = defaultSource) {
  return source.skewMax(exponent, min, max);
}

/**
 * Random number in `[min, max]` skewed toward `min`. See {@link RandomSource.skewMin}.
 *
 * `exponent` is the bias strength — **higher skews harder** toward `min`; `1` is uniform, `< 1` reverses.
 * Defaults to `2`.
 */
export function randomSkewMin(exponent = 2, min = 0, max = 1, source: RandomSource = defaultSource) {
  return source.skewMin(exponent, min, max);
}

/**
 * Random number in `[min, max]` skewed toward the CENTER. See {@link RandomSource.skewCenter}.
 *
 * `exponent` is the bias strength — **higher clusters tighter** to the middle; `1` is uniform, `< 1`
 * reverses (toward the edges). Defaults to `2`.
 */
export function randomSkewCenter(exponent = 2, min = 0, max = 1, source: RandomSource = defaultSource) {
  return source.skewCenter(exponent, min, max);
}

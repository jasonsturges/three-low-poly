/**
 * Generates a random number between `min` and `max`.
 */
export function randomFloat(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer between `min` and `max`.
 */
export function randomInteger(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
export function logarithmicRandomMax(exponent = 0.5, min = 0, max = 1) {
  return min + (max - min) * Math.pow(Math.random(), exponent);
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
export function logarithmicRandomMin(exponent = 0.5, min = 0, max = 1) {
  return min + (max - min) * Math.pow(1 - Math.random(), exponent);
}

/**
 * Generates a random number with an inverse logarithmic distribution, biased towards the maximum value.
 *
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards the maximum.
 */

function inverseLogarithmicRandomMax(min = 0, max = 1) {
  // Generate the inverse-logarithmic skewed value between 0 and 1
  const randomValue = 1 - Math.log(1 - Math.random()) / Math.log(2);

  // Scale it to the desired range [min, max]
  return min + (max - min) * randomValue;
}

/**
 * Generates a random number with an inverse logarithmic distribution, biased towards the minimum value.
 *
 * @param {number} [min=0] - Minimum value of the range.
 * @param {number} [max=1] - Maximum value of the range.
 * @returns {number} A random number between `min` and `max`, skewed towards the minimum.
 */
function inverseLogarithmicRandomMin(min = 0, max = 1) {
  // Generate the inverse-logarithmic skewed value between 0 and 1, but reverse it to bias towards the minimum
  const randomValue = Math.log(1 - Math.random()) / Math.log(2);
  const adjustedValue = -randomValue;

  // Clamp the adjusted value between 0 and 1 to prevent out-of-range values
  const clampedValue = Math.min(Math.max(adjustedValue, 0), 1);

  // Scale it to the desired range [min, max]
  return min + (max - min) * clampedValue;
}

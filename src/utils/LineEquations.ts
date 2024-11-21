/**
 * Calculate the x-coordinate for a given y-coordinate using the slope-intercept equation of a line.
 * x = x1 + (y - y1) / m
 *
 * Example usage
 * ```
 * const x1 = 0.8, y1 = 0, x2 = 1, y2 = 1.5, y = 1.0;
 * const x = calculateXForY(x1, y1, x2, y2, y);
 * console.log(`The x-position for y=${y} is x=${x.toFixed(4)}`);
 * ```
 */
export function calculateXFromSlopeIntercept(x1: number, y1: number, x2: number, y2: number, y: number): number {
  const m = (y2 - y1) / (x2 - x1); // slope
  return x1 + (y - y1) / m;
}

/**
 * Calculate the y-coordinate for a given x-coordinate using the slope-intercept equation of a line.
 * y = y1 + m * (x - x1)
 *
 * Example usage
 * ```
 * const x1 = 0.8, y1 = 0, x2 = 1, y2 = 1.5, x = 0.9333;
 * const y = calculateYForX(x1, y1, x2, y2, x);
 * console.log(`The y-position for x=${x} is y=${y.toFixed(4)}`);
 * ```
 */
export function calculateYFromSlopeIntercept(x1: number, y1: number, x2: number, y2: number, x: number): number {
  const m = (y2 - y1) / (x2 - x1); // slope
  return y1 + m * (x - x1);
}

export const LineEquations = {
  calculateXFromSlopeIntercept,
  calculateYFromSlopeIntercept,
};

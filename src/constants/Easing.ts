/**
 * Easing function type for interpolating values over time.
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
export type EasingFunction = (t: number) => number;

/**
 * Easing functions for interpolating values over time.
 *
 * Use these functions to create smooth animations and transitions.
 * All easing functions take a value t between 0 and 1 and return an eased value between 0 and 1.
 *
 * @example
 * ```typescript
 * import { Easing } from 'three-low-poly';
 *
 * // Using with transitions (namespace)
 * cameraTransition.transitionTo(camera, {
 *   duration: 1000,
 *   easing: Easing.cubicInOut  // Function reference
 * });
 *
 * // Or using string reference
 * cameraTransition.transitionTo(camera, {
 *   duration: 1000,
 *   easing: 'cubicInOut'  // String reference
 * });
 *
 * // Using the function directly in custom animation
 * const progress = 0.5;
 * const easedValue = Easing.cubicInOut(progress);
 *
 * // Custom animation loop
 * const startValue = 0;
 * const endValue = 100;
 * const t = elapsedTime / duration;
 * const easedT = Easing.sineInOut(t);
 * const currentValue = startValue + (endValue - startValue) * easedT;
 * ```
 */
export const Easing = {
  // Sine
  sineIn: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t: number) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t: number) => -0.5 * (Math.cos(Math.PI * t) - 1),

  // Quadratic
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => 1 - Math.pow(1 - t, 2),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  // Cubic
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  // Quartic
  quartIn: (t: number) => t * t * t * t,
  quartOut: (t: number) => 1 - Math.pow(1 - t, 4),
  quartInOut: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),

  // Quintic
  quintIn: (t: number) => t * t * t * t * t,
  quintOut: (t: number) => 1 - Math.pow(1 - t, 5),
  quintInOut: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),

  // Exponential
  expoIn: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circular
  circIn: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  circOut: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  circInOut: (t: number) => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  // Special
  linear: (t: number) => t,
  smoothstep: (t: number) => t * t * (3 - 2 * t),
  concave: (t: number) => 1 - Math.pow(1 - t, 0.3),
  convex: (t: number) => Math.pow(t, 0.3),
  logarithmic: (t: number) => Math.log(Math.max(0.01, t)) / Math.log(2),
  squareRoot: (t: number) => Math.sqrt(t),
  inverse: (t: number) => 1 - t,
  gaussian: (t: number) => {
    const sigma = 0.5;
    return Math.exp(-Math.pow(t - 0.5, 2) / (2 * sigma));
  },
};

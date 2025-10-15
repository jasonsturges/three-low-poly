/**
 * Easing function type for interpolating values over time.
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
export type EasingFunction = (t: number) => number;

// Sine easing
export const sineIn = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
export const sineOut = (t: number) => Math.sin((t * Math.PI) / 2);
export const sineInOut = (t: number) => -0.5 * (Math.cos(Math.PI * t) - 1);

// Quadratic easing
export const quadIn = (t: number) => t * t;
export const quadOut = (t: number) => 1 - Math.pow(1 - t, 2);
export const quadInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Cubic easing
export const cubicIn = (t: number) => t * t * t;
export const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const cubicInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Quartic easing
export const quartIn = (t: number) => t * t * t * t;
export const quartOut = (t: number) => 1 - Math.pow(1 - t, 4);
export const quartInOut = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

// Quintic easing
export const quintIn = (t: number) => t * t * t * t * t;
export const quintOut = (t: number) => 1 - Math.pow(1 - t, 5);
export const quintInOut = (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);

// Exponential easing
export const expoIn = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const expoInOut = (t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Circular easing
export const circIn = (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const circOut = (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const circInOut = (t: number) =>
  t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Special easing functions
export const linear = (t: number) => t;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const concave = (t: number) => 1 - Math.pow(1 - t, 0.3);
export const convex = (t: number) => Math.pow(t, 0.3);
export const logarithmic = (t: number) => Math.log(Math.max(0.01, t)) / Math.log(2);
export const squareRoot = (t: number) => Math.sqrt(t);
export const inverse = (t: number) => 1 - t;
export const gaussian = (t: number) => {
  const sigma = 0.5;
  return Math.exp(-Math.pow(t - 0.5, 2) / (2 * sigma));
};

/**
 * Easing functions for interpolating values over time.
 *
 * Use these functions to create smooth animations and transitions.
 * All easing functions take a value t between 0 and 1 and return an eased value between 0 and 1.
 *
 * @example
 * ```typescript
 * import { Easing, cubicInOut } from 'three-low-poly';
 *
 * // Using with transitions (namespace)
 * cameraTransition.transitionTo(camera, {
 *   duration: 1000,
 *   easing: Easing.cubicInOut  // Function reference
 * });
 *
 * // Or using direct import
 * cameraTransition.transitionTo(camera, {
 *   duration: 1000,
 *   easing: cubicInOut  // Direct function reference
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
  sineIn,
  sineOut,
  sineInOut,

  // Quadratic
  quadIn,
  quadOut,
  quadInOut,

  // Cubic
  cubicIn,
  cubicOut,
  cubicInOut,

  // Quartic
  quartIn,
  quartOut,
  quartInOut,

  // Quintic
  quintIn,
  quintOut,
  quintInOut,

  // Exponential
  expoIn,
  expoOut,
  expoInOut,

  // Circular
  circIn,
  circOut,
  circInOut,

  // Special
  linear,
  smoothstep,
  concave,
  convex,
  logarithmic,
  squareRoot,
  inverse,
  gaussian,
};

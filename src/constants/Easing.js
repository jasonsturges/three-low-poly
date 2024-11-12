export const sineEaseIn = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const sineEaseOut = (t) => Math.sin((t * Math.PI) / 2);
export const sineEaseInOut = (t) => -0.5 * (Math.cos(Math.PI * t) - 1);

export const quadraticEaseIn = (t) => t * t;
export const quadraticEaseOut = (t) => 1 - Math.pow(1 - t, 2);
export const quadraticEaseInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const cubicEaseIn = (t) => t * t * t;
export const cubicEaseOut = (t) => 1 - Math.pow(1 - t, 3);
export const cubicEaseInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const quarticEaseIn = (t) => t * t * t * t;
export const quarticEaseOut = (t) => 1 - Math.pow(1 - t, 4);
export const quarticEaseInOut = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

export const quinticEaseIn = (t) => t * t * t * t * t;
export const quinticEaseOut = (t) => 1 - Math.pow(1 - t, 5);
export const quinticEaseInOut = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);

export const exponentialEaseIn = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const exponentialEaseOut = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const exponentialEaseInOut = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

export const circularEaseIn = (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const circularEaseOut = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const circularEaseInOut = (t) =>
  t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

export const linear = (t) => t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const concave = (t) => 1 - Math.pow(1 - t, 0.3);
export const convex = (t) => Math.pow(t, 0.3);
export const logarithmic = (t) => Math.log(Math.max(0.01, t)) / Math.log(2);
export const squareRoot = (t) => Math.sqrt(t);
export const inverse = (t) => 1 - t;
export const gaussian = (t) => {
  const sigma = 0.5;
  return Math.exp(-Math.pow(t - 0.5, 2) / (2 * sigma));
};

/**
 * Easing functions for interpolating values over time.
 */
export const Easing = {
  SINE_EASE_IN: sineEaseIn,
  SINE_EASE_OUT: sineEaseOut,
  SINE_EASE_IN_OUT: sineEaseInOut,
  QUADRATIC_EASE_IN: quadraticEaseIn,
  QUADRATIC_EASE_OUT: quadraticEaseOut,
  QUADRATIC_EASE_IN_OUT: quadraticEaseInOut,
  CUBIC_EASE_IN: cubicEaseIn,
  CUBIC_EASE_OUT: cubicEaseOut,
  CUBIC_EASE_IN_OUT: cubicEaseInOut,
  QUARTIC_EASE_IN: quarticEaseIn,
  QUARTIC_EASE_OUT: quarticEaseOut,
  QUARTIC_EASE_IN_OUT: quarticEaseInOut,
  QUINTIC_EASE_IN: quinticEaseIn,
  QUINTIC_EASE_OUT: quinticEaseOut,
  QUINTIC_EASE_IN_OUT: quinticEaseInOut,
  EXPONENTIAL_EASE_IN: exponentialEaseIn,
  EXPONENTIAL_EASE_OUT: exponentialEaseOut,
  EXPONENTIAL_EASE_IN_OUT: exponentialEaseInOut,
  CIRCULAR_EASE_IN: circularEaseIn,
  CIRCULAR_EASE_OUT: circularEaseOut,
  CIRCULAR_EASE_IN_OUT: circularEaseInOut,
  LINEAR: linear,
  SMOOTHSTEP: smoothstep,
  CONCAVE: concave,
  CONVEX: convex,
  LOGARITHMIC: logarithmic,
  SQUARE_ROOT: squareRoot,
  INVERSE: inverse,
  GAUSSIAN: gaussian,
};

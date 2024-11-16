export const cubicCurve = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
  const clampedT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampedT;
  return (
    oneMinusT * oneMinusT * oneMinusT * p0 +
    3 * oneMinusT * oneMinusT * clampedT * p1 +
    3 * oneMinusT * clampedT * clampedT * p2 +
    clampedT * clampedT * clampedT * p3
  );
};

export const dampedCurve = (t: number, damping: number = 1): number => {
  const clampedDamping = Math.max(0.001, damping); // Avoid zero or negative damping
  return (1 - Math.exp(-clampedDamping * t)) / (1 - Math.exp(-clampedDamping));
};

export const exponentialCurve = (t: number, base: number = 1, factor: number = 1): number => {
  const clampedT = Math.max(0, Math.min(1, t));
  return base * Math.pow(clampedT, factor);
};

export const logarithmicCurve = (t: number, base: number = 1, factor: number = 1): number => {
  const clampedT = Math.max(0.001, Math.min(1, t)); // Avoid log(0)
  return base * Math.log(factor * clampedT + 1);
};

export const parabolicCurve = (t: number, a: number = 1, b: number = 0, c: number = 0): number => {
  const clampedT = Math.max(0, Math.min(1, t));
  return a * clampedT * clampedT + b * clampedT + c;
};

export const quadraticCurve = (t: number, p0: number, p1: number, p2: number): number => {
  const clampedT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampedT;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * clampedT * p1 + clampedT * clampedT * p2;
};

export const sigmoidCurve = (t: number, a: number = 10): number => {
  const clampedT = Math.max(0, Math.min(1, t));
  return 1 / (1 + Math.exp(-a * (clampedT - 0.5)));
};

const sinusoidalCurve = (t: number): number => {
  return Math.sin(t * Math.PI * 0.5);
};

export const ParametricCurve = {
  CUBIC: cubicCurve,
  DAMPED: dampedCurve,
  EXPONENTIAL: exponentialCurve,
  LOGARITHMIC: logarithmicCurve,
  PARABOLIC: parabolicCurve,
  QUADRATIC: quadraticCurve,
  SIGMOID: sigmoidCurve,
  SINUSOIDAL: sinusoidalCurve,
};

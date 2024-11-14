export const cubicCurve = (t, p0, p1, p2, p3) => {
  const clampedT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampedT;
  return (
    oneMinusT * oneMinusT * oneMinusT * p0 +
    3 * oneMinusT * oneMinusT * clampedT * p1 +
    3 * oneMinusT * clampedT * clampedT * p2 +
    clampedT * clampedT * clampedT * p3
  );
};

export const dampedCurve = (t, damping = 1) => {
  const clampedDamping = Math.max(0.001, damping); // Avoid zero or negative damping
  return (1 - Math.exp(-clampedDamping * t)) / (1 - Math.exp(-clampedDamping));
};

export const exponentialCurve = (t, base = 1, factor = 1) => {
  const clampedT = Math.max(0, Math.min(1, t));
  return base * Math.pow(clampedT, factor);
};

export const logarithmicCurve = (t, base = 1, factor = 1) => {
  const clampedT = Math.max(0.001, Math.min(1, t)); // Avoid log(0)
  return base * Math.log(factor * clampedT + 1);
};

export const parabolicCurve = (t, a = 1, b = 0, c = 0) => {
  const clampedT = Math.max(0, Math.min(1, t));
  return a * clampedT * clampedT + b * clampedT + c;
};

export const quadraticCurve = (t, p0, p1, p2) => {
  const clampedT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampedT;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * clampedT * p1 + clampedT * clampedT * p2;
};

export const sigmoidCurve = (t, a = 10) => {
  const clampedT = Math.max(0, Math.min(1, t));
  return 1 / (1 + Math.exp(-a * (clampedT - 0.5)));
};

const sinusoidalCurve = (t) => {
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

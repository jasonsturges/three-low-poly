export const ParametricCurve = {
  cubic: (t: number, p0: number, p1: number, p2: number, p3: number): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    const oneMinusT = 1 - clampedT;
    return (
      oneMinusT * oneMinusT * oneMinusT * p0 +
      3 * oneMinusT * oneMinusT * clampedT * p1 +
      3 * oneMinusT * clampedT * clampedT * p2 +
      clampedT * clampedT * clampedT * p3
    );
  },
  damped: (t: number, damping: number = 1): number => {
    const clampedDamping = Math.max(0.001, damping); // Avoid zero or negative damping
    return (1 - Math.exp(-clampedDamping * t)) / (1 - Math.exp(-clampedDamping));
  },
  exponential: (t: number, base: number = 1, factor: number = 1): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    return base * Math.pow(clampedT, factor);
  },
  logarithmic: (t: number, base: number = 1, factor: number = 1): number => {
    const clampedT = Math.max(0.001, Math.min(1, t)); // Avoid log(0)
    return base * Math.log(factor * clampedT + 1);
  },
  parabolic: (t: number, a: number = 1, b: number = 0, c: number = 0): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    return a * clampedT * clampedT + b * clampedT + c;
  },
  quadratic: (t: number, p0: number, p1: number, p2: number): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    const oneMinusT = 1 - clampedT;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * clampedT * p1 + clampedT * clampedT * p2;
  },
  sigmoid: (t: number, a: number = 10): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    return 1 / (1 + Math.exp(-a * (clampedT - 0.5)));
  },
  sinusoidal: (t: number): number => {
    return Math.sin(t * Math.PI * 0.5);
  },
};

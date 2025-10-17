export type FalloffFunction = (distance: number, radius: number) => number;

export const Falloff = {
  linear: (distance: number, radius: number): number => 1 - distance / radius,
  quadratic: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 2),
  squareRoot: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 0.5),
  logarithmic: (distance: number, radius: number): number => Math.log(1 + (radius - distance)) / Math.log(1 + radius),
  sine: (distance: number, radius: number): number => Math.cos(((distance / radius) * Math.PI) / 2),
  exponential: (distance: number, radius: number): number => Math.exp(-distance / radius),
  cubic: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 3),
  gaussian: (distance: number, radius: number): number => Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(radius / 3, 2))),
  inverse: (distance: number, radius: number): number => radius / (radius + distance),
  smoothstep: (distance: number, radius: number): number => {
    const t = Math.max(0, Math.min(1, 1 - distance / radius));
    return t * t * (3 - 2 * t);
  },
};

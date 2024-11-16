export const Falloff = {
  LINEAR: (distance: number, radius: number): number => 1 - distance / radius,
  QUADRATIC: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 2),
  SQUARE_ROOT: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 0.5),
  LOGARITHMIC: (distance: number, radius: number): number => Math.log(1 + (radius - distance)) / Math.log(1 + radius),
  SINE: (distance: number, radius: number): number => Math.cos(((distance / radius) * Math.PI) / 2),
  EXPONENTIAL: (distance: number, radius: number): number => Math.exp(-distance / radius),
  CUBIC: (distance: number, radius: number): number => Math.pow(1 - distance / radius, 3),
  GAUSSIAN: (distance: number, radius: number): number => Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(radius / 3, 2))),
  INVERSE: (distance: number, radius: number): number => radius / (radius + distance),
  SMOOTHSTEP: (distance: number, radius: number): number => {
    const t = Math.max(0, Math.min(1, 1 - distance / radius));
    return t * t * (3 - 2 * t);
  },
};

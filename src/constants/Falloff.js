export const Falloff = {
  LINEAR: (distance, radius) => 1 - distance / radius,
  QUADRATIC: (distance, radius) => Math.pow(1 - distance / radius, 2),
  SQUARE_ROOT: (distance, radius) => Math.pow(1 - distance / radius, 0.5),
  LOGARITHMIC: (distance, radius) => Math.log(1 + (radius - distance)) / Math.log(1 + radius),
  SINE: (distance, radius) => Math.cos(((distance / radius) * Math.PI) / 2),
  EXPONENTIAL: (distance, radius) => Math.exp(-distance / radius),
  CUBIC: (distance, radius) => Math.pow(1 - distance / radius, 3),
  GAUSSIAN: (distance, radius) => Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(radius / 3, 2))),
  INVERSE: (distance, radius) => radius / (radius + distance),
  SMOOTHSTEP: (distance, radius) => {
    const t = Math.max(0, Math.min(1, 1 - distance / radius));
    return t * t * (3 - 2 * t);
  },
};

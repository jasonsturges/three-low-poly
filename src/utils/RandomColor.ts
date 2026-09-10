import { Color, type ColorRepresentation } from "three";
import type { RandomSource } from "./Random";

/** Per-item input, owned by the caller. Index identifies a logical item, not a vertex. */
export interface ColorSampleContext {
  readonly index: number;
  readonly random: RandomSource;
}

/**
 * Fully writes a reusable color in Three's working color space. Do not retain or
 * mutate the context, retain the target, or depend on its previous contents.
 * Randomness comes only from the supplied source; fixed draw counts are not promised.
 */
export type ColorSampler = (target: Color, context: ColorSampleContext) => void;

/** An explicit gradient position in [0, 1]. Stops must strictly increase from 0 to 1. */
export interface ColorGradientStop {
  readonly at: number;
  readonly color: ColorRepresentation;
}

function prepareWeights(count: number, weights?: readonly number[]): number[] | undefined {
  if (count === 0) throw new Error("RandomColor requires a non-empty selection");
  if (weights === undefined) return undefined;
  if (weights.length !== count) throw new Error("RandomColor needs one weight per entry");
  let max = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight)) throw new Error("RandomColor weights must be finite");
    max = Math.max(max, weight);
  }
  // Relative scaling prevents overflow when several individually finite weights are huge.
  return weights.map((weight) => (max > 0 ? Math.max(0, weight) / max : 0));
}

function constant(color: ColorRepresentation): ColorSampler {
  const value = new Color(color);
  return (target) => {
    target.copy(value);
  };
}

function pick(colors: readonly ColorRepresentation[], weights?: readonly number[]): ColorSampler {
  const probabilities = prepareWeights(colors.length, weights);
  const palette = colors.map((color) => new Color(color));
  return (target, { random }) => {
    target.copy(probabilities ? random.weighted(palette, probabilities) : random.pick(palette));
  };
}

function between(start: ColorRepresentation, end: ColorRepresentation): ColorSampler {
  const a = new Color(start);
  const b = new Color(end);
  return (target, { random }) => {
    target.copy(a).lerp(b, random.next());
  };
}

function gradient(stops: readonly ColorGradientStop[]): ColorSampler {
  if (stops.length < 2 || stops[0].at !== 0 || stops[stops.length - 1].at !== 1) {
    throw new Error("RandomColor.gradient requires at least two stops spanning 0 to 1");
  }
  for (let i = 0; i < stops.length; i++) {
    const at = stops[i].at;
    if (!Number.isFinite(at) || at < 0 || at > 1 || (i > 0 && at <= stops[i - 1].at)) {
      throw new Error("RandomColor.gradient positions must be finite and strictly increasing in [0, 1]");
    }
  }
  const points = stops.map((stop) => ({ at: stop.at, color: new Color(stop.color) }));
  return (target, { random }) => {
    const t = random.next();
    // Find the segment ending at or after t without allocating per sample.
    let low = 1;
    let high = points.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (t > points[middle].at) low = middle + 1;
      else high = middle;
    }
    const a = points[low - 1];
    const b = points[low];
    target.copy(a.color).lerp(b.color, (t - a.at) / (b.at - a.at));
  };
}

function mix(samplers: readonly ColorSampler[], weights?: readonly number[]): ColorSampler {
  const probabilities = prepareWeights(samplers.length, weights);
  const choices = [...samplers];
  return (target, context) => {
    const sample = probabilities ? context.random.weighted(choices, probabilities) : context.random.pick(choices);
    sample(target, context);
  };
}

/**
 * Prepare reusable color samplers, then supply a RandomSource when sampling.
 * Colors/arrays/weights are copied at construction (custom function closures remain caller-owned).
 * No global color-management settings or random sources are changed.
 * Hex/string colors use Three's normal conversion; Color inputs are already working-space values.
 * Configure the working color space before constructing samplers. Results can be passed directly
 * to setColorAt or copied to vertex colors. Sampling allocates no Color objects.
 *
 * @example
 * ```ts
 * const sample = RandomColor.between("#493729", "#93714f");
 * const target = new Color();
 * const context = { index: 0, random: createRandom(1337) };
 * sample(target, context);
 * mesh.setColorAt(context.index, target);
 * ```
 */
export const RandomColor = {
  /** One configured color; consumes no randomness. */
  constant,
  /**
   * Exact palette selection. Optional finite weights are relative probabilities;
   * negative weights contribute zero, all-zero weights fall back to uniform selection.
   * Empty selections and mismatched/non-finite weights throw at construction.
   */
  pick,
  /** Component-wise working-RGB interpolation; normally Linear-sRGB, not perceptually uniform. */
  between,
  /**
   * Sample an ordered working-RGB path at a uniform t. Segment probability is proportional
   * to its width. Requires at least two strictly increasing stops, starting at 0 and ending at 1.
   */
  gradient,
  /**
   * Select a sampler, then invoke it with the same context. Does not interpolate between families.
   * Weight validation and fallback are identical to pick. The selected sampler consumes its own draws.
   */
  mix,
} as const;

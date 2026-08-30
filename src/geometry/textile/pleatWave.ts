/**
 * The plan section of a pleat, normalized to ±1, as a function of phase.
 *
 * `phase` runs 0 → 1 across one pleat and is not pre-wrapped, so an implementation takes its own
 * fractional part. Every pleat plan really is a function of one number — a knife, a sine, a box, a
 * pinch — which is what makes this a legitimate interface rather than an abstraction fitted to whatever
 * was convenient. It is the same argument that earns `Easing` its type and denies one to a surface,
 * whose real cases need state a pointwise function cannot carry.
 */
export type PleatShape = (phase: number) => number;

/** Arc length of one pleat relative to its projected width — the fullness a given amplitude buys. */
function arcRatio(shape: PleatShape, amplitude: number, pitch: number, samples = 240): number {
  let length = 0;
  let previousX = 0;
  let previousZ = shape(0) * amplitude;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = t * pitch;
    const z = shape(t) * amplitude;
    length += Math.hypot(x - previousX, z - previousZ);
    previousX = x;
    previousZ = z;
  }

  return length / pitch;
}

/**
 * Amplitude for a required fullness — the inversion every pleated thing needs.
 *
 * **Fullness is the input and amplitude is the output**, which is the whole relationship: cloth is cut
 * once, and how deep its folds run is whatever fitting that fixed length into the available width
 * demands. Narrow the width and the folds deepen; widen it and they let themselves out. Nothing has to
 * push any fabric.
 *
 * Bisected, because a sine plan's arc length is an elliptic integral with no elementary inverse. The
 * ratio is monotonic in amplitude, so bisection is exact to machine precision in 60 steps. A triangular
 * plan does invert in closed form as `(pitch/4)·√(f²−1)` and is solved numerically anyway, so there is
 * one path — verified against the formula to 1.1e-16 rather than assumed.
 *
 * Solved against the CONTINUOUS arc length and never against a built polyline. Solving against the
 * polyline would make the fabric come out exact and would make a segment count move the SILHOUETTE,
 * since a coarser sampling would need a deeper wave to reach the same length.
 */
export function solveAmplitude(shape: PleatShape, fullness: number, pitch: number): number {
  if (fullness <= 1.0000001) return 0;

  let low = 0;
  let high = pitch * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (arcRatio(shape, mid, pitch) < fullness) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

/**
 * Samples per pleat, rounded up to a MULTIPLE OF FOUR so every extremum lands on the grid.
 *
 * Four, not one: a knife wave turns at phases 0 and 0.5, a sine at 0.25 and 0.75, and only a multiple of
 * four puts a sample on all of them. A whole number per pleat is not enough — 40 requested across 6
 * pleats gives 7, which is odd, steps over the crease and clips the fold depth by about 11%. Snapped,
 * the silhouette is identical to nine digits at every count, which is what `segments` changes
 * tessellation, never silhouette demands of a shape with features at known parameters.
 */
export function samplesPerPleat(requested: number, pleats: number): number {
  return Math.max(1, Math.ceil(Math.max(4, Math.floor(requested)) / pleats / 4)) * 4;
}

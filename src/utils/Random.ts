/**
 * Randomness for procedural generation — unseeded by default, reproducible on demand.
 *
 * ---
 *
 * ### Layer 1 — stream primitive (portfolio parity)
 *
 * - {@link mulberry32} — fast seeded PRNG; returns a `() => number` closure yielding
 *   floats in `[0, 1)`. Same algorithm as Gotham/Water on the portfolio site.
 *
 * ### Seed mixing
 *
 * - {@link splitmix32} — mixer only, **not** a stream. Maps one 32-bit value to another.
 * - {@link deriveSubSeed} — `splitmix32(masterSeed ^ salt)`. Fan one user-facing master
 *   seed into independent sub-streams per subsystem. Use stable hex salts per domain
 *   (`0x101` books, `0x202` fog, `0x303` windows, …) instead of `seed + n` offsets.
 *
 * ### Layer 2 — library ergonomics
 *
 * - {@link createRandom} — **no seed** → wraps `Math.random()`, unique every runtime
 *   (showcase default). **With seed** → {@link mulberry32} stream, same seed ⇒ same sequence.
 * - Returns a {@link RandomSource}: `next`, `float`, `int`, `pick`, `boolean`, `skewMax`, `skewMin`.
 * - {@link Random} namespace — grouped exports, same API as standalone functions (like {@link Easing}).
 *
 * ### Layer 3 — {@link RandomNumberUtils}
 *
 * Existing helpers (`randomFloat`, `randomSkewMax`, …) accept an optional
 * {@link RandomSource} as their last argument. Omit it for unseeded default behavior.
 *
 * ---
 *
 * @example Unique runtime (default)
 * ```ts
 * const rng = createRandom();
 * rng.float(0, 10); // different every page load
 * ```
 *
 * @example Reproducible layout with sub-seeds
 * ```ts
 * const master = 1337;
 * const books = createRandom(deriveSubSeed(master, 0x101));
 * const fog = createRandom(deriveSubSeed(master, 0x202));
 * ```
 *
 * @example Namespace import
 * ```ts
 * const rng = Random.create(deriveSubSeed(1337, 0x101));
 * ```
 */

/** Callable stream returning floats in [0, 1). */
export type RandomStream = () => number;

/**
 * Random source — a stream plus distribution helpers.
 * Returned by {@link createRandom}; also accepted by {@link RandomNumberUtils}.
 */
export interface RandomSource {
  /** `true` when backed by {@link mulberry32}; `false` when using `Math.random()`. */
  readonly seeded: boolean;
  /** Next float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  float(min?: number, max?: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min?: number, max?: number): number;
  /** Uniform element from a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /**
   * Element from a non-empty array, chosen with probability proportional to `weights[i]`.
   *
   * The weighted sibling of {@link pick}. A palette of styles that appear at different rates — a
   * cemetery that is mostly plain stones with the occasional monument — is a weighted draw, not a
   * uniform one. Negative weights count as zero; if every weight is zero it falls back to uniform.
   */
  weighted<T>(arr: readonly T[], weights: readonly number[]): T;
  /** `true` with given probability (default 0.5). */
  boolean(probability?: number): boolean;
  /**
   * Skew toward `max`. **`exponent` is the bias strength — higher pulls harder;** `1` is uniform, and
   * `< 1` reverses (piling toward `min` instead). Defaults to `2`. Mirrors {@link randomSkewMax}.
   */
  skewMax(exponent?: number, min?: number, max?: number): number;
  /**
   * Skew toward `min` — the mirror of {@link skewMax}. **Higher `exponent` = stronger bias;** `1` is
   * uniform, `< 1` reverses. Defaults to `2`. Mirrors {@link randomSkewMin}.
   */
  skewMin(exponent?: number, min?: number, max?: number): number;
  /**
   * Skew toward the CENTER of the range — the symmetric sibling of {@link skewMax} / {@link skewMin}.
   *
   * Small deviations from the middle are common, large ones rare, both directions equally likely: a
   * gentle jitter with the occasional outlier. Same convention as its siblings — **higher `exponent` =
   * stronger** pull to the center; `1` is uniform, `< 1` reverses (piling toward the edges). Defaults to
   * `2`. The full range is still reached, just seldom.
   */
  skewCenter(exponent?: number, min?: number, max?: number): number;
}

/**
 * Fast seeded PRNG — portfolio Gotham/Water parity.
 * Returns a closure yielding floats in [0, 1).
 */
export function mulberry32(seed: number): RandomStream {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seed mixer — maps one 32-bit value to another well-distributed value.
 * Use with {@link deriveSubSeed}, not as a drop-in stream replacement for
 * {@link mulberry32}.
 */
export function splitmix32(seed: number): number {
  let z = (seed >>> 0) + 0x9e3779b9;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z ^= z >>> 13;
  z = Math.imul(z ^ (z >>> 16), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Derive an independent sub-stream seed from a master seed and domain salt.
 *
 * XOR the salt before mixing so each subsystem gets its own mulberry32 stream
 * without sequential `seed + 1` collision risk. Use stable hex constants per
 * domain (`0x101` books, `0x202` fog, `0x303` windows, …).
 *
 * @example
 * ```ts
 * const master = 1337;
 * const bookRng = createRandom(deriveSubSeed(master, 0x101));
 * const fogRng = createRandom(deriveSubSeed(master, 0x202));
 * ```
 */
export function deriveSubSeed(masterSeed: number, salt: number): number {
  return splitmix32((masterSeed >>> 0) ^ (salt >>> 0));
}

function buildSource(stream: RandomStream, seeded: boolean): RandomSource {
  return {
    seeded,
    next: stream,
    float(min = 0, max = 1) {
      return min + (max - min) * stream();
    },
    int(min = 0, max = 1) {
      return Math.floor(this.float(min, max + 1));
    },
    pick<T>(arr: readonly T[]): T {
      if (!arr.length) throw new Error("RandomSource.pick() requires a non-empty array");
      return arr[this.int(0, arr.length - 1)]!;
    },
    weighted<T>(arr: readonly T[], weights: readonly number[]): T {
      if (!arr.length) throw new Error("RandomSource.weighted() requires a non-empty array");
      if (weights.length !== arr.length) {
        throw new Error("RandomSource.weighted() needs one weight per element");
      }
      let total = 0;
      for (const w of weights) total += Math.max(0, w);
      if (total <= 0) return arr[this.int(0, arr.length - 1)]!; // all zero — no signal, so uniform

      let r = stream() * total;
      for (let i = 0; i < arr.length; i++) {
        r -= Math.max(0, weights[i]!);
        if (r < 0) return arr[i]!;
      }
      return arr[arr.length - 1]!; // rounding slop only
    },
    boolean(probability = 0.5) {
      return stream() < probability;
    },
    skewMax(exponent = 2, min = 0, max = 1) {
      // Higher `exponent` = stronger. `pow(u, 1/exp)` with exp > 1 raises `u` toward 1 → toward `max`.
      return min + (max - min) * Math.pow(stream(), 1 / exponent);
    },
    skewMin(exponent = 2, min = 0, max = 1) {
      // The mirror of skewMax: flip the RESULT, not the input, so it piles toward `min`.
      return min + (max - min) * (1 - Math.pow(stream(), 1 / exponent));
    },
    skewCenter(exponent = 2, min = 0, max = 1) {
      // Draw once in [-1, 1), then shrink the MAGNITUDE toward 0 while keeping the sign, so the result
      // clusters at the midpoint. Higher `exponent` pulls harder; `1` is uniform (same value as `float`).
      const center = (min + max) / 2;
      const half = (max - min) / 2;
      const t = stream() * 2 - 1;
      return center + half * Math.sign(t) * Math.pow(Math.abs(t), exponent);
    },
  };
}

/**
 * Create a random source.
 *
 * - **No seed** — wraps `Math.random()`. Unique every runtime; default for examples.
 * - **With seed** — {@link mulberry32} stream. Same seed ⇒ same sequence.
 */
export function createRandom(seed?: number): RandomSource {
  if (seed === undefined) return buildSource(Math.random, false);
  return buildSource(mulberry32(seed >>> 0), true);
}

/** Float in [min, max) from any stream — website `range()` parity. */
export function randomRange(stream: RandomStream, min: number, max: number): number {
  return min + (max - min) * stream();
}

/** Pick from a non-empty array using any stream — website `pick()` parity. */
export function randomPick<T>(stream: RandomStream, arr: readonly T[]): T {
  if (!arr.length) throw new Error("randomPick() requires a non-empty array");
  return arr[Math.floor(stream() * arr.length)]!;
}

/** Weighted pick from a non-empty array using any stream — `weights[i]` is the relative chance of `arr[i]`. */
export function randomWeighted<T>(stream: RandomStream, arr: readonly T[], weights: readonly number[]): T {
  if (!arr.length) throw new Error("randomWeighted() requires a non-empty array");
  if (weights.length !== arr.length) throw new Error("randomWeighted() needs one weight per element");
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return arr[Math.floor(stream() * arr.length)]!;
  let r = stream() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= Math.max(0, weights[i]!);
    if (r < 0) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

/**
 * Grouped exports — same function API, namespace import like {@link Easing}.
 *
 * @example
 * ```ts
 * import { Random } from "three-low-poly";
 * const rng = Random.create(deriveSubSeed(1337, 0x101));
 * ```
 */
export const Random = {
  create: createRandom,
  mulberry32,
  splitmix32,
  deriveSubSeed,
  range: randomRange,
  pick: randomPick,
  weighted: randomWeighted,
} as const;
import { BufferGeometry, Vector3 } from "three";
import { surfaceGrid } from "../../loft/SurfaceGrid";

/**
 * The shape each tier hangs in.
 *
 * - `catenary` — `a·cosh(x/a)`, what a uniform hanging chain actually does.
 * - `parabola` — `1 − u²`, the approximation procedural code reaches for. At the sags a swag tier uses
 *   it is genuinely close; the two differ by about 5% of the sag at a deep setting.
 */
export type SwagSagCurve = "catenary" | "parabola";

export interface SwagGeometryOptions {
  /** Distance between the two pins. Defaults to `2`. */
  span?: number;
  /** How far the LOWEST tier falls below the pins. Defaults to `0.85`. */
  sag?: number;
  /**
   * How far the HIGHEST tier falls below the pins. Defaults to `0` — flat against the board.
   *
   * Zero is the usual answer, because the top of a swag is stapled to a straight piece of timber. Lift
   * it and the first visible fold hangs on its own, which is what a swag mounted on a pole or a rod does
   * rather than on a board. The pins stay at `y = 0` either way: the cinch takes every tier to zero at
   * `u = ±1`, so this deepens the middle of the top tier without moving where it is fixed.
   *
   * Clamped to {@link sag}, since a top fold hanging below the bottom one is not a swag.
   */
  topSag?: number;
  /**
   * How the tiers distribute down the sag. Defaults to `1.2`.
   *
   * Above 1 they bunch toward the hem instead of stacking evenly, which is what stops a swag reading as
   * a set of concentric arcs at equal spacing. Cloth does not distribute itself linearly.
   */
  sagPower?: number;
  /** Fold cycles down the tier stack. Defaults to `3.5`. Fractional values are legitimate. */
  folds?: number;
  /** Depth of the fold ripple. Defaults to `0.12`. */
  foldDepth?: number;
  /**
   * How far the lower tiers push forward. Defaults to `0.1`.
   *
   * Cloth has mass and the deeper folds hang out over the ones above them, which is what turns a flat
   * scallop into the nested crescent a real swag makes.
   */
  bulge?: number;
  /** How much narrower the upper tiers are. Defaults to `0.16`, because a higher fold spans less. */
  taper?: number;
  /** The tier envelope. Defaults to `"catenary"`. See {@link SwagSagCurve}. */
  sagCurve?: SwagSagCurve;
  /** Samples across the span. Defaults to `90`. Tessellation only — it never moves the silhouette. */
  widthSegments?: number;
  /** Samples down the tiers. Defaults to `110`. Carries the fold ripple, so it wants to be generous. */
  heightSegments?: number;
}

/** The catenary parameter `a` for a half-span and sag. No closed form; monotonic, so it bisects. */
function catenaryParameter(halfSpan: number, sag: number): number {
  let low = 1e-9;
  let high = 1e5;

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (mid * (Math.cosh(halfSpan / mid) - 1) > sag) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

/**
 * The tier's hanging shape, normalized: 1 at the centre, exactly 0 at both horns.
 *
 * **This factor is the cinch, and it is the whole geometry.** It multiplies both the sag and the fold
 * amplitude, so every tier converges on the same point at the pins and the folds compress smoothly to
 * nothing as they arrive. Nothing is cut and no fold is placed; one term gathers the cloth. Without it
 * the folds run at full depth into the corners and the result reads as corrugated sheet, not cloth.
 */
function envelope(kind: SwagSagCurve, u: number): number {
  if (kind === "parabola") return 1 - u * u;

  // Shape only; the caller scales it. `a` is solved once against a unit half-span and unit sag so the
  // profile keeps its character as `sag` moves, instead of re-solving into a different curve.
  const a = catenaryParameter(1, 1);
  const top = Math.cosh(1 / a);
  return (top - Math.cosh(u / a)) / (top - 1);
}

/**
 * A swag — cloth hung in a curve between two pins, cinched to a knot at each end.
 *
 * One continuous surface over `(u, v)`: `u` across the span, `v` down the fold tiers. Three terms —
 * the macro sag hanging each tier, the micro fold rippling down them, and the cinch `E(u)` collapsing
 * both to zero at the horns.
 *
 * ```
 *   x(u,v) = u · (span/2 − taper·(1 − v))
 *   y(u,v) = −(topSag + (sag − topSag)·v^sagPower) · E(u)
 *   z(u,v) = (bulge·v + foldDepth·v·sin(2π·folds·v)) · E(u)
 * ```
 *
 * A vertical cut through the middle is a stack of waves — the S you see edge-on in any velvet valance,
 * and the profile this surface is a loft of. It is a LOFT rather than a sweep precisely because that
 * profile's amplitude changes across the span; carried unchanged it would be a sweep, and it would stop
 * looking like cloth.
 *
 * **Origin is the pin line**, at `y = 0`, with the cloth hanging to negative Y — the same convention as
 * {@link CascadeGeometry}.
 *
 * **This is a sheet with no thickness**, so it needs a material with `side: DoubleSide`.
 *
 * @example
 * ```ts
 * const swag = new Mesh(
 *   new SwagGeometry({ span: 2, sag: 0.85, folds: 3.5 }),
 *   new MeshStandardMaterial({ color: 0x1f5b45, roughness: 0.95, side: DoubleSide, flatShading: true }),
 * );
 * ```
 */
export class SwagGeometry extends BufferGeometry {
  constructor({
    span = 2,
    sag = 0.85,
    topSag = 0,
    sagPower = 1.2,
    folds = 3.5,
    foldDepth = 0.12,
    bulge = 0.1,
    taper = 0.16,
    sagCurve = "catenary",
    widthSegments = 90,
    heightSegments = 110,
  }: SwagGeometryOptions = {}) {
    super();

    const across = Math.max(2, Math.floor(widthSegments));
    const tiers = Math.max(1, Math.floor(heightSegments));
    // A top fold hanging below the bottom one is not a swag, so the shallower value wins.
    const top = Math.max(0, Math.min(topSag, sag));
    const grid: Vector3[][] = [];

    for (let j = 0; j <= tiers; j++) {
      const v = j / tiers;
      // From the top tier's sag to the bottom's, distributed by `sagPower`. At the default `topSag` of 0
      // this is exactly `sag * v^p`, so the shape is unchanged unless the option is asked for.
      const drop = top + (sag - top) * Math.pow(v, sagPower);
      // Both terms carry `v`: at the board the cloth is held flat, and the ripple has only reached full
      // depth by the hem.
      const ripple = bulge * v + foldDepth * v * Math.sin(Math.PI * 2 * folds * v);
      // Taper moves the horns themselves, so it is the one term the cinch does not multiply.
      const halfWidth = span / 2 - taper * (1 - v);

      const row: Vector3[] = [];
      for (let i = 0; i <= across; i++) {
        const u = -1 + (2 * i) / across;
        const e = envelope(sagCurve, u);
        row.push(new Vector3(u * halfWidth, -drop * e, ripple * e));
      }

      grid.push(row);
    }

    const geometry = surfaceGrid(grid);
    this.setIndex(geometry.getIndex());
    for (const name of Object.keys(geometry.attributes)) {
      this.setAttribute(name, geometry.attributes[name]!);
    }
    geometry.dispose();
  }
}

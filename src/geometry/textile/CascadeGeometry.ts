import { BufferGeometry, Vector3 } from "three";
import { surfaceGrid } from "../../loft/SurfaceGrid";

/**
 * The plan section of the accordion.
 *
 * - `knife` — a triangle. Every fold leans the same way, which is what the name says. Constant slope,
 *   so its arc length is proportional to its projected width.
 * - `sine` — a soft, rounded pleat.
 */
export type CascadePleat = "knife" | "sine";

export interface CascadeGeometryOptions {
  /**
   * Width of the flat cloth before it is folded. Defaults to `2.4`.
   *
   * **This is the conserved quantity and the reason nothing else has to be told what to do.** The cloth
   * is cut once; every fold depth below is solved so the accordion's arc length comes back to it.
   */
  fabricWidth?: number;
  /** Finished width where it is stapled to the board. Defaults to `0.34`. */
  topWidth?: number;
  /**
   * Finished width at the hem. Defaults to `0.62`.
   *
   * Wider than {@link topWidth} is the flare. Since the cloth is fixed, opening the flare LOWERS the
   * local fullness and the folds shallow out on their own — you never set a fold depth.
   */
  bottomWidth?: number;
  /** Number of pleats. Defaults to `6`. Each forward-facing crease becomes one step of the hem. */
  pleats?: number;
  /** The plan section. Defaults to `"knife"`. See {@link CascadePleat}. */
  pleat?: CascadePleat;
  /** Drop at the short (inner) edge. Defaults to `0.55`. */
  shortDrop?: number;
  /** Drop at the long (outer) tail. Defaults to `1.8`. The bias is the difference between the two. */
  longDrop?: number;
  /**
   * How far the stack tips into a cone — inner pleats tucking back, leading edge throwing forward.
   * Defaults to `0.06`.
   *
   * Zero at the board and growing with the drop, because at the board the cloth is stapled flat to a
   * straight piece of timber and cannot lean. Applied at full strength throughout, it shears the whole
   * panel and its top edge tilts about 10° away from the board it is fixed to.
   */
  roll?: number;
  /**
   * Samples across the width. Defaults to `240`.
   *
   * **Rounded UP so each pleat gets a multiple of four samples**, which puts one on every extremum of
   * the wave — a knife turns at phases 0 and 0.5, a sine at 0.25 and 0.75. A pleat has real apexes at
   * known parameters, and a sampling that steps over them clips the fold rather than approximating it:
   * unsnapped, the fold depth wanders with the phase instead of holding still. Snapped, it is identical
   * to nine digits at every count, which is what `segments` changes tessellation, never silhouette
   * actually demands of a shape with features in it.
   */
  widthSegments?: number;
  /** Samples down the drop. Defaults to `40`. */
  heightSegments?: number;
}

/** The accordion's plan section, normalized to ±1. */
function planShape(pleat: CascadePleat, phase: number): number {
  const t = phase - Math.floor(phase);
  if (pleat === "sine") return Math.sin(t * Math.PI * 2);
  return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
}

/** Arc length of one pleat relative to its projected width — the fullness a given amplitude buys. */
function arcRatio(pleat: CascadePleat, amplitude: number, pitch: number, samples = 240): number {
  let length = 0;
  let previousX = 0;
  let previousZ = planShape(pleat, 0) * amplitude;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = t * pitch;
    const z = planShape(pleat, t) * amplitude;
    length += Math.hypot(x - previousX, z - previousZ);
    previousX = x;
    previousZ = z;
  }

  return length / pitch;
}

/**
 * Amplitude for a required fullness. Bisected, because a sine plan's arc length is an elliptic integral
 * with no elementary inverse. The function is monotonic in amplitude, so bisection is exact.
 *
 * Solved against the CONTINUOUS arc length rather than the built polyline. Solving against the polyline
 * would make the fabric come out exact and would make `widthSegments` move the silhouette, since a
 * coarser sampling would need a deeper wave to reach the same length.
 */
function solveAmplitude(pleat: CascadePleat, fullness: number, pitch: number): number {
  if (fullness <= 1.0000001) return 0;

  let low = 0;
  let high = pitch * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (arcRatio(pleat, mid, pitch) < fullness) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

/**
 * A cascade — the pleated tail hanging beside a swag. Also called a jabot.
 *
 * An accordion of cloth hung vertically and trimmed along ONE STRAIGHT DIAGONAL. The sawtooth hem is not
 * modelled and no step is placed: only forward-facing creases show, each meets the diagonal at a
 * different place along the cloth, and so each terminates at a different height. There are exactly as
 * many steps as there are pleats, because a step IS a fold.
 *
 * The bias is straight in the FABRIC — in arc length along the pleat wave — because a jabot is cut flat
 * and folded afterwards. Cutting straight in the projected width instead moves the hem by under 1% of
 * the bias and does not change the treads at all, since the deviation between the two is periodic with
 * the pleats and every crease samples it at the same phase.
 *
 * **Origin is the board**, at `y = 0`, with the cloth hanging to negative Y — the same convention as
 * {@link SwagGeometry}. A hanging thing is anchored where it is fixed.
 *
 * **This is a sheet with no thickness**, so it needs a material with `side: DoubleSide`.
 *
 * @example
 * ```ts
 * const cascade = new Mesh(
 *   new CascadeGeometry({ pleats: 6, longDrop: 1.8 }),
 *   new MeshStandardMaterial({ color: 0x1f5b45, roughness: 0.95, side: DoubleSide, flatShading: true }),
 * );
 * ```
 */
export class CascadeGeometry extends BufferGeometry {
  constructor({
    fabricWidth = 2.4,
    topWidth = 0.34,
    bottomWidth = 0.62,
    pleats = 6,
    pleat = "knife",
    shortDrop = 0.55,
    longDrop = 1.8,
    roll = 0.06,
    widthSegments = 240,
    heightSegments = 40,
  }: CascadeGeometryOptions = {}) {
    super();

    // Rounded UP to a MULTIPLE OF FOUR samples per pleat, so every extremum lands on the grid.
    //
    // Four, not one: a knife wave turns at phases 0 and 0.5, a sine at 0.25 and 0.75, and only a
    // multiple of four puts a sample on all of them. A whole number per pleat is not enough — at 40
    // requested across 6 pleats that gives 7, which is odd, misses the crease and clips the fold depth
    // to 0.2213 against its true 0.2482.
    const requested = Math.max(4, Math.floor(widthSegments));
    const perPleat = Math.max(1, Math.ceil(requested / pleats / 4)) * 4;
    const across = perPleat * pleats;
    const down = Math.max(1, Math.floor(heightSegments));
    const grid: Vector3[][] = [];

    for (let j = 0; j <= down; j++) {
      const v = j / down;
      const width = topWidth + v * (bottomWidth - topWidth);
      const pitch = width / pleats;
      // Same cloth, more width: the local fullness is whatever the flare leaves it.
      const amplitude = solveAmplitude(pleat, fabricWidth / Math.max(1e-6, width), pitch);

      // Arc length along this tier, so the diagonal can be straight in the CLOTH rather than in the
      // picture of it. An accordion compresses cloth unevenly, so the two are not the same parameter.
      const arc: number[] = [0];
      let previous = new Vector3(0, 0, planShape(pleat, 0) * amplitude);
      for (let i = 1; i <= across; i++) {
        const u = i / across;
        const point = new Vector3(u * width, 0, planShape(pleat, u * pleats) * amplitude);
        arc.push(arc[i - 1]! + point.distanceTo(previous));
        previous = point;
      }
      const total = arc[across]!;

      const row: Vector3[] = [];
      for (let i = 0; i <= across; i++) {
        const u = i / across;
        const along = total < 1e-12 ? u : arc[i]! / total;
        const drop = shortDrop + along * (longDrop - shortDrop);

        row.push(
          new Vector3(
            u * width - width / 2,
            -v * drop,
            // `roll` carries `v`: at the board the cloth is stapled flat and cannot lean.
            planShape(pleat, u * pleats) * amplitude + roll * (u - 0.5) * v,
          ),
        );
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

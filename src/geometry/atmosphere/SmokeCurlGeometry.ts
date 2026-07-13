import { BufferGeometry, Vector3 } from "three";
import type { PathPoint } from "../../paths/PathPoint";
import { circleProfile } from "../../sweep/Profiles";
import { sweep, transportFrames } from "../../sweep/Sweep";

export interface SmokeCurlGeometryOptions {
  /** How far the curl swings out from its axis by the top. Defaults to `0.7`. */
  swirl?: number;
  /** How high it rises. Defaults to `3`. */
  height?: number;
  /** How many times it wraps around as it climbs. Defaults to `1.25`. */
  turns?: number;
  /** Thickness at the root. Defaults to `0.22`. */
  radius?: number;
  /** Thickness at the tip, as a fraction of the root. Drive it toward 0 and the trail dissolves to a point. Defaults to `0.04`. */
  taper?: number;
  /** Stations along the path — the smoothness of the curl. Defaults to `80`. */
  segments?: number;
  /** Sides of the cross-section. `4` gives a hard-edged ribbon, `16` a round wisp. Defaults to `8`. */
  sides?: number;
}

/**
 * A rising, wrapping curl — the stylized steam trailing a chimney, or the smoke off a snuffed candle.
 *
 * This is the library's first path that LEAVES ITS PLANE. The arch and the scroll are both flat, so
 * their frames only ever had to survive straight runs and changing curvature. A curl has **torsion**:
 * it twists out of any plane you could draw through it, which is precisely the case where a Frenet
 * frame spins the cross-section like a corkscrew for no reason at all. Parallel transport carries the
 * section along without ever spinning it, and this is the shape where you can see the difference.
 *
 * The tangent is analytic, not estimated from the chords. For `r(t)·(cos θ, ·, sin θ)` climbing in Y:
 *
 * ```text
 *   dx/dt = r'·cos θ − r·sin θ·θ'
 *   dy/dt = height
 *   dz/dt = r'·sin θ + r·cos θ·θ'
 * ```
 *
 * Local frame: root at the origin, rising +Y.
 *
 * @example
 * ```ts
 * const geometry = new SmokeCurlGeometry({ turns: 2, taper: 0.02 });
 * ```
 */
export class SmokeCurlGeometry extends BufferGeometry {
  readonly height: number;

  constructor({
    swirl = 0.7,
    height = 3,
    turns = 1.25,
    radius = 0.22,
    taper = 0.04,
    segments = 80,
    sides = 8,
  }: SmokeCurlGeometryOptions = {}) {
    super();

    this.height = height;

    const dTheta = turns * Math.PI * 2; // θ'(t)
    const dR = swirl; //                   r'(t) — the curl widens linearly as it rises

    const path: PathPoint[] = Array.from({ length: segments + 1 }, (_, i) => {
      const t = i / segments;
      const theta = dTheta * t;
      const r = swirl * t;

      return {
        position: new Vector3(r * Math.cos(theta), height * t, r * Math.sin(theta)),
        tangent: new Vector3(
          dR * Math.cos(theta) - r * Math.sin(theta) * dTheta,
          height,
          dR * Math.sin(theta) + r * Math.cos(theta) * dTheta,
        ),
      };
    });

    const geometry = sweep(circleProfile(radius, sides), transportFrames(path), {
      // Ease the taper rather than running it linearly — smoke thins slowly, then vanishes fast.
      scale: (t) => 1 - (1 - taper) * t * t,
      cap: false, // the root emerges from something; the tip is already a point
    });

    this.copy(geometry);
    geometry.dispose();
  }
}

import { BufferGeometry } from "three";
import { spiralPath } from "../../paths/SpiralPath";
import { rectProfile } from "../../sweep/Profiles";
import { sweep, transportFrames } from "../../sweep/Sweep";

export interface WroughtIronScrollGeometryOptions {
  /** Radius at the open end, before the bar winds in. Defaults to `1.4`. */
  startRadius?: number;
  /** How many turns it makes. Defaults to `1.6`. */
  turns?: number;
  /** How tightly it winds. Higher closes the curl faster. Defaults to `0.22`. */
  tightness?: number;
  /** Bar width — the wide face, lying in the plane of the scroll. Defaults to `0.16`. */
  barWidth?: number;
  /** Bar thickness, out of the plane. Defaults to `0.05`. */
  barThickness?: number;
  /** How far the bar draws down by the curl. `1` is no taper. Defaults to `0.45`. */
  taper?: number;
  /** Smoothness of the spiral — the low-poly knob. Defaults to `96`. */
  segments?: number;
}

/**
 * A wrought iron scroll — a flat bar drawn out and curled into a spiral.
 *
 * The path is a LOGARITHMIC spiral, `r = r₀·e^(−kθ)`, which is what a real scroll follows. An
 * Archimedean spiral (constant spacing) reads as mechanical; a logarithmic one tightens as it winds,
 * the way hot iron actually curls under a scroll jig.
 *
 * And the bar TAPERS as it curls, because a smith draws the metal out toward the tip. That per-station
 * taper is the thing that makes a scroll read as *forged* rather than bent from pipe — and it is the
 * one thing Three's own sweep cannot do at all.
 *
 * Local frame: the scroll lies in the XY plane, winding inward from `startRadius`.
 *
 * @example
 * ```ts
 * const scroll = new WroughtIronScrollGeometry({ turns: 1.6, taper: 0.35 });
 * ```
 */
export class WroughtIronScrollGeometry extends BufferGeometry {
  readonly startRadius: number;
  readonly turns: number;

  constructor({
    startRadius = 1.4,
    turns = 1.6,
    tightness = 0.22,
    barWidth = 0.16,
    barThickness = 0.05,
    taper = 0.45,
    segments = 96,
  }: WroughtIronScrollGeometryOptions = {}) {
    super();

    this.startRadius = startRadius;
    this.turns = turns;

    const path = spiralPath({ startRadius, turns, tightness, segments });

    this.copy(
      sweep(rectProfile(barWidth, barThickness), transportFrames(path), {
        // t runs 0 at the open end to 1 at the curl.
        scale: (t) => 1 - (1 - taper) * t,
      }),
    );
  }
}

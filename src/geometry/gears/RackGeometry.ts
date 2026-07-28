import { ExtrudeGeometry } from "three";
import { RackShape, type RackShapeOptions } from "../../shapes/RackShape";

export interface RackGeometryOptions extends RackShapeOptions {
  /** Extrusion depth — the rack's thickness across its run. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded **rack** — the straight member of a rack and pinion.
 *
 * **A rack is a gear of infinite radius.** Its teeth no longer converge on a centre, so they stand parallel and
 * the period advances along a line. The tooth profile is {@link GearShape}'s unchanged — same `tipWidth`,
 * `valleyWidth`, and `lean`, so `lean: 1` gives a linear ratchet exactly as it gives a rotary one.
 *
 * **{@link pitch} is an output, not an input:** `(length − inset × 2) / teeth`, exactly as a gear's
 * circumferential pitch is `2π × outerRadius / teeth`. Size the bar, then divide it — adding teeth makes them
 * finer rather than making the rack longer, and every tooth stays whole because the period is derived.
 *
 * To mesh with a pinion, size the bar so the derived pitch lands on the pinion's: a run of `n` teeth against a
 * `pinionTeeth` pinion of radius `r` wants `length = n × 2π × r / pinionTeeth + inset × 2`.
 *
 * **Racks tile end to end** at the default {@link RackShapeOptions.inset} of `0`: each end carries exactly half
 * a valley, so a seam between two bars is identical to any interior valley and a pinion rolls across it without
 * a hitch. Any nonzero inset opens that seam by `inset × 2` and the join becomes visible.
 *
 * Local frame: **rests on `y = 0`** with teeth pointing up, running along `+X` from the origin and extruded
 * across `+Z`. Ground contact, like the rest of the library — no translate needed to lay it on a surface.
 *
 * Material groups: **none** — one material for the whole bar.
 *
 * @example
 * ```typescript
 * // A 24-tooth rack cut to mesh with a 20-tooth pinion of radius 0.8.
 * const length = (24 * 2 * Math.PI * 0.8) / 20;
 * const rack = new Mesh(new RackGeometry({ teeth: 24, length }), steel);
 * ```
 */
export class RackGeometry extends ExtrudeGeometry {
  /** Overall length of the bar, after clamping. */
  readonly length: number;
  /** Tooth period, centre to centre — `(length − inset × 2) / teeth`. */
  readonly pitch: number;
  /** Y of the root line, where the teeth spring from the bar. */
  readonly rootY: number;
  /** Y of the tooth tips. */
  readonly tipY: number;

  constructor({ depth = 0.25, ...shapeOptions }: RackGeometryOptions = {}) {
    const shape = new RackShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    this.length = shape.length;
    this.pitch = shape.pitch;
    this.rootY = shape.rootY;
    this.tipY = shape.tipY;
  }
}

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
 * **{@link length} is an output, not an input:** `endMargin × 2 + teeth × pitch`. Every tooth is therefore whole.
 * Specifying a length instead would leave a fractional tooth at one end, which is the defect that makes any
 * repeating run look wrong.
 *
 * To mesh with a pinion, set {@link RackShapeOptions.pitch} to `2π × pitchRadius / pinionTeeth` — the pinion's
 * circumferential pitch flattened out.
 *
 * Local frame: **rests on `y = 0`** with teeth pointing up, running along `+X` from the origin and extruded
 * across `+Z`. Ground contact, like the rest of the library — no translate needed to lay it on a surface.
 *
 * Material groups: **none** — one material for the whole bar.
 *
 * @example
 * ```typescript
 * // A rack cut to mesh with a 20-tooth pinion of radius 0.8.
 * const pitch = (2 * Math.PI * 0.8) / 20;
 * const rack = new Mesh(new RackGeometry({ teeth: 24, pitch }), steel);
 * ```
 */
export class RackGeometry extends ExtrudeGeometry {
  /** Overall length — `endMargin × 2 + teeth × pitch`. */
  readonly length: number;
  /** Y of the root line, where the teeth spring from the bar. */
  readonly rootY: number;
  /** Y of the tooth tips — the full height of the rack. */
  readonly tipY: number;

  constructor({ depth = 0.25, ...shapeOptions }: RackGeometryOptions = {}) {
    const shape = new RackShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    this.length = shape.length;
    this.rootY = shape.rootY;
    this.tipY = shape.tipY;
  }
}

import { ExtrudeGeometry } from "three";
import { RackShape, type RackShapeOptions } from "../../shapes/RackShape";

export interface RackGeometryOptions extends RackShapeOptions {
  /** Extrusion depth — the rack's thickness across its run. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded **rack** — the straight member of a rack and pinion. See {@link RackShape} for the profile.
 *
 * To mesh with a pinion, size the bar so its derived {@link pitch} lands on the pinion's: a run of `n` teeth
 * against a `pinionTeeth` pinion of pitch radius `r` wants `length = n × 2π × r / pinionTeeth + inset × 2`.
 *
 * Local frame: **rests on `y = 0`** with teeth pointing up, running along `+X` from the origin and extruded
 * across `+Z`. Ground contact, like the rest of the library — no translate needed to lay it on a surface.
 *
 * Material groups: **none** — one material for the whole rack.
 *
 * @example
 * ```typescript
 * // A 24-tooth rack cut to mesh with a 20-tooth pinion of pitch radius 0.8.
 * const length = (24 * 2 * Math.PI * 0.8) / 20;
 * const rack = new Mesh(new RackGeometry({ teeth: 24, length }), steel);
 * ```
 */
export class RackGeometry extends ExtrudeGeometry {
  /** Overall length of the bar, after clamping. */
  readonly length: number;
  /** Tooth period, center to center — `(length − inset × 2) / teeth`. */
  readonly pitch: number;
  /** Height the tooth tips reach, after clamping. */
  readonly tipHeight: number;
  /** Height the valley floors sit at, after clamping. */
  readonly valleyHeight: number;
  /** Tip flat as a fraction of the period, after clamping. */
  readonly tipWidth: number;
  /** Valley flat as a fraction of the period, after clamping. */
  readonly valleyWidth: number;

  constructor({ depth = 0.25, ...shapeOptions }: RackGeometryOptions = {}) {
    const shape = new RackShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    this.length = shape.length;
    this.pitch = shape.pitch;
    this.tipHeight = shape.tipHeight;
    this.valleyHeight = shape.valleyHeight;
    this.tipWidth = shape.tipWidth;
    this.valleyWidth = shape.valleyWidth;
  }
}

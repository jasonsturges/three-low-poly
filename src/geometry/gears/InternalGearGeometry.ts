import { ExtrudeGeometry } from "three";
import { InternalGearShape, type InternalGearShapeOptions } from "../../shapes/InternalGearShape";

export interface InternalGearGeometryOptions extends InternalGearShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded **internal gear** — a ring whose opening is toothed, teeth pointing inward. See
 * {@link InternalGearShape} for the profile and its three radii.
 *
 * This is the ring of a planetary gearset and the mating half of an internal pair. Note that an *externally*
 * toothed ring — a flywheel starter ring — needs nothing new: it is {@link GearGeometry} with a bore set just
 * inside the valley radius. "Ring gear" names the form, not the tooth direction.
 *
 * Local frame: **centered on its own thickness**, spanning `±depth / 2` in Z, matching {@link GearGeometry} so
 * meshing wheels share the plane they turn in.
 *
 * Material groups: **none** — one material for the whole ring.
 *
 * @example
 * ```typescript
 * const ring = new Mesh(new InternalGearGeometry({ teeth: 36 }), steel);
 * ```
 */
export class InternalGearGeometry extends ExtrudeGeometry {
  /** The tip radius actually used. */
  readonly tipRadius: number;
  /** The valley radius actually used. */
  readonly valleyRadius: number;
  /** The rim radius actually used, after clamping outside the toothed opening. */
  readonly rimRadius: number;

  constructor({ depth = 0.25, ...shapeOptions }: InternalGearGeometryOptions = {}) {
    const shape = new InternalGearShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    this.translate(0, 0, -depth / 2);

    this.tipRadius = shape.tipRadius;
    this.valleyRadius = shape.valleyRadius;
    this.rimRadius = shape.rimRadius;
  }
}

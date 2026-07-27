import { ExtrudeGeometry } from "three";
import { InternalGearShape, type InternalGearShapeOptions } from "../../shapes/InternalGearShape";

export interface InternalGearGeometryOptions extends InternalGearShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded **internal gear** — a ring whose opening is toothed, teeth pointing inward.
 *
 * Where {@link GearGeometry} makes the teeth its outer contour and cuts a bore, this inverts the roles: the
 * outer contour is a plain circle and **the teeth are the hole**. So there is no bore to guard — the opening
 * *is* the toothing, and the question of a bore reaching past the tips never arises.
 *
 * The tooth period is the external gear's, unchanged: tip, falling flank, root, rising flank, with
 * {@link InternalGearShapeOptions.tipWidth} and {@link InternalGearShapeOptions.valleyWidth} sized
 * independently and {@link InternalGearShapeOptions.lean} for asymmetry. Only the radii swap roles — the
 * **tip** is the inner extreme and the **root** the outer, because the teeth grow inward.
 *
 * This is the ring of a planetary gearset and the mating half of an internal pair. Note that an *externally*
 * toothed ring — a flywheel starter ring — needs nothing new: it is {@link GearGeometry} with a bore set just
 * inside the valley radius. "Ring gear" names the form, not the tooth direction.
 *
 * Local frame: **centred on its own thickness**, spanning `±depth / 2` in Z, matching {@link GearGeometry} so
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
  /** The rim radius actually used, after clamping outside the tooth roots. */
  readonly rimRadius: number;
  /** The tip radius actually used, after clamping inside the roots. */
  readonly tipRadius: number;

  constructor({ depth = 0.25, ...shapeOptions }: InternalGearGeometryOptions = {}) {
    const shape = new InternalGearShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    // Centre on the thickness rather than extruding forward from zero.
    this.translate(0, 0, -depth / 2);

    this.rimRadius = shape.rimRadius;
    this.tipRadius = shape.tipRadius;
  }
}

import { ExtrudeGeometry } from "three";
import { GearShape, type GearShapeOptions } from "../../shapes/GearShape";

export interface GearGeometryOptions extends GearShapeOptions {
  /** Extrusion depth. Defaults to `0.25`. */
  depth?: number;
}

/**
 * Extruded gear profile with a centre bore. See {@link GearShape} for the tooth period and how the two flats
 * divide it.
 *
 * Local frame: **centred on its own thickness**, spanning `±depth / 2` in Z, so a rank of gears sharing an
 * arbor lines up on the plane they turn in rather than each one starting where the last began.
 *
 * Material groups: **none** — one material for the whole wheel.
 *
 * @example
 * ```typescript
 * const gear = new Mesh(new GearGeometry({ teeth: 12, tipWidth: 0.1 }), brass);
 * const ratchet = new Mesh(new GearGeometry({ teeth: 16, lean: 1, tipWidth: 0 }), steel);
 * ```
 */
export class GearGeometry extends ExtrudeGeometry {
  /** The bore radius actually used, after clamping to fit inside the tooth profile. */
  readonly holeRadius: number;

  constructor({ depth = 0.25, ...shapeOptions }: GearGeometryOptions = {}) {
    const shape = new GearShape(shapeOptions);

    super(shape, { depth, bevelEnabled: false });

    // Centre on the thickness rather than extruding forward from zero.
    this.translate(0, 0, -depth / 2);
    this.holeRadius = shape.holeRadius;
  }
}

import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { MossyRockGeometry, type MossyRockGeometryOptions } from "../../geometry/rocks/MossyRockGeometry";

export interface MossyRockOptions extends MossyRockGeometryOptions {
  /** Rock tint. Defaults to `#808080`. */
  rockColor?: ColorRepresentation;
  /** Moss tint. Defaults to `#4b8b3b`. */
  mossColor?: ColorRepresentation;
  /** Moss opacity. Defaults to `0.8`. */
  mossOpacity?: number;
}

/**
 * Mossy rock prefab — grey stone with a translucent green moss shell.
 *
 * Material groups: `0` rock, `1` moss.
 */
export class MossyRock extends Mesh<MossyRockGeometry, MeshStandardMaterial[]> {
  constructor({
    rockColor = "#808080",
    mossColor = "#4b8b3b",
    mossOpacity = 0.8,
    ...geometryOptions
  }: MossyRockOptions = {}) {
    super(new MossyRockGeometry(geometryOptions), [
      new MeshStandardMaterial({ color: new Color(rockColor), flatShading: true }),
      new MeshStandardMaterial({
        color: new Color(mossColor),
        flatShading: true,
        opacity: mossOpacity,
        transparent: mossOpacity < 1,
      }),
    ]);
  }
}
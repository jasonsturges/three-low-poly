import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import {
  ArchedSlabGeometry,
  type ArchedSlabGeometryOptions,
} from "../../geometry/shapes/ArchedSlabGeometry";

export interface ArchedSlabOptions extends ArchedSlabGeometryOptions {
  /** Surface tint. Defaults to `#8d8477`. */
  color?: ColorRepresentation;
}

/**
 * Arched slab prefab — a door, a window, or a headstone.
 */
export class ArchedSlab extends Mesh<ArchedSlabGeometry, MeshStandardMaterial> {
  constructor({ color = "#8d8477", ...geometryOptions }: ArchedSlabOptions = {}) {
    super(
      new ArchedSlabGeometry(geometryOptions),
      new MeshStandardMaterial({ color: new Color(color), roughness: 0.95, flatShading: true }),
    );
  }
}

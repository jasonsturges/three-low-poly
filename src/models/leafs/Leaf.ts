import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { LeafGeometry, type LeafGeometryOptions } from "../../geometry/leafs/LeafGeometry";

export interface LeafOptions extends LeafGeometryOptions {
  /** Leaf tint. Defaults to `#a8702c`. */
  color?: ColorRepresentation;
}

/**
 * Folded autumn leaf prefab — {@link LeafGeometry} with flat-shaded double-sided
 * material matching the graveyard blowing-leaves look.
 *
 * Local frame: tip at +Y, base at −Y, fold rises along +Z.
 */
export class Leaf extends Mesh<LeafGeometry, MeshStandardMaterial> {
  readonly size: number;
  readonly lift: number;

  constructor({ color = "#a8702c", ...geometryOptions }: LeafOptions = {}) {
    const geometry = new LeafGeometry(geometryOptions);
    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
        side: DoubleSide,
      }),
    );

    this.size = geometry.size;
    this.lift = geometry.lift;
  }
}
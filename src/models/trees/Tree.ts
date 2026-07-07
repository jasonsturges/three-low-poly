import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { TreeGeometry, type TreeGeometryOptions } from "../../geometry/trees/TreeGeometry";

export interface TreeOptions extends TreeGeometryOptions {
  /** Trunk tint. Defaults to `#8b4513`. */
  trunkColor?: ColorRepresentation;
  /** Leaf tint. Defaults to `#228b22`. */
  leafColor?: ColorRepresentation;
}

/**
 * Low-poly tree prefab — trunk and leaf clusters with separate material groups.
 */
export class Tree extends Mesh<TreeGeometry, MeshStandardMaterial[]> {
  readonly trunkHeight: number;

  constructor({
    trunkColor = "#8b4513",
    leafColor = "#228b22",
    ...geometryOptions
  }: TreeOptions = {}) {
    const geometry = new TreeGeometry(geometryOptions);

    super(geometry, [
      new MeshStandardMaterial({
        color: new Color(trunkColor),
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
      new MeshStandardMaterial({
        color: new Color(leafColor),
        roughness: 0.8,
        metalness: 0,
        flatShading: true,
      }),
    ]);

    this.trunkHeight = geometry.trunkHeight;
  }
}
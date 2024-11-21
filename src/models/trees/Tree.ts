import { Mesh, MeshStandardMaterial } from "three";
import { TreeGeometry } from "../../geometry/trees/TreeGeometry";

/**
 * Material indices:
 * 0. Trunk
 * 1. leafSize
 *
 * Example usage:
 * ```
 * const tree = new Tree({
 *   trunkRadiusTop: 0.25,
 *   trunkRadiusBottom: 0.4,
 *   trunkHeight: 2.5,
 *   trunkSegments: 14,
 *   trunkColor: 0x8b4513,
 *   leafSize: 0.8,
 *   leafCount: 6,
 *   leafDetail: 0,
 *   leafSpreadRadius: 1.5,
 *   leafColor: 0x228b22,
 * });
 * ```
 */
export class Tree extends Mesh<TreeGeometry, MeshStandardMaterial[]> {
  constructor({
    trunkRadiusTop = 0.25,
    trunkRadiusBottom = 0.4,
    trunkHeight = 2.5,
    trunkSegments = 14,
    trunkColor = 0x8b4513,
    leafSize = 0.8,
    leafCount = 6,
    leafDetail = 0,
    leafSpreadRadius = 1.5,
    leafColor = 0x228b22,
  } = {}) {
    super(
      new TreeGeometry({
        trunkRadiusTop: trunkRadiusTop,
        trunkRadiusBottom: trunkRadiusBottom,
        trunkHeight: trunkHeight,
        trunkSegments: trunkSegments,
        leafSize: leafSize,
        leafCount: leafCount,
        leafDetail: leafDetail,
        leafSpreadRadius: leafSpreadRadius,
      }),
      [
        new MeshStandardMaterial({
          color: trunkColor,
          roughness: 0.9,
          metalness: 0,
          flatShading: true,
        }),

        new MeshStandardMaterial({
          color: leafColor,
          roughness: 0.8,
          metalness: 0,
          flatShading: true,
        }),
      ],
    );
  }
}

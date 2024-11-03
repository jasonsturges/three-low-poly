import { Mesh, MeshStandardMaterial } from "three";
import { TreeGeometry } from "../../geometry/trees/TreeGeometry.js";

/**
 * @example
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
 */
class Tree extends Mesh {
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
    super();

    const treeGeometry = new TreeGeometry({
      trunkRadiusTop: trunkRadiusTop,
      trunkRadiusBottom: trunkRadiusBottom,
      trunkHeight: trunkHeight,
      trunkSegments: trunkSegments,
      trunkColor: trunkColor,
      leafSize: leafSize,
      leafCount: leafCount,
      leafDetail: leafDetail,
      leafSpreadRadius: leafSpreadRadius,
      leafColor: leafColor,
    });

    const trunkMaterial = new MeshStandardMaterial({
      color: trunkColor,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
    });

    const leafMaterial = new MeshStandardMaterial({
      color: leafColor,
      roughness: 0.8,
      metalness: 0,
      flatShading: true,
    });

    this.geometry = treeGeometry;
    this.material = [trunkMaterial, leafMaterial];
  }
}

export { Tree };

import {BufferGeometry, CylinderGeometry, DodecahedronGeometry} from "three";
import {mergeBufferGeometries} from "three-stdlib";

/**
 * Tree geometry, consisting of a trunk and leaves.
 *
 * Group order:
 * - Trunk Material
 * - Leaf Material
 */
class TreeGeometry extends BufferGeometry {
  constructor({
    trunkRadiusTop = 0.25,
    trunkRadiusBottom = 0.4,
    trunkHeight = 2.5,
    trunkSegments = 14,
    leafSize = 0.8,
    leafCount = 6,
    leafDetail = 0,
    leafSpreadRadius = 1.5,
  } = {}) {
    super();

    // Create trunk geometry
    const trunk = new CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, trunkSegments);
    trunk.translate(0, trunkHeight / 2, 0);

    // Create leaf geometries
    const leafs: DodecahedronGeometry[] = [];
    for (let i = 0; i < leafCount; i++) {
      const leaf = new DodecahedronGeometry(leafSize, leafDetail);

      leaf.translate(
        (Math.random() - 0.5) * leafSpreadRadius,
        (Math.random() - 0.5) * leafSize + trunkHeight,
        (Math.random() - 0.5) * leafSpreadRadius,
      );
      leafs.push(leaf);
    }

    // Merge trunk and leaves
    this.copy(mergeBufferGeometries([trunk.toNonIndexed(), mergeBufferGeometries(leafs, false) as BufferGeometry], true) as BufferGeometry);
    this.computeVertexNormals();
  }
}

export { TreeGeometry };

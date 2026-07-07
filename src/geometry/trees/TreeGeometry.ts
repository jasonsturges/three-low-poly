import { BufferGeometry, CylinderGeometry, DodecahedronGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export interface TreeGeometryOptions {
  /** Trunk top radius. Defaults to `0.25`. */
  trunkRadiusTop?: number;
  /** Trunk bottom radius. Defaults to `0.4`. */
  trunkRadiusBottom?: number;
  /** Trunk height. Defaults to `2.5`. */
  trunkHeight?: number;
  /** Trunk circumference segments. Defaults to `14`. */
  trunkSegments?: number;
  /** Leaf dodecahedron radius. Defaults to `0.8`. */
  leafSize?: number;
  /** Number of leaf clusters. Defaults to `6`. */
  leafCount?: number;
  /** Leaf dodecahedron detail level. Defaults to `0`. */
  leafDetail?: number;
  /** Horizontal spread of leaf placement. Defaults to `1.5`. */
  leafSpreadRadius?: number;
}

/**
 * Low-poly tree — trunk (group 0) and leaf clusters (group 1).
 *
 * Local frame: trunk base at Y=0. Leaf positions use `Math.random()` each build.
 */
export class TreeGeometry extends BufferGeometry {
  readonly trunkRadiusTop: number;
  readonly trunkRadiusBottom: number;
  readonly trunkHeight: number;
  readonly trunkSegments: number;
  readonly leafSize: number;
  readonly leafCount: number;
  readonly leafDetail: number;
  readonly leafSpreadRadius: number;

  constructor({
    trunkRadiusTop = 0.25,
    trunkRadiusBottom = 0.4,
    trunkHeight = 2.5,
    trunkSegments = 14,
    leafSize = 0.8,
    leafCount = 6,
    leafDetail = 0,
    leafSpreadRadius = 1.5,
  }: TreeGeometryOptions = {}) {
    super();

    this.trunkRadiusTop = trunkRadiusTop;
    this.trunkRadiusBottom = trunkRadiusBottom;
    this.trunkHeight = trunkHeight;
    this.trunkSegments = trunkSegments;
    this.leafSize = leafSize;
    this.leafCount = leafCount;
    this.leafDetail = leafDetail;
    this.leafSpreadRadius = leafSpreadRadius;

    const trunk = new CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, trunkSegments);
    trunk.translate(0, trunkHeight / 2, 0);

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

    this.copy(
      mergeBufferGeometries(
        [trunk.toNonIndexed(), mergeBufferGeometries(leafs, false) as BufferGeometry],
        true,
      ) as BufferGeometry,
    );
    this.computeVertexNormals();
  }
}
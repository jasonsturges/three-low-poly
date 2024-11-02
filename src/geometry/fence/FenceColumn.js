import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Fence Column Geometry, a simple fence column shape
 * @extends BufferGeometry
 *
 * @example
 * // Create a fence column
 * const columnGeometry = new FenceColumn();
 * const columnMaterial = new MeshStandardMaterial({ color: 0x8b7d7b, flatShading: true });
 * const column = new Mesh(columnGeometry, columnMaterial);
 * scene.add(column);
 */
class FenceColumn extends BufferGeometry {
  constructor(height = 2.25) {
    super();

    // Column Base (a wider base for stability)
    const baseGeometry = new BoxGeometry(1.2, 0.5, 1.2);
    baseGeometry.translate(0, 0.25, 0);

    // Main Column (a tall rectangular shape, adjustable height)
    const columnGeometry = new BoxGeometry(1, height, 1);
    columnGeometry.translate(0, 0.5 + height / 2, 0);

    // Column Cap (a slightly wider cap on top)
    const capGeometry = new BoxGeometry(1.4, 0.3, 1.4);
    capGeometry.translate(0, 0.5 + height + 0.15, 0);

    this.copy(mergeGeometries([baseGeometry, columnGeometry, capGeometry], false));
  }
}

export { FenceColumn };

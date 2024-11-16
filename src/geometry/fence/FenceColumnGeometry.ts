import { BoxGeometry, BufferGeometry } from "three";
import {mergeBufferGeometries} from "three-stdlib";

/**
 * Fence Column Geometry, a stone slab fence column shape
 */
export class FenceColumnGeometry extends BufferGeometry {
  constructor({ height = 2.25 } = {}) {
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

    this.copy(mergeBufferGeometries([baseGeometry, columnGeometry, capGeometry], false) as BufferGeometry);
  }
}

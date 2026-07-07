import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface StoneFencePostGeometryOptions {
  /** Main column height (excluding base and cap). Defaults to `2.25`. */
  height?: number;
}

/**
 * Stone fence post — wide base, column, and cap.
 *
 * Local frame: base on Y=0.
 */
export class StoneFencePostGeometry extends BufferGeometry {
  readonly height: number;

  constructor({ height = 2.25 }: StoneFencePostGeometryOptions = {}) {
    super();

    this.height = height;

    const baseGeometry = new BoxGeometry(1.2, 0.5, 1.2);
    baseGeometry.translate(0, 0.25, 0);

    const columnGeometry = new BoxGeometry(1, height, 1);
    columnGeometry.translate(0, 0.5 + height / 2, 0);

    const capGeometry = new BoxGeometry(1.4, 0.3, 1.4);
    capGeometry.translate(0, 0.5 + height + 0.15, 0);

    this.copy(mergeGeometries([baseGeometry, columnGeometry, capGeometry], false) as BufferGeometry);
  }
}
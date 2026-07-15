import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface CrossHeadstoneGeometryOptions {
  /** Arm span — the full horizontal extent. Defaults to `0.55`. */
  width?: number;
  /** Total height, base to top of the shaft. Defaults to `1.15`. */
  height?: number;
  /** Slab depth. Defaults to `0.14`. */
  depth?: number;
  /**
   * Where the crossbar crosses, as a fraction of `height`. Defaults to `0.68`.
   *
   * A Latin cross carries its bar high — a short arm above, a long shaft below. `0.5` centers it (a
   * Greek cross); above `0.7` starts to look top-heavy.
   */
  crossbar?: number;
}

/**
 * Cross headstone — a vertical shaft crossed by a horizontal arm.
 *
 * `height` is the REAL height: the shaft rises from the base to exactly `height`, so a `1.15` cross is
 * `1.15` tall. (It used to secretly build to 60% of the number you gave it, with the bar riding too high
 * and the slab too thick.)
 *
 * Local frame: base on Y=0, centered on X/Z.
 */
export class CrossHeadstoneGeometry extends BufferGeometry {
  readonly width: number;
  readonly height: number;
  readonly depth: number;

  constructor({
    width = 0.55,
    height = 1.15,
    depth = 0.14,
    crossbar = 0.68,
  }: CrossHeadstoneGeometryOptions = {}) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;

    // The shaft is the full height, so `height` means what it says. Its width is a fraction of the arm
    // span, and the crossbar is that same thickness — a cross reads balanced when bar and shaft match.
    const shaftWidth = width * 0.32;
    const shaft = new BoxGeometry(shaftWidth, height, depth);
    shaft.translate(0, height / 2, 0);

    const arm = new BoxGeometry(width, shaftWidth, depth);
    arm.translate(0, height * crossbar, 0);

    this.copy(mergeGeometries([shaft, arm], false) as BufferGeometry);
    this.computeVertexNormals();
  }
}

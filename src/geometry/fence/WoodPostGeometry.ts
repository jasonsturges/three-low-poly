import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface WoodPostGeometryOptions {
  /** Post width and depth — a square section. Defaults to `0.12`. */
  width?: number;
  /** Shaft height, excluding the cap. Defaults to `1.5`. */
  height?: number;
  /** Cap width and depth. Overhangs the shaft. Defaults to `0.18`. */
  capWidth?: number;
  /** Cap height. `0` gives a bare post. Defaults to `0.05`. */
  capHeight?: number;
}

/**
 * Wooden fence post — a square shaft under an overhanging cap board.
 *
 * Its stepped profile is why {@link widthAt} exists: a run's stringers meet the shaft, but its
 * pickets must clear whatever is widest at picket height.
 *
 * Local frame: base at Y=0.
 *
 * @example
 * ```ts
 * const geometry = new WoodPostGeometry({ height: 1.5 });
 * const post = new Mesh(geometry, woodMaterial);
 * scene.add(post);
 * ```
 */
export class WoodPostGeometry extends BufferGeometry {
  /** Shaft height, excluding the cap. */
  readonly height: number;
  readonly width: number;
  readonly capWidth: number;
  readonly capHeight: number;

  constructor({
    width = 0.12,
    height = 1.5,
    capWidth = 0.18,
    capHeight = 0.05,
  }: WoodPostGeometryOptions = {}) {
    super();

    this.width = width;
    this.height = height;
    this.capWidth = capWidth;
    this.capHeight = capHeight;

    const parts: BufferGeometry[] = [];

    const shaft = new BoxGeometry(width, height, width);
    shaft.translate(0, height / 2, 0);
    parts.push(shaft);

    if (capHeight > 0) {
      const cap = new BoxGeometry(capWidth, capHeight, capWidth);
      cap.translate(0, height + capHeight / 2, 0);
      parts.push(cap);
    }

    this.copy(mergeGeometries(parts, false) as BufferGeometry);
  }

  /** Overall height, cap included. */
  get totalHeight(): number {
    return this.height + this.capHeight;
  }

  /**
   * Post width at height `y` — what a fence run asks to size itself against. Zero above and below
   * the post; steps out at the cap.
   */
  widthAt(y: number): number {
    if (y < 0 || y > this.totalHeight) return 0;
    return y <= this.height ? this.width : this.capWidth;
  }

  /** Widest the post gets between two heights — what pickets must clear. */
  maxWidthBetween(y0: number, y1: number): number {
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);

    return Math.max(this.widthAt(lo), this.widthAt(hi), this.widthAt(Math.min(hi, Math.max(lo, this.height))));
  }
}

import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface StoneFencePostGeometryOptions {
  /** Main column height, excluding base and cap. Defaults to `2.25`. */
  height?: number;
  /** Column width and depth. Defaults to `1`. */
  columnWidth?: number;
  /** Base width and depth. Defaults to `1.2`. */
  baseWidth?: number;
  /** Base height. Defaults to `0.5`. */
  baseHeight?: number;
  /** Cap width and depth. Defaults to `1.4`. */
  capWidth?: number;
  /** Cap height. Defaults to `0.3`. */
  capHeight?: number;
}

/**
 * Stone fence post — wide base, column, and cap.
 *
 * The stepped profile is the whole point, and the whole difficulty: a fence run meeting this post
 * must clear the widest step at bar height while its rails reach the narrower column. Use
 * {@link widthAt} and {@link maxWidthBetween} to size the run rather than hardcoding the steps.
 *
 * Local frame: base on Y=0.
 *
 * @example
 * ```ts
 * const geometry = new StoneFencePostGeometry({ height: 2.6 });
 * const post = new Mesh(geometry, stoneMaterial);
 * scene.add(post);
 * ```
 */
export class StoneFencePostGeometry extends BufferGeometry {
  /** Column height, excluding base and cap. */
  readonly height: number;
  readonly columnWidth: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly capWidth: number;
  readonly capHeight: number;

  /** Overall height, base and cap included. */
  get totalHeight(): number {
    return this.baseHeight + this.height + this.capHeight;
  }

  constructor({
    height = 2.25,
    columnWidth = 1,
    baseWidth = 1.2,
    baseHeight = 0.5,
    capWidth = 1.4,
    capHeight = 0.3,
  }: StoneFencePostGeometryOptions = {}) {
    super();

    this.height = height;
    this.columnWidth = columnWidth;
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.capWidth = capWidth;
    this.capHeight = capHeight;

    const base = new BoxGeometry(baseWidth, baseHeight, baseWidth);
    base.translate(0, baseHeight / 2, 0);

    const column = new BoxGeometry(columnWidth, height, columnWidth);
    column.translate(0, baseHeight + height / 2, 0);

    const cap = new BoxGeometry(capWidth, capHeight, capWidth);
    cap.translate(0, baseHeight + height + capHeight / 2, 0);

    this.copy(mergeGeometries([base, column, cap], false) as BufferGeometry);
  }

  /**
   * Post width at height `y` — what a fence run asks to size itself against.
   *
   * Zero above and below the post. The profile steps between base, column, and cap.
   *
   * This is the face-to-face width, which is what a run meeting the post square-on needs. A run
   * approaching a corner diagonally would face the wider diagonal instead — worth revisiting when
   * fences follow arbitrary paths.
   */
  widthAt(y: number): number {
    if (y < 0 || y > this.totalHeight) return 0;
    if (y <= this.baseHeight) return this.baseWidth;
    if (y <= this.baseHeight + this.height) return this.columnWidth;
    return this.capWidth;
  }

  /**
   * Widest the post gets between two heights — what bars must clear to avoid burying themselves
   * in the stonework.
   */
  maxWidthBetween(y0: number, y1: number): number {
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);

    // Piecewise-constant profile: the max can only occur at a step boundary or an endpoint.
    const boundaries = [lo, this.baseHeight, this.baseHeight + this.height, hi];

    return Math.max(
      ...boundaries.filter((y) => y >= lo && y <= hi).map((y) => this.widthAt(y)),
    );
  }
}

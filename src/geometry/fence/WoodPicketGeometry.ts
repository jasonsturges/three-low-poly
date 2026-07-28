import { ExtrudeGeometry, Shape } from "three";

export interface WoodPicketGeometryOptions {
  /** Plank width — the board's face. A 1×4 is `3.5`, a 1×6 is `5.5`, in inches. Defaults to `0.35`. */
  width?: number;
  /**
   * Overall height of the plank — the board, tip included. Defaults to `1.38`.
   *
   * The board you would buy, and the height a fence is quoted at: *"a four-foot fence"* means the highest point
   * sits at 48in. The top is cut **out of** this, so it is knowable before any cutting happens. See
   * `docs/option-parameter-conventions.md`.
   */
  height?: number;
  /**
   * Depth of the top cut, measured **down from the tip**. Defaults to `0.175`. `0` gives a flat-topped plank.
   *
   * Subtractive: taken out of {@link WoodPicketGeometryOptions.height}, never added to it, so the plank measures
   * `height` whatever this is set to and {@link WoodPicketGeometry.shoulderHeight} falls out as the difference.
   *
   * Sized by **itself** rather than by where the shoulder lands, because the cut is what should survive a change
   * of board length — a six-foot picket and a four-foot picket carry the same two-inch ear.
   *
   * Negative values invert the cut into a chevron notched out of the top. A legitimate shape, deliberately
   * unguarded, and one you ask for by sign rather than reach by accident.
   */
  tipDrop?: number;
  /**
   * Depth of the top cut, measured **in from each side**. Defaults to `0.175` — half the default width, so the
   * stock picket comes to a point. `0` gives a flat-topped plank.
   *
   * The other half of the same cut, and subtractive in the same way — taken out of
   * {@link WoodPicketGeometryOptions.width}, per side, so the flat left between the two is
   * `width − tipInset × 2` and is published as {@link WoodPicketGeometry.tipFlat}.
   *
   * **Equal to {@link WoodPicketGeometryOptions.tipDrop} is a 45° cut — the trade's dog-ear.** Equal cuts on
   * perpendicular axes, so the angle needs no solving: *"1-inch dog ears"* is `tipInset: 1, tipDrop: 1` and
   * stays that on any board width. Reaching `width / 2` brings the flanks together and the top to a point,
   * after which `tipDrop` alone decides blunt versus steep.
   *
   * Clamped to `width / 2`: beyond it the two chamfers cross and the outline folds through itself.
   */
  tipInset?: number;
  /** Plank thickness — the board's Z depth. Untouched by the top cut. Defaults to `0.04`. */
  thickness?: number;
}

/**
 * Wooden fence picket — a plank with a cut top, the white-picket-fence silhouette.
 *
 * Built as an extruded profile, so the top style lives in the outline rather than in the mesh.
 *
 * **The board is the input; the top is cut out of it.** `height` is the whole plank and `width` the whole face;
 * {@link WoodPicketGeometryOptions.tipDrop} and {@link WoodPicketGeometryOptions.tipInset} are the two halves of
 * one corner cut, taken *out of* those bounds. Neither can move the silhouette, and "how tall is this picket"
 * never means adding two numbers.
 *
 * **Flat, dog-ear and pointed are one continuum, not three styles** — two numbers slide between them:
 *
 * | style | condition |
 * |---|---|
 * | flat top | `tipDrop: 0` |
 * | dog ear | `tipInset === tipDrop` — a 45° cut, whatever the board |
 * | pointed | `tipInset: width / 2` — the flanks meet, no flat left |
 * | blunt / steep point | vary `tipDrop` at that inset |
 * | chevron | a negative `tipDrop` |
 *
 * A *gothic* top is **not** on this dial and never can be: its ornamental neck is a curve, and these two
 * parameters only ever generate straight chamfers. That would be a different profile, the way
 * {@link ArchProfile} keeps a style union over genuinely different curve families.
 *
 * Unlike a fence post, a picket publishes no width profile — it is infill, not structure. Nothing
 * attaches to it, so nothing needs to ask how wide it is at a given height.
 *
 * Local frame: base at Y=0, centered on X and Z.
 *
 * @example
 * ```ts
 * // A four-foot fence of 1x4 stock with standard dog ears — equal cuts, so 45 degrees.
 * const geometry = new WoodPicketGeometry({ width: 3.5, height: 48, tipInset: 0.5, tipDrop: 0.5 });
 * geometry.tipFlat; // 2.5 — the flat left across the top
 * ```
 */
export class WoodPicketGeometry extends ExtrudeGeometry {
  readonly width: number;
  /** Overall height of the plank, tip included. */
  readonly height: number;
  /** Depth of the cut from the tip down. Negative when inverted into a chevron. */
  readonly tipDrop: number;
  /** Depth of the cut in from each side, after clamping to `width / 2`. */
  readonly tipInset: number;
  readonly thickness: number;
  /** Height of the shoulder, where the cut begins — `height − tipDrop`. */
  readonly shoulderHeight: number;
  /** Flat left across the top — `width − tipInset × 2`. Zero once the flanks meet at a point. */
  readonly tipFlat: number;

  constructor({
    width = 0.35,
    height = 1.38,
    // The defaults are a 45° point: both cuts equal (so 45°) and at half the width (so the flanks meet).
    // Change one and you are somewhere nameable on the continuum rather than off in a decimal.
    tipDrop = 0.175,
    tipInset = 0.175,
    thickness = 0.04,
  }: WoodPicketGeometryOptions = {}) {
    const half = width / 2;
    // The only clamp here. Past half the width the two chamfers cross and the outline folds through itself,
    // leaving no polygon to triangulate — it buys a constructible shape, not a tasteful one.
    const inset = Math.max(0, Math.min(tipInset, half));
    const flatHalf = half - inset;
    const shoulderHeight = height - tipDrop;

    const profile = new Shape();
    profile.moveTo(-half, 0);
    profile.lineTo(half, 0);
    profile.lineTo(half, shoulderHeight);
    if (tipDrop !== 0) {
      // Flanks that meet collapse to a single apex rather than a doubled vertex, the way a gear's tooth does.
      if (flatHalf > 0) {
        profile.lineTo(flatHalf, height);
        profile.lineTo(-flatHalf, height);
      } else {
        profile.lineTo(0, height);
      }
    }
    profile.lineTo(-half, shoulderHeight);
    profile.closePath();

    super(profile, { depth: thickness, bevelEnabled: false });

    this.width = width;
    this.height = height;
    this.tipDrop = tipDrop;
    this.tipInset = inset;
    this.thickness = thickness;
    this.shoulderHeight = shoulderHeight;
    this.tipFlat = flatHalf * 2;

    // Extrude runs +Z from the profile plane; center it on Z so the plank straddles the run.
    this.translate(0, 0, -thickness / 2);
  }

  /**
   * Height of the plank's highest point.
   *
   * The same as {@link height} for any upright picket. They differ only when the cut is inverted (a negative
   * {@link tipDrop}), where the shoulder is the top and the chevron is notched below it.
   */
  get totalHeight(): number {
    return Math.max(this.height, this.shoulderHeight);
  }

  /**
   * Angle of the cut flank from horizontal, in radians — `atan2(tipDrop, tipInset)`.
   *
   * An output of the two cuts, never a third dial. `Math.PI / 4` exactly when they are equal, which is the
   * dog-ear the trade assumes by default.
   */
  get cutAngle(): number {
    return Math.atan2(this.tipDrop, this.tipInset);
  }
}

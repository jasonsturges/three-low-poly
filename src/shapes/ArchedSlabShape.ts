import { Shape } from "three";
import { ArchStyle, archRise, traceArch } from "./ArchProfile";

/** One side of a slab, split down the middle — see {@link ArchedSlabShapeOptions.half}. */
export type ArchedSlabHalf = "left" | "right";

export interface ArchedSlabShapeOptions {
  /** Width of the slab. Defaults to `1.2`. */
  width?: number;
  /** Height of the rectangular body, up to where the arch springs. Defaults to `1.4`. */
  height?: number;
  /**
   * Span of the arch. Defaults to `width`.
   *
   * Equal to `width` gives a smooth line sweeping across the top — a door, or a window. Pull it in and
   * SHOULDERS appear at the corners, and the arch sits *on* the slab: a headstone. The shoulders are
   * not modelled; they are what is left over.
   */
  archWidth?: number;
  /**
   * Rise of the arch above the springing — the ellipse's VERTICAL RADIUS, in world units. Defaults
   * to `0.6`.
   *
   * **`archHeight === archWidth / 2` is a perfect semicircle**, and it is the one you almost always
   * want. At that value the two radii are equal, so the ellipse *is* a circle — a Roman arch.
   *
   * | Span | Semicircle rise |
   * | --- | --- |
   * | `1.2` | `0.6` |
   * | `2.6` | `1.3` |
   * | `w` | `w / 2` |
   *
   * Below `w / 2` the arch flattens into a segmental one — wide and low, a gatehouse. Above it, the
   * arch stretches taller than it is wide.
   *
   * **The rise does NOT follow the span.** They are independent radii, which is what lets this be a
   * styling knob rather than a proportion — but it also means halving `width` leaves a rise that is
   * now too tall for it. Keep them in step yourself, or the arch quietly changes character when you
   * resize the slab.
   */
  archHeight?: number;
  /**
   * Return only the `left` or `right` half of the slab — the leaf of a double door. Omit for the whole
   * slab.
   *
   * **The half is CARVED OUT of the full outline; it is not a slab of half the width.** Halving `width`
   * instead would build a new, narrower ellipse, and each leaf would crown at its own center — stand
   * the pair side by side and you get an `M`, not an arch. The arc here is the same arc: the full
   * span's ellipse, sampled over half its sweep. Which makes the half a QUARTER ellipse, because the
   * whole arch was already half of one.
   *
   * The result is asymmetric, and that is the point: it is short at its outer edge (`height`, where the
   * arch springs) and tall at its inner edge (`height + archHeight`, the crown). The tall edge is the
   * meeting stile, where the two leaves come together.
   */
  half?: ArchedSlabHalf;
  /**
   * Which arch sits on top. Defaults to `elliptical`, which springs vertically out of the slab's sides
   * at any rise.
   *
   * `semicircle` is the one most callers want and forces `archHeight` to half the span. `pointed` and
   * `ogee` come to a point at the crown — and a half slab still splits cleanly there, so one leaf of an
   * ogee-arched double door works exactly like one leaf of a round-arched one. See {@link ArchStyle}.
   */
  arch?: ArchStyle;
}

/**
 * A rectangle with an arched top.
 *
 * One outline for three things that look like three: a **door**, an arched **window**, and a
 * **headstone**. Only the arch's span changes.
 *
 * ```
 *   archWidth == width      a smooth line across the top        -> a door, a window
 *
 *   archWidth <  width           /\     the arch sits ON the slab,
 *                             ___/  \___  leaving shoulders     -> a headstone
 *                            |          |
 * ```
 *
 * The arch is an ELLIPSE, not a circle, so its rise is independent of its span: a squat Roman arch and
 * a tall pointed one are the same outline with a different `archHeight`.
 *
 * **Which makes the semicircle a value, not a mode: `archHeight === archWidth / 2`.** Set the vertical
 * radius equal to the horizontal one and the ellipse is a circle. That is the arch most callers actually
 * want, and it is the one thing to remember here — see {@link ArchedSlabShapeOptions.archHeight}.
 *
 * Note this is a FILLED outline, not a swept band. An archway you walk through is a sweep — it follows
 * the curve. A door is an extrude — it fills it. Same arc, different operation.
 *
 * Pass {@link ArchedSlabShapeOptions.half} to get one leaf of a double door. Either way the outline is
 * drawn in the SLAB's frame — the arch stays centered on `x = 0` — so a half sits on its own side of
 * the centerline rather than being re-centered. Callers that want it elsewhere translate it; that is
 * how the door factory puts a leaf's origin on its hinge.
 */
export class ArchedSlabShape extends Shape {
  constructor({
    width = 1.2,
    height = 1.4,
    archWidth = width,
    archHeight = 0.6,
    half,
    arch = "elliptical",
  }: ArchedSlabShapeOptions = {}) {
    super();

    const hw = width / 2;
    const ha = Math.min(archWidth, width) / 2;

    // The arch decides its own rise — a semicircle forces one, a square head has none — so ask, rather
    // than assuming `archHeight` is what you get.
    const profile = { style: arch, x: 0, y: height, halfSpan: ha, rise: archHeight };
    const crown = height + archRise(profile);

    if (half === "left") {
      // Counter-clockwise: along the floor to the centerline, up the meeting stile to the crown...
      this.moveTo(-hw, 0);
      this.lineTo(0, 0);
      this.lineTo(0, crown);

      // ...down the left half of the SAME arch. Half an arch, not a half-size arch — the two leaves of a
      // double door are cut from one curve, or they crown separately and you get an `M`.
      traceArch(this, { ...profile, from: "crown", to: "left" });

      // ...out along the left shoulder if there is one, and close down the left side.
      if (ha < hw) this.lineTo(-hw, height);
      this.closePath();
      return;
    }

    if (half === "right") {
      // Counter-clockwise: along the floor, up the right side, in along the shoulder...
      this.moveTo(0, 0);
      this.lineTo(hw, 0);
      this.lineTo(hw, height);
      if (ha < hw) this.lineTo(ha, height);

      // ...up the right half of the same arch to the crown, then closePath drops down the meeting stile.
      traceArch(this, { ...profile, from: "right", to: "crown" });
      this.closePath();
      return;
    }

    // Counter-clockwise, starting bottom-left: along the floor, up the right side...
    this.moveTo(-hw, 0);
    this.lineTo(hw, 0);
    this.lineTo(hw, height);

    // ...in along the right shoulder, when the arch is narrower than the slab. When it is not, this is
    // a zero-length step, and a duplicate point is exactly what a triangulator does not need to see.
    if (ha < hw) this.lineTo(ha, height);

    // ...over the top...
    traceArch(this, { ...profile, from: "right", to: "left" });

    // ...back out along the left shoulder, and close down the left side.
    if (ha < hw) this.lineTo(-hw, height);
    this.closePath();
  }
}

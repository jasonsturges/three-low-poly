import { Path, Shape, Vector2 } from "three";

export interface InternalGearShapeOptions {
  /** Number of teeth. Defaults to `36`. */
  teeth?: number;
  /**
   * Radius the tooth tips reach — the **inner** extreme, since these teeth point inward. Defaults to `0.72`.
   */
  tipRadius?: number;
  /** Radius of the tooth roots — the **outer** extreme of the toothed opening. Defaults to `0.85`. */
  rootRadius?: number;
  /**
   * Outside radius of the ring. Defaults to `1`.
   *
   * Clamped to stay outside {@link InternalGearShapeOptions.rootRadius}, since the rim is what the teeth hang
   * from — let it inside and the ring parts into loose teeth.
   */
  rimRadius?: number;
  /** Sides on the outer rim. Defaults to `48` — high enough to read as round. */
  rimSides?: number;
  /**
   * Width of the flat at the tooth tip, as a fraction of one tooth period. `0` brings the tooth to a point.
   * Defaults to `0.25`.
   */
  tipWidth?: number;
  /**
   * Width of the flat at the root, as a fraction of one tooth period. `0` brings the root to a point. Defaults
   * to `0.25`.
   */
  valleyWidth?: number;
  /**
   * Tooth asymmetry, `-1` to `1`. At `0` both flanks are equal; at `1` the rising flank vanishes. Defaults to
   * `0`.
   */
  lean?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
}

/**
 * Internal gear profile — a plain ring whose **opening is toothed**, teeth pointing inward.
 *
 * The role of the tooth profile is what distinguishes this from {@link GearShape}. There, the teeth *are* the
 * outer contour and the bore is a hole. Here the outer contour is a plain circle and **the teeth are the hole**
 * — so there is no bore to guard: the opening *is* the toothing.
 *
 * The tooth period is identical to the external gear's — tip, falling flank, root, rising flank, with the two
 * flats sized independently and the flanks taking the remainder. Only the radii swap roles: the **tip** is the
 * inner extreme and the **root** the outer, because the teeth grow inward.
 *
 * This is the ring of a planetary set, and the mating half of an internal gear pair.
 */
export class InternalGearShape extends Shape {
  /** The rim radius actually used, after clamping outside the tooth roots. */
  readonly rimRadius: number;
  /** The tip radius actually used, after clamping inside the roots. */
  readonly tipRadius: number;

  constructor({
    teeth = 36,
    tipRadius = 0.72,
    rootRadius = 0.85,
    rimRadius = 1,
    rimSides = 48,
    tipWidth = 0.25,
    valleyWidth = 0.25,
    lean = 0,
    rotation = 0,
  }: InternalGearShapeOptions = {}) {
    super();

    const count = Math.max(3, Math.round(teeth));
    // Teeth point inward, so the tip must sit inside the root. Reversed, the profile would turn itself out.
    const tip = Math.min(Math.max(tipRadius, 1e-3), rootRadius * 0.999);
    this.tipRadius = tip;

    const step = (Math.PI * 2) / count;
    const start = Math.PI / 2 + rotation;

    // --- the outer rim: a plain circle, no teeth ---
    const sides = Math.max(3, Math.round(rimSides));
    const rimStep = (Math.PI * 2) / sides;
    // The farthest point of the toothed opening is a root corner, and distance from the origin is convex along
    // a chord — so the extreme is always AT a vertex. That is why this needs no segment search, unlike the
    // external gear's bore, where a flank chord passes NEARER the origin than either endpoint.
    const rim = Math.max(rimRadius, rootRadius * 1.02);
    this.rimRadius = rim;

    for (let n = 0; n < sides; n++) {
      const angle = start + rimStep * n;
      const x = Math.cos(angle) * rim;
      const y = Math.sin(angle) * rim;
      if (n === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();

    // --- the toothed opening, cut as a hole ---
    const flatTip = Math.max(0, Math.min(tipWidth, 1));
    const flatRoot = Math.max(0, Math.min(valleyWidth, 1 - flatTip));
    const flanks = 1 - flatTip - flatRoot;
    const bias = Math.max(-1, Math.min(lean, 1));
    const falling = (flanks * (1 + bias)) / 2;

    const opening = new Path();
    const outline: Vector2[] = [];

    for (let n = 0; n < count; n++) {
      const center = start + step * n;
      const at = (fraction: number, radius: number) => {
        const angle = center + fraction * step;
        outline.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
      };

      if (flatTip > 0) {
        at(-flatTip / 2, tip);
        at(flatTip / 2, tip);
      } else {
        at(0, tip);
      }

      if (flatRoot > 0) {
        at(flatTip / 2 + falling, rootRadius);
        at(flatTip / 2 + falling + flatRoot, rootRadius);
      } else {
        at(flatTip / 2 + falling, rootRadius);
      }
    }

    opening.setFromPoints(outline);
    opening.closePath();
    this.holes.push(opening);
  }
}

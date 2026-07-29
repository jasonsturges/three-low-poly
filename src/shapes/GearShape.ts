import { Path, Shape, Vector2 } from "three";

export interface GearShapeOptions {
  /** Number of gear teeth. Defaults to `5`. */
  teeth?: number;
  /** Tooth valley radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Tooth tip radius. Defaults to `1`. */
  outerRadius?: number;
  /**
   * Width of the flat at the tooth tip, as a fraction of one tooth period.
   * `0` brings the tooth to a point. Defaults to `0.25`.
   */
  tipWidth?: number;
  /**
   * Width of the flat at the valley floor, as a fraction of one tooth period.
   * `0` brings the valley to a point. Defaults to `0.25`.
   */
  valleyWidth?: number;
  /**
   * Tooth asymmetry, `-1` to `1`. At `0` both flanks are equal. At `1` the
   * rising flank vanishes and the tooth's trailing face drops radially — a
   * ratchet or escapement wheel rather than a gear. Defaults to `0`.
   */
  lean?: number;
  /** Number of sides on the center bore. Defaults to `5`. */
  holeSides?: number;
  /**
   * Center bore radius. Clamped to stay strictly inside the tooth profile — a bore that
   * reaches the outline would punch through the gear and cannot be triangulated. Set to
   * `0` to omit the bore. Defaults to `0.25`.
   */
  holeRadius?: number;
  /** Rotation in radians from the resting state. Defaults to `0`. */
  rotation?: number;
  /**
   * Rotation of the bore in radians, **relative to the wheel**. Defaults to `0`.
   *
   * Only visible on a low {@link GearShapeOptions.holeSides} count: at `4` the bore rests as a diamond, points
   * at north, south, east and west, and `Math.PI / 4` turns it into a square with flat sides. A round bore has
   * no orientation to set.
   *
   * Relative rather than absolute, so turning the wheel carries the bore with it — the shaft does not slip.
   */
  holeRotation?: number;
}

/** Distance from the origin to segment `ab`. */
function distanceToSegment(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) return a.length();

  // Project the origin onto the segment, clamped to its endpoints.
  const t = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));

  return Math.hypot(a.x + t * dx, a.y + t * dy);
}

/**
 * Gear profile — teeth around a polygonal center bore. Rests with a tooth up.
 *
 * One tooth period runs tip, falling flank, valley, rising flank. The two flats
 * are sized independently and the rest of the period is split between the
 * flanks, so the same profile spans a blunt trapezoidal gear, a spiked one, and
 * an asymmetric ratchet wheel. A flat given zero width collapses to a single
 * point rather than a doubled vertex.
 */
export class GearShape extends Shape {
  /** The bore radius actually used, after clamping to fit inside the tooth profile. */
  readonly holeRadius: number;

  constructor({
    teeth = 5,
    innerRadius = 0.5,
    outerRadius = 1,
    tipWidth = 0.25,
    valleyWidth = 0.25,
    lean = 0,
    holeSides = 5,
    holeRadius = 0.25,
    rotation = 0,
    holeRotation = 0,
  }: GearShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / teeth;
    const start = Math.PI / 2 + rotation;

    // The two flats share the period with the two flanks; keep a little room for
    // the flanks so a tooth can never become a plain cylinder wall.
    const tip = Math.max(0, Math.min(tipWidth, 1));
    const valley = Math.max(0, Math.min(valleyWidth, 1 - tip));
    const flanks = 1 - tip - valley;
    const bias = Math.max(-1, Math.min(lean, 1));
    const falling = (flanks * (1 + bias)) / 2;

    const outline: Vector2[] = [];

    for (let n = 0; n < teeth; ++n) {
      // Each tooth is centered on its own angle and walks forward from there.
      const center = start + step * n;

      const at = (fraction: number, radius: number) => {
        const angle = center + fraction * step;
        outline.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
      };

      if (tip > 0) {
        at(-tip / 2, outerRadius); // tip start
        at(tip / 2, outerRadius); // tip end
      } else {
        at(0, outerRadius); // sharp tooth
      }

      if (valley > 0) {
        at(tip / 2 + falling, innerRadius); // valley start
        at(tip / 2 + falling + valley, innerRadius); // valley end
      } else {
        at(tip / 2 + falling, innerRadius); // sharp valley
      }
    }

    this.setFromPoints(outline);
    this.closePath();

    // The bore must sit strictly inside the outline. Its closest approach to the center is
    // NOT innerRadius — a flank chord running from a valley out to the next tip passes
    // nearer the origin than either endpoint, and at low tooth counts it cuts well inside
    // the valley. Measure the outline instead of assuming.
    let limit = Infinity;
    for (let n = 0; n < outline.length; ++n) {
      limit = Math.min(limit, distanceToSegment(outline[n], outline[(n + 1) % outline.length]));
    }

    const bore = Math.min(holeRadius, limit * 0.99);
    this.holeRadius = bore;

    if (bore > 0 && holeSides > 2) {
      const hole = new Path();
      const holeStep = (Math.PI * 2) / holeSides;

      for (let n = 0; n < holeSides; ++n) {
        // Offset from the wheel's own phase, so the bore turns with the teeth and `holeRotation` is the
        // difference between them.
        const angle = start + holeRotation + holeStep * n;
        const x = Math.cos(angle) * bore;
        const y = Math.sin(angle) * bore;

        if (n === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      }

      hole.closePath();
      this.holes.push(hole);
    }
  }
}

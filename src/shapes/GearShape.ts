import { Path, Shape, Vector2 } from "three";

export interface GearShapeOptions {
  /** Number of gear teeth. Defaults to `5`. */
  teeth?: number;
  /** Tooth valley radius. Defaults to `0.5`. */
  innerRadius?: number;
  /** Tooth tip radius. Defaults to `1`. */
  outerRadius?: number;
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
 * Gear profile — trapezoidal teeth around a polygonal center bore.
 *
 * Rests with a tooth up. Each tooth period is divided evenly into tip, falling
 * flank, valley, and rising flank.
 */
export class GearShape extends Shape {
  /** The bore radius actually used, after clamping to fit inside the tooth profile. */
  readonly holeRadius: number;

  constructor({
    teeth = 5,
    innerRadius = 0.5,
    outerRadius = 1,
    holeSides = 5,
    holeRadius = 0.25,
    rotation = 0,
  }: GearShapeOptions = {}) {
    super();

    const step = (Math.PI * 2) / teeth;
    const eighth = step / 8;
    const start = Math.PI / 2 + rotation;

    const outline: Vector2[] = [];

    for (let n = 0; n < teeth; ++n) {
      // Each tooth is a trapezoid centered on its own angle.
      const center = start + step * n;

      const at = (angle: number, radius: number) =>
        outline.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));

      at(center - eighth, outerRadius); // tip start
      at(center + eighth, outerRadius); // tip end
      at(center + eighth * 3, innerRadius); // valley start
      at(center + eighth * 5, innerRadius); // valley end
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
        const angle = start + holeStep * n;
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

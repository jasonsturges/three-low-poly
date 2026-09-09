import type { Vec2 } from "../mesh/GeometryBuffers";

/**
 * Single-surface profiles: fillet band, bead half-round, astragal stepped bead, reed repeated beads,
 * ovolo quarter, ogee S-curve, and lip overhang with an undercut throat.
 */
export type SurfaceStyle = "fillet" | "bead" | "astragal" | "reed" | "ovolo" | "ogee" | "lip";

export interface SurfaceProfileOptions {
  /** Exposed contour projecting from the flat back. */
  style?: SurfaceStyle;
  /** Extent along the supporting surface. */
  height?: number;
  /** Projection from the supporting surface. */
  projection?: number;
  /** Curve subdivision count. */
  segments?: number;
  /** Bead count for reed; ignored by other styles. */
  reeds?: number;
}

/**
 * Closed CCW profile with one flat back from (0, 0) to (height, 0); projection is the outward y extent.
 *
 * ```
 *   CORNER (moldingProfile)              SURFACE (this)
 *        ceiling                                 ╭──╮
 *    ────┬────────►  projection             ────┴──┴────►  projection
 *        │╲                                 ▲
 *   wall │ ╲___                             │  one back, flat on the wall
 *        ▼                                  │
 *       drop                              height
 * ```
 *
 * ```ts
 * // A chair rail: an astragal, run along a wall at chair height.
 * const rail = new MoldingGeometry({
 *   points: wallLine(0.9),
 *   profile: surfaceProfile({ style: "astragal", height: 0.07, projection: 0.028 }),
 *   run: "base",
 *   facing: "outward",
 * });
 * ```
 */
export function surfaceProfile({
  style = "bead",
  height = 0.07,
  projection = 0.028,
  segments = 6,
  reeds = 4,
}: SurfaceProfileOptions = {}): Vec2[] {
  const steps = Math.max(1, Math.round(segments));
  // Begin with the flat back.
  const points: Vec2[] = [
    [0, 0],
    [height, 0],
  ];

  /** Half an ellipse bulging out of the surface, walked from `x1` down to `x0`. */
  const bulge = (x0: number, x1: number, base: number, out: number, count: number) => {
    const mid = (x0 + x1) / 2;
    const half = (x1 - x0) / 2;
    for (let i = 0; i <= count; i++) {
      const t = (i / count) * Math.PI;
      points.push([mid + half * Math.cos(t), base + out * Math.sin(t)]);
    }
  };

  switch (style) {
    case "fillet":
      points.push([height, projection], [0, projection]);
      break;

    case "bead":
      bulge(0, height, 0, projection, steps * 2);
      break;

    case "astragal": {
      // Fillets border both sides of the bead.
      const fillet = height * 0.18;
      const step = projection * 0.3;
      points.push([height, step], [height - fillet, step]);
      bulge(fillet, height - fillet, step, projection - step, steps * 2);
      points.push([0, step]);
      break;
    }

    case "reed": {
      // Walked top-down, so each bead continues the winding the back started.
      const count = Math.max(1, Math.round(reeds));
      const pitch = height / count;
      for (let i = 0; i < count; i++) {
        bulge(height - (i + 1) * pitch, height - i * pitch, 0, projection, steps);
      }
      break;
    }

    case "ovolo":
      points.push([height, projection]);
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([height * (1 - Math.sin(t)), projection * Math.cos(t)]);
      }
      break;

    case "ogee": {
      // Two quarters of half size meeting at the middle: HOLLOW above, BULGING below, so it returns to
      // the wall the way a cyma does.
      //
      //   upper arc, center (h/2, projection) -> falls away from the chord, reading as hollow
      //   lower arc, center (h/2, 0)          -> stands proud of it, reading as a bulge
      const half = Math.max(1, Math.round(steps / 2));
      const hx = height / 2;
      const hy = projection / 2;
      for (let i = 0; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx + hx * Math.cos(t), projection - hy * Math.sin(t)]);
      }
      for (let i = 1; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx - hx * Math.sin(t), hy * Math.cos(t)]);
      }
      break;
    }

    case "lip": {
      // The crest overhangs an undercut throat.
      //
      //         ╭──╮   ← crest, at full projection
      //        ╱   │
      //       ╱    ╯   ← the UNDERCUT cuts back in
      //      │  ╲
      //      │   ╲     ← throat: where the hook grips
      //      ╰────╲
      //
      const crestX = height * 0.72;
      const throat: Vec2 = [height * 0.5, projection * 0.28];

      // Over the top: a quarter running from the flat top face out to the crest.
      points.push([height, projection * 0.45]);
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([
          crestX + (height - crestX) * Math.cos(t),
          projection * 0.45 + projection * 0.55 * Math.sin(t),
        ]);
      }
      // A straight segment preserves the sharp undercut.
      points.push(throat);
      // Below the throat, a plain ovolo dying into the wall.
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([throat[0] * (1 - Math.sin(t)), throat[1] * Math.cos(t)]);
      }
      break;
    }
  }

  // Remove repeated adjacent/closing points to avoid zero-length sweep edges.
  const distinct = points.filter(
    (p, i) => i === 0 || Math.hypot(p[0] - points[i - 1]![0], p[1] - points[i - 1]![1]) > 1e-12,
  );
  const first = distinct[0]!;
  const last = distinct[distinct.length - 1]!;
  if (distinct.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-12) distinct.pop();

  return distinct;
}

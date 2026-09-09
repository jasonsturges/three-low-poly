import type { Vec2 } from "../mesh/GeometryBuffers";

/**
 * Solid-backed corner-section styles: cove/scotia hollows, ovolo convex quarter, ogee/cyma S-curves,
 * chamfer splay, fillet rectangle, and step polygon.
 */
export type MoldingStyle = "cove" | "ovolo" | "chamfer" | "ogee" | "cyma" | "scotia" | "fillet" | "step";

export interface MoldingProfileOptions {
  /** Exposed contour between the wall and ceiling or floor backs. */
  style?: MoldingStyle;
  /** Distance along the wall from the corner. */
  drop?: number;
  /** Distance along the ceiling or floor from the wall. */
  projection?: number;
  /** Curve subdivisions; endpoints remain at drop and projection. Chamfer, fillet and step use fixed polygons. */
  segments?: number;
}

/**
 * Closed CCW corner profile in (normal, binormal) coordinates, with backs meeting at (0, 0).
 * The x extent is drop; the y extent is projection.
 *
 * ```
 *          ceiling
 *     ────┬──────────────────►  projection   (the profile's `y`, and the sweep's binormal)
 *         │╲
 *    wall │ ╲___
 *         │      ╲
 *         ▼        ╵
 *        drop  (the profile's `x`, and the sweep's normal)
 * ```
 *
 * ```ts
 * const cornice = sweep(moldingProfile({ style: "ogee", drop: 0.12, projection: 0.09 }), stations, {
 *   closed: true,
 * });
 * ```
 */
export function moldingProfile({
  style = "cove",
  drop = 0.09,
  projection = 0.09,
  segments = 6,
}: MoldingProfileOptions = {}): Vec2[] {
  const steps = Math.max(1, Math.round(segments));
  // Start at the intersection of the two backs.
  const points: Vec2[] = [[0, 0]];

  switch (style) {
    case "chamfer":
      points.push([drop, 0], [0, projection]);
      break;

    case "ovolo":
      // A convex quarter about the corner: the face bulges into the room.
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([drop * Math.cos(t), projection * Math.sin(t)]);
      }
      break;

    case "cove":
      // A concave quarter about the OUTER corner, so the face falls back toward the wall line.
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([drop * (1 - Math.sin(t)), projection * (1 - Math.cos(t))]);
      }
      break;

    case "ogee": {
      // Two quarters of half size meeting at the diagonal's midpoint — convex nearest the wall, concave
      // nearest the ceiling. That order is what makes it a cyma RECTA; swapping them gives the reversa.
      const half = Math.max(1, Math.round(steps / 2));
      const hx = drop / 2;
      const hy = projection / 2;
      for (let i = 0; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx + hx * Math.cos(t), hy * Math.sin(t)]);
      }
      for (let i = 1; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx - hx * Math.sin(t), projection - hy * Math.cos(t)]);
      }
      break;
    }

    case "cyma": {
      // The reversa: the same two quarters, swapped. Hollow nearest the wall, bulge nearest the ceiling.
      const half = Math.max(1, Math.round(steps / 2));
      const hx = drop / 2;
      const hy = projection / 2;
      for (let i = 0; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([drop - hx * Math.sin(t), hy * (1 - Math.cos(t))]);
      }
      for (let i = 1; i <= half; i++) {
        const t = (i / half) * (Math.PI / 2);
        points.push([hx * Math.cos(t), hy + hy * Math.sin(t)]);
      }
      break;
    }

    case "scotia": {
      // A cubic with control points on the backs preserves endpoint tangents and an asymmetric hollow.
      // The Bézier control hull bounds it within drop × projection.
      const p0: Vec2 = [drop, 0];
      const p1: Vec2 = [drop * (1 - SCOTIA_WALL_PULL), 0];
      const p2: Vec2 = [0, projection * (1 - SCOTIA_CEILING_PULL)];
      const p3: Vec2 = [0, projection];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        points.push([
          a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
          a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
        ]);
      }
      break;
    }

    case "fillet":
      points.push([drop, 0], [drop, projection], [0, projection]);
      break;

    case "step":
      // Two steps; segments does not alter this polygon.
      points.push(
        [drop, 0],
        [drop, projection * STEP_FRACTION],
        [drop * STEP_FRACTION, projection * STEP_FRACTION],
        [drop * STEP_FRACTION, projection],
        [0, projection],
      );
      break;
  }

  return points;
}

/** Step riser position as a fraction of each dimension. */
const STEP_FRACTION = 0.45;

/** Unequal Bézier control-point fractions for the scotia hollow. */
const SCOTIA_WALL_PULL = 0.85;
const SCOTIA_CEILING_PULL = 0.35;

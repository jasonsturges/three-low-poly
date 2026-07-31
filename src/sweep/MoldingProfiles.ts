import type { Vec2 } from "../utils/GeometryBuffers";

/**
 * The classical molding sections, by their own names.
 *
 * Each is the FACE that spans between two flat backs — one against the wall, one against the ceiling or
 * floor. They differ only in how that face travels between them.
 *
 * - `cove` (cavetto) — hollow. The face curves back TOWARD the corner. The commonest ceiling trim, and
 *   what a run of plaster coving is.
 * - `ovolo` — the opposite: a convex quarter, bulging out into the room.
 * - `chamfer` — a straight splay, corner to corner. The degenerate case, and the one that stays a single
 *   flat facet no matter how `segments` is set.
 * - `ogee` (cyma recta) — an S: hollow at the ceiling flowing into a bulge at the wall. The classical
 *   cornice, and the section most people picture when they picture molding.
 */
export type MoldingStyle = "cove" | "ovolo" | "chamfer" | "ogee";

export interface MoldingProfileOptions {
  /** Which section. Defaults to `"cove"`. */
  style?: MoldingStyle;
  /** How far the molding runs along the WALL from the corner. Defaults to `0.09`. */
  drop?: number;
  /** How far it stands OUT from the wall, along the ceiling or floor. Defaults to `0.09`. */
  projection?: number;
  /**
   * How finely the face is cut — the low-poly knob. Defaults to `6`.
   *
   * `1` collapses every curved style to its chord, which is a chamfer; `16` reads as run plaster. Like
   * `segments` everywhere else in this library it changes TESSELLATION, never the silhouette's extent:
   * the face always meets the two backs at exactly `drop` and `projection`.
   */
  segments?: number;
}

/**
 * A molding section, as a closed profile ready for {@link sweep}.
 *
 * **Molding lives in a CORNER**, which is what makes it different from bar stock, and what the whole
 * convention here follows from. Every section has two flat backs meeting at the corner line, and a
 * decorative face spanning between them:
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
 * So the corner sits at the profile's origin, one back runs out along `x` to `drop`, the other along `y`
 * to `projection`, and the face closes the triangle between them. `drop` and `projection` are the two
 * numbers molding is actually sold in — a "3½ inch crown with 2¼ projection" — rather than a width and a
 * height that would have to be explained.
 *
 * These are SOLID-BACKED sections: they sit flush in the corner with no void behind, which is exactly
 * what plaster coving is. Sprung crown, which bridges the corner on two narrow flats and leaves a
 * triangular void, is a different family and not yet here.
 *
 * The section is a closed polygon wound counter-clockwise, so it can be handed to `sweep` directly, or
 * to {@link MoldingGeometry} by name.
 *
 * @example
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
  // The corner itself, where the two backs meet. Everything else is the face, running from the wall's
  // edge round to the ceiling's.
  const points: Vec2[] = [[0, 0]];

  switch (style) {
    case "chamfer":
      // A single facet, corner to corner. Not affected by `segments` — a chamfer that got smoother would
      // not be a chamfer.
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
  }

  return points;
}

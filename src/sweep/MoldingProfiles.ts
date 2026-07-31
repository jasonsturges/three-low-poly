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
 * - `cyma` (cyma reversa) — the same S the other way up: a bulge at the ceiling over a hollow at the wall.
 *   Reads heavier than an `ogee`, because the mass sits high.
 * - `scotia` — a hollow of TWO radii rather than one, so it is deeper on one side than the other. The
 *   asymmetry is the whole point; a symmetric hollow is just a `cove`.
 * - `fillet` — no face at all: a plain square band filling the corner. A listel. On its own it is the
 *   cheapest possible trim, and it is what the members of a built-up cornice are separated by.
 * - `step` — a corbelled two-step block, oversailing as it rises. Stone and brick rather than plaster or
 *   timber, and the lowest-poly section here.
 *
 * **These are CORNER sections**, every one — they bridge two surfaces. Beads, astragals, chair rails, and
 * picture rails sit on a SINGLE face instead, which is a different convention; supply those as a custom
 * `profile` to {@link MoldingGeometry}.
 */
export type MoldingStyle = "cove" | "ovolo" | "chamfer" | "ogee" | "cyma" | "scotia" | "fillet" | "step";

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
      // A hollow of two different radii — deeper against the wall than against the ceiling, which is the
      // whole difference from a `cove`. As ONE cubic curve rather than two arcs: two arcs of unequal
      // radius only meet smoothly if their centres share a normal at the join, and getting that wrong
      // gives a 90° crease at the waist instead of a hollow.
      //
      // The control points sit ON the two backs, so the curve leaves each one tangentially, exactly as a
      // cove does. Pulling them in by different amounts is what makes it asymmetric — and because a
      // Bézier stays inside its control points' hull, the section is guaranteed to stay inside
      // `drop × projection` however they are set.
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
      // The corner filled square. No face — this IS the band.
      points.push([drop, 0], [drop, projection], [0, projection]);
      break;

    case "step":
      // A corbel: out, up, out again. Fixed at two steps rather than driven by `segments`, because more
      // steps would be a different SILHOUETTE and `segments` may only change tessellation.
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

/** Where a `step`'s riser lands, as a fraction of each dimension. Even-ish, and it reads as masonry. */
const STEP_FRACTION = 0.45;

/**
 * How far a `scotia`'s hollow is drawn in along each back. Unequal on purpose — equal pulls would give a
 * symmetric hollow, which is a `cove`.
 */
const SCOTIA_WALL_PULL = 0.85;
const SCOTIA_CEILING_PULL = 0.35;

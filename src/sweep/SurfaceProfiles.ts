import type { Vec2 } from "../utils/GeometryBuffers";

/**
 * Molding sections that sit on a SINGLE face.
 *
 * The other half of the vocabulary. A cornice bridges two surfaces; a chair rail, a bead, an astragal all
 * sit flat on one wall. The classical ELEMENT names are shared with {@link MoldingStyle} — `ovolo`,
 * `ogee`, `fillet` name a curve, and a curve does not care what it is attached to — but the SECTIONS are
 * different polygons, because the closure differs. See {@link surfaceProfile}.
 *
 * - `fillet` — a plain flat band. A carpenter would call it a batten or a listel. The thing everything
 *   else is built up from, and a legitimate molding on its own.
 * - `bead` — a half-round standing proud of the surface. Large, it is a TORUS; the shape is the same and
 *   the size is a parameter, so there is one entry rather than two.
 * - `astragal` — a bead with a fillet each side, so it rides on a shallow step. That step is what gives
 *   it a shadow line top *and* bottom, which a bare bead has only at its edges.
 * - `reed` — several beads side by side. REEDING stands proud; FLUTING is its negative, cut in, and is
 *   not this.
 * - `ovolo` — square at the top, a convex quarter dying into the wall.
 * - `ogee` — an S: square at the top, hollow, then a bulge returning to the wall.
 * - `lip` — a crest that OVERHANGS, undercut beneath into a throat. What makes a picture rail work: the
 *   hook's tip goes up into the undercut and catches. A `bead` and an `astragal` have undercuts too, but
 *   shallow ones at mid-height; this puts a single deep one high on the section, where a hook reaches.
 *
 * **Chair rail, dado rail and picture rail are not styles, and that is deliberate** — they are heights on
 * a wall, not shapes. Any of these becomes one by being run at the right height; `lip` is named for its
 * overhang rather than for the rail people usually cut it into.
 */
export type SurfaceStyle = "fillet" | "bead" | "astragal" | "reed" | "ovolo" | "ogee" | "lip";

export interface SurfaceProfileOptions {
  /** Which section. Defaults to `"bead"`. */
  style?: SurfaceStyle;
  /** How far the section runs ALONG the surface. Defaults to `0.07`. */
  height?: number;
  /** How far it stands OUT from the surface. Defaults to `0.028`. */
  projection?: number;
  /** How finely a curved face is cut — the low-poly knob. Defaults to `6`. */
  segments?: number;
  /** How many beads a `reed` carries. Ignored by every other style. Defaults to `4`. */
  reeds?: number;
}

/**
 * A molding section that sits on ONE surface, as a closed profile ready for {@link sweep}.
 *
 * **The closure is the whole difference.** A corner section has two flat backs meeting at the origin, and
 * its face runs from one to the *other*. A surface section has ONE back, and its face leaves that surface
 * and comes back to it:
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
 * So the two cannot share a signature: there is no second surface for a `drop` to run along, and the size
 * that matters is the section's `height` along the wall. The classical element NAMES are shared, because
 * they name curves rather than closures — a surface `ovolo` is the same quarter as a corner `ovolo`,
 * finished differently.
 *
 * Nothing downstream needs to know which family a section belongs to. `MoldingGeometry` takes a `profile`
 * directly, and the miter never sees it — a corner is a property of the PATH.
 *
 * The section is a closed polygon wound counter-clockwise, with the back running from `(0, 0)` to
 * `(height, 0)`.
 *
 * @example
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
  // The flat back, always. Everything after this is the face.
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
      // The bead rides on a shallow fillet, top and bottom. That step is the point of an astragal — it
      // casts a shadow line at both edges, which a bare bead does not.
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
      //   upper arc, centre (h/2, projection) -> falls away from the chord, reading as hollow
      //   lower arc, centre (h/2, 0)          -> stands proud of it, reading as a bulge
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
      // The one section here that OVERHANGS. Everything else runs monotonically back to the wall; this
      // crests, then cuts back IN to a throat, leaving a lip a hook can hang from. That undercut is the
      // entire function of a picture rail, and it is why the shape earns an entry of its own rather than
      // being an ogee run high on the wall.
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
      // Straight back in, under the crest. A curve here would soften exactly the edge that has to be
      // crisp for the shadow — and for the hook.
      points.push(throat);
      // Below the throat, a plain ovolo dying into the wall.
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * (Math.PI / 2);
        points.push([throat[0] * (1 - Math.sin(t)), throat[1] * Math.cos(t)]);
      }
      break;
    }
  }

  // The helpers re-emit their start point, and a face returning to the wall re-emits the origin. A
  // repeated point in a sweep profile is a zero-length edge — it costs a degenerate band and reads as a
  // self-intersection to anything auditing the polygon. Drop them once here rather than making every
  // branch remember.
  const distinct = points.filter(
    (p, i) => i === 0 || Math.hypot(p[0] - points[i - 1]![0], p[1] - points[i - 1]![1]) > 1e-12,
  );
  const first = distinct[0]!;
  const last = distinct[distinct.length - 1]!;
  if (distinct.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-12) distinct.pop();

  return distinct;
}

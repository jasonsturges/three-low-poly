import { BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WallOpeningOptions } from "../../shapes/WallShape";
import { circleProfile } from "../../sweep/Profiles";
import type { Vec2 } from "../../utils/GeometryBuffers";
import { buildLatticeBars, openingBoundary } from "./latticeBars";

export interface DiamondLatticeGeometryOptions {
  /**
   * The opening the lattice fills. The SAME description a wall is punched with and a
   * {@link WindowFrameGeometry} is built from, so the three agree by construction.
   *
   * **There is no separate rectangular case.** `arch: "square"` is a flat head — an arch-shaped hole with
   * no curve in it — so a mullioned rectangle and a gothic light are one geometry with different points.
   */
  opening?: WallOpeningOptions;
  /**
   * Half the angle between the two came families, in degrees. Defaults to `45`, which is the square
   * diamond everyone pictures.
   *
   * Lower leans the quarries tall, higher leans them wide. The families are symmetric: `+angle` and
   * `−angle`.
   */
  angle?: number;
  /**
   * Perpendicular distance between neighbouring cames. Defaults to `0.19`.
   *
   * Measured across the cames rather than along an axis, so it means the same thing at any `angle` —
   * spacing measured on an axis would compress as the lattice leans.
   */
  spacing?: number;
  /**
   * Slides the whole grid across the opening, in world units. Defaults to `0`.
   *
   * The difference between a quarry centred on the crown and a came running up it. Nothing else moves the
   * pattern relative to the opening, and it is what decides which cames clip a corner and get dropped.
   */
  phase?: number;
  /** Width of the came ACROSS the glass — what you see from the front. Defaults to `0.022`. */
  cameWidth?: number;
  /**
   * Depth of the came THROUGH the glass. Defaults to `cameWidth`, a square section.
   *
   * Free to vary because it is the one dimension none of the cutting depends on: a came's end is decided
   * by casting in the opening's own plane, so a point's depth never reaches the boundary maths. Real lead
   * is deeper than it is wide, and a flat came reads as painted rather than leaded.
   */
  cameDepth?: number;
  /** Sides on the came's section — the low-poly knob. `4` is square lead, `12` reads round. Defaults to `4`. */
  cameSides?: number;
  /**
   * How finely the arch is followed. Defaults to `20`.
   *
   * This is also the ceiling on the came ENDS: they are cut against the outline's segments, so a came can
   * never be finer than the boundary it dies into — and is never rougher.
   */
  curveSegments?: number;
}

/**
 * Diamond lattice leading — the cames of a leaded light, cut into the opening at both ends.
 *
 * Every came SPANS the opening, and both of its ends are cut by the boundary itself rather than stopping
 * square. That is the whole point: a square-ended bar leaves teeth poking out through the frame, which is
 * what has always made an arched lattice hard. Here each ring point of the came runs along its own axis to
 * whichever segment of the outline it meets, with the ring split wherever that choice changes, so the ends
 * follow the arch exactly as closely as the arch itself is cut.
 *
 * **Not "arched" in the name, deliberately.** `arch: "square"` is a flat head, so a rectangular light and
 * a gothic one are the same geometry with different points — exactly as {@link WindowFrameGeometry} rings
 * any arch without saying so in its name. Two names would rebuild the split this construction removes.
 *
 * Cames CROSS one another and are left to interpenetrate, which is correct rather than lazy: lead came
 * crosses lead came, and an X-junction has no bisector to share.
 *
 * Baked to a single `BufferGeometry` — one draw call for the whole leading.
 *
 * Drawn at the ORIGIN — centred on X, sill at `y = 0` — whatever the opening's own `x` and `y` say, so
 * one lattice can be positioned into many openings and so it lands on a `WindowFrameGeometry` built from
 * the same description. Material groups: none; pass one material, not an array.
 *
 * A leaded light is the obvious use, but nothing here knows that. The same thing is a garden trellis, a
 * gate infill, or a screen.
 *
 * @example
 * ```ts
 * const opening = { width: 1.24, height: 1.15, arch: "pointed", archHeight: 0.78 } as const;
 *
 * const lattice = new Mesh(new DiamondLatticeGeometry({ opening }), lead);
 * const frame = new Mesh(new WindowFrameGeometry({ opening }), iron);
 * ```
 */
export class DiamondLatticeGeometry extends BufferGeometry {
  /** How many cames were built. Short offcuts that clip a corner are dropped, so this is not derivable. */
  readonly cameCount: number;

  constructor({
    opening = {},
    angle = 45,
    spacing = 0.19,
    phase = 0,
    cameWidth = 0.022,
    cameDepth = cameWidth,
    cameSides = 4,
    curveSegments = 20,
  }: DiamondLatticeGeometryOptions = {}) {
    super();

    // At the origin: the lattice does not care where its opening sits in a wall, only what shape it is.
    const boundary = openingBoundary(opening, curveSegments);

    // `circleProfile` is a regular polygon, so it is square by construction. Scaling the axis that maps
    // to the frame's NORMAL — the one running through the glass — makes it rectangular without touching
    // the axis the cutting reads.
    const depthScale = cameWidth > 0 ? cameDepth / cameWidth : 1;
    const profile = circleProfile(cameWidth / 2, Math.max(3, Math.round(cameSides))).map(
      ([px, py]) => [px * depthScale, py] as Vec2,
    );
    // Two families at ±angle. The lattice TYPE is only ever a choice of angles — a Gregorian is the same
    // call at 90° and 0° — which is why the bar machinery lives in `latticeBars` and neither geometry
    // knows what the other is building.
    const parts = buildLatticeBars(
      boundary,
      [
        { angle, spacing, phase },
        { angle: -angle, spacing, phase },
      ],
      profile,
      cameWidth * 3,
    );
    this.cameCount = parts.length;

    if (parts.length === 0) {
      this.computeBoundingSphere();
      return;
    }

    // Not cast — `mergeGeometries` returns null on mismatched attributes, and a cast turns that into an
    // unreadable "cannot read properties of null" three frames later.
    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error("DiamondLatticeGeometry: came parts have incompatible attributes.");

    this.copy(merged);
    merged.dispose();
    parts.forEach((part) => part.dispose());
    this.computeBoundingSphere();
  }
}

/** How close to a shared vertex a crossing counts as being ON it. See {@link lineChords}. */
const VERTEX_EPSILON = 1e-9;


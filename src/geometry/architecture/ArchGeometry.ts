import { BufferGeometry, Path, Vector3 } from "three";
import type { PathPoint } from "../../paths/PathPoint";
import { ArchStyle, archRise, traceArch } from "../../shapes/ArchProfile";
import { circleProfile, rectProfile } from "../../sweep/Profiles";
import { sweep, transportFrames } from "../../sweep/Sweep";
import type { Vec2 } from "../../utils/GeometryBuffers";

export interface ArchGeometryOptions {
  /** Opening width, outer leg to outer leg. Defaults to `4`. */
  span?: number;
  /** Straight rise before the arc springs. Defaults to `2`. */
  legHeight?: number;
  /**
   * Which arch the legs rise into. Defaults to `semicircle`. See {@link ArchStyle}.
   *
   * **The same seven names a doorway takes** — so an archway you walk through and the opening it frames
   * can be drawn from one curve. `square` gives a flat lintel on two posts, which is still a portal.
   *
   * Note what each style does where it MEETS the legs. `semicircle`, `elliptical`, `pointed` and `ogee`
   * all spring VERTICALLY, so they flow out of the legs with no corner. `segmental` and `horseshoe` do
   * not — they arrive at an angle and leave a visible break at the springing. That break is not an
   * artifact: it is the impost, and a real segmental arch has one.
   */
  arch?: ArchStyle;
  /**
   * Rise of the arch above the springing. Defaults to `span / 2` — a semicircle.
   *
   * A radius, not an angle, and it does not follow the span. Some styles override it: `square` has no
   * rise, `semicircle` forces `span / 2`.
   */
  archHeight?: number;
  /**
   * Cross-section carried around the arch. Defaults to `"bar"`.
   *
   * The path does not care. A rectangle gives a masonry band; a circle gives wrought iron tubing
   * arching over a gate. Same arc, same frames, same flat base caps — nothing else changes.
   */
  profile?: "bar" | "tube";
  /** Radial depth of the band. Bar only. Defaults to `0.4`. */
  thickness?: number;
  /** Depth out of the arch's plane. Bar only. Defaults to `0.5`. */
  depth?: number;
  /** Radius of the tube. Tube only. Defaults to `0.08`. */
  tubeRadius?: number;
  /** Sides of the tube. `4` gives square tubing, which is what wrought iron actually is. Defaults to `8`. */
  tubeSides?: number;
  /**
   * Smoothness of the arc — the low-poly knob. Defaults to `24`.
   *
   * Rounded UP to an even number for `pointed` and `ogee`, whose crown is a point sitting exactly
   * halfway along the arc: an odd count never samples it, and the tip gets chamfered off.
   */
  segments?: number;
  /** Stations along each straight leg. Defaults to `2`. */
  legSegments?: number;
}

/**
 * An archway — two straight legs rising into any of the named {@link ArchStyle} arches.
 *
 * A swept band, not a filled outline: this is the arch you walk *through*. (For an arched door or a
 * headstone — the same silhouette, filled — see `ArchedSlabGeometry`.) **Both draw from the same
 * `traceArch` curve**, so an archway and the doorway it frames agree by construction.
 *
 * Every station states its TANGENT, taken from the curve's own derivative rather than guessed from the
 * chord between neighbours. That is what lets the base caps sit perfectly flat on the floor. Estimate
 * them from chords instead and the first cap tilts by half a segment angle — the sort of error you fix
 * by nudging a parameter until it looks right without ever learning what was wrong.
 *
 * **A swept band tolerates corners; it tears only at reversals.** Nothing in this vocabulary reverses, so
 * every style sweeps — but two of them put a corner where the arc meets the leg (`segmental`,
 * `horseshoe`, which do not spring vertically), and two put one at the crown (`pointed`, `ogee`, which
 * come to a point). Those corners are joints, not bugs: an impost and a mitre.
 *
 * Set `legHeight: 0` and the arch stands on the floor by itself — still flat, because a `semicircle`,
 * `elliptical`, `pointed` or `ogee` arch all supply a vertical tangent at their springing.
 *
 * Local frame: spans X, rises +Y, and lies in the XY plane.
 *
 * @example
 * ```ts
 * const masonry = new ArchGeometry({ span: 4, legHeight: 2 });
 * const gateway = new ArchGeometry({ profile: "tube", tubeRadius: 0.06, tubeSides: 4 });
 * const persian = new ArchGeometry({ arch: "ogee", archHeight: 3 });
 * const moorish = new ArchGeometry({ arch: "horseshoe", archHeight: 2.6 });
 * ```
 */
/** The curve's own derivative at `u`, lifted into the arch's XY plane. */
function tangentAt(curve: Path, u: number): Vector3 {
  const tangent = curve.getTangentAt(u);
  return new Vector3(tangent.x, tangent.y, 0).normalize();
}

export class ArchGeometry extends BufferGeometry {
  readonly span: number;
  readonly legHeight: number;
  /** The arch drawn over the legs. */
  readonly arch: ArchStyle;
  /** Overall height, crown included. */
  readonly totalHeight: number;

  constructor({
    span = 4,
    legHeight = 2,
    arch = "semicircle",
    archHeight,
    profile = "bar",
    thickness = 0.4,
    depth = 0.5,
    tubeRadius = 0.08,
    tubeSides = 8,
    segments = 24,
    legSegments = 2,
  }: ArchGeometryOptions = {}) {
    super();

    const r = span / 2;
    // Ask the arch what it will ACTUALLY rise — a semicircle forces its own, a square head has none.
    const profileOptions = { style: arch, x: 0, y: legHeight, halfSpan: r, rise: archHeight ?? r };
    const rise = archRise(profileOptions);

    this.span = span;
    this.legHeight = legHeight;
    this.arch = arch;
    this.totalHeight = legHeight + rise;

    const path: PathPoint[] = [];

    const UP = new Vector3(0, 1, 0);
    const DOWN = new Vector3(0, -1, 0);

    // The arc: springs from the left leg, over the crown, and down to the right. Exactly the curve a
    // doorway of the same span and rise would be cut from — one vocabulary, two operations.
    const curve = new Path();
    curve.moveTo(-r, legHeight);
    traceArch(curve, { ...profileOptions, from: "left", to: "right" });

    const springTangent = tangentAt(curve, 0);
    const landTangent = tangentAt(curve, 1);

    // Does the arch actually leave the leg going straight up? A semicircle, an ellipse, a point and an
    // ogee all do. A segmental or horseshoe arch does NOT — it springs at an angle, and a square head
    // leaves horizontally.
    const springsVertically = springTangent.dot(UP) > 1 - 1e-6;
    const landsVertically = landTangent.dot(DOWN) > 1 - 1e-6;

    // Left leg: straight up. Zero curvature — where Frenet frames are undefined and transport is not.
    for (let i = 0; i < legSegments; i++) {
      path.push({
        position: new Vector3(-r, (i / legSegments) * legHeight, 0),
        tangent: UP.clone(),
      });
    }

    // When the arch does NOT spring vertically, pin one more station AT the springing still holding the
    // LEG's tangent. Without it the frame has to swing from vertical to the arc's angle across the whole
    // gap between the leg's last station and the arc's first — so the leg bends and creases inward over
    // its entire upper length instead of standing straight. With it, the whole turn happens in one place,
    // as a sharp joint. Which is what an impost IS: the block a segmental arch springs from.
    if (!springsVertically) {
      path.push({ position: new Vector3(-r, legHeight, 0), tangent: UP.clone() });
    }

    // `pointed` and `ogee` come to a POINT at the crown, and by symmetry that crown sits exactly halfway
    // along the arc. An ODD segment count never samples `u = 0.5`, so the tip is never visited and the
    // sweep chamfers flat across it — the point just disappears. Round up to even and it survives.
    const pointy = arch === "pointed" || arch === "ogee";
    const arcSegments = pointy && segments % 2 === 1 ? segments + 1 : segments;

    // Space the stations by ARC LENGTH, so an ogee's long flanks do not starve its point of segments.
    const stations = curve.getSpacedPoints(arcSegments);

    // A joint station STANDS ON the springing, so skip the arc sample that lands on the same point.
    //
    // This must be explicit. `transportFrames` silently drops coincident stations — and it drops the
    // LATER of the pair — so leaving both in place gives two different joints from one construction: at
    // the start the joint wins and the arc sample is dropped, at the end the arc sample wins and the
    // joint is dropped. The left leg comes out straight and the right one creases, which is exactly the
    // bug this fixes.
    const from = springsVertically ? 0 : 1;
    const to = landsVertically ? arcSegments : arcSegments - 1;

    for (let i = from; i <= to; i++) {
      const point = stations[i];
      path.push({
        position: new Vector3(point.x, point.y, 0),
        tangent: tangentAt(curve, i / arcSegments),
      });
    }

    // The same joint on the way down.
    if (!landsVertically) {
      path.push({ position: new Vector3(r, legHeight, 0), tangent: DOWN.clone() });
    }

    // Right leg: straight back down.
    for (let i = 1; i <= legSegments; i++) {
      path.push({
        position: new Vector3(r, legHeight - (i / legSegments) * legHeight, 0),
        tangent: DOWN.clone(),
      });
    }

    // For this planar path the normal comes out as +Z (out of plane) and the binormal as radial, so a
    // rectangle's first axis is the wall's depth and its second is the band's thickness.
    const section: Vec2[] =
      profile === "tube" ? circleProfile(tubeRadius, tubeSides) : rectProfile(thickness, depth);

    this.copy(sweep(section, transportFrames(path)));
  }
}

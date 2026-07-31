import { BufferGeometry, Vector3 } from "three";
import { miterFrames } from "../../sweep/MiterFrames";
import { moldingProfile, type MoldingStyle } from "../../sweep/MoldingProfiles";
import { sweep } from "../../sweep/Sweep";
import type { Vec2 } from "../../utils/GeometryBuffers";

/** Which corner the molding sits in, and therefore which way its face runs. */
export type MoldingRun = "crown" | "base";

/** Which side of the run the molding stands on. */
export type MoldingFacing = "inward" | "outward";

export interface MoldingGeometryOptions {
  /**
   * The CORNER LINE the molding follows — where wall meets ceiling for a crown, wall meets floor for a
   * base. One point per corner, in order. Two points is a single length; three is one corner; a whole
   * room is the footprint with `closed`.
   *
   * Lift a plan straight into one: `footprint.map((p) => new Vector3(p.x, ceilingY, p.y))`.
   */
  points: Vector3[];
  /** Close the run back onto its first point — a room, rather than a wall. Defaults to `false`. */
  closed?: boolean;
  /** Which section. Defaults to `"cove"`. See {@link MoldingStyle}. */
  style?: MoldingStyle;
  /**
   * A section of your own, overriding `style`. Any closed profile works — the corners never see it.
   *
   * Author it in the same corner axes {@link moldingProfile} uses: `x` runs along the wall, `y` out from
   * it, with the corner at the origin.
   */
  profile?: Vec2[];
  /** How far the molding runs along the wall. Defaults to `0.09`. */
  drop?: number;
  /** How far it stands out from the wall. Defaults to `0.09`. */
  projection?: number;
  /** How finely the section's face is cut — the low-poly knob. Defaults to `6`. */
  segments?: number;
  /**
   * Which corner this is. Defaults to `"crown"`.
   *
   * - `"crown"` — the corner line is at the CEILING and the molding hangs down from it.
   * - `"base"` — the corner line is at the FLOOR and the molding stands up from it. A baseboard, or a
   *   plinth. The identical section, flipped.
   *
   * Both take the same profile, because a molding's two backs do not care which surface is which.
   */
  run?: MoldingRun;
  /**
   * Which side of the run the molding stands on. Defaults to `"inward"` — a room, seen from inside.
   *
   * Honored **regardless of how the points are wound**: the run is measured against its own centre and
   * reversed if it came out facing the wrong way. A winding rule the caller has to remember is a rule
   * that silently produces molding facing into the wall.
   *
   * A perfectly straight run has no inside, so nothing is flipped there — reverse the points, or swap
   * this, if it lands on the wrong face.
   */
  facing?: MoldingFacing;
}

/**
 * Molding run along a wall line — crown at the ceiling, base at the floor.
 *
 * This is a sweep of a {@link moldingProfile} along the corner line, and the only interesting part is
 * what happens where two walls meet: the run is framed with {@link miterFrames}, so every corner is cut
 * on the plane bisecting it and the two lengths share one ring. The joint closes exactly, at any angle,
 * for any section — **the miter never sees the profile, because the corner is a property of the path.**
 *
 * A carpenter *copes* an inside corner rather than mitering it, but that is a tolerance trick for walls
 * that are not truly square. These walls are square, so the miter is exact.
 *
 * Real crown molding cut on a saw needs a COMPOUND miter — two settings, because the stock lies tilted
 * against the fence. That is an artifact of cutting flat: in world space the corner is a single vertical
 * plane through the bisector, which is what this builds and why nothing extra is needed for it.
 *
 * An open run gets a square cut at each end, which is a length dying into a doorway. A closed run has no
 * ends at all, and no caps.
 *
 * No origin of its own: it is drawn where its `points` are, so a run built from a room's footprint lands
 * in that room. Material groups: none — pass one material, not an array.
 *
 * @example
 * ```ts
 * const room = [
 *   new Vector3(-2, 2.4, -1.5),
 *   new Vector3(2, 2.4, -1.5),
 *   new Vector3(2, 2.4, 1.5),
 *   new Vector3(-2, 2.4, 1.5),
 * ];
 *
 * const cornice = new Mesh(new MoldingGeometry({ points: room, closed: true, style: "ogee" }), plaster);
 * ```
 */
export class MoldingGeometry extends BufferGeometry {
  constructor({
    points,
    closed = false,
    style = "cove",
    profile,
    drop = 0.09,
    projection = 0.09,
    segments = 6,
    run = "crown",
    facing = "inward",
  }: MoldingGeometryOptions) {
    super();

    if (points.length < 2) throw new Error("MoldingGeometry: a run needs at least two points.");

    const section = profile ?? moldingProfile({ style, drop, projection, segments });
    // The profile's `x` runs along the wall AWAY from the corner line, and `sweep` puts that on the
    // station's normal — so seeding the frame with DOWN hangs a crown, and with UP stands a base.
    const reference = new Vector3(0, run === "crown" ? -1 : 1, 0);

    const frame = (ordered: Vector3[]) =>
      miterFrames(
        ordered.map((position) => ({ position: position.clone(), tangent: new Vector3() })),
        { closed, reference },
      );

    // A crown seeds its frame with DOWN where a base seeds it with UP, and the binormal is `cut × normal`
    // — so flipping the reference also flips WHICH SIDE of the path the section projects to. Where the run
    // has an inside (a room, an L) the test below judges that and corrects it. A STRAIGHT run has no
    // inside, nothing is corrected, and the identical points would put a base in the room and a crown
    // inside the wall. Pre-flipping the traversal keeps the two agreeing.
    //
    // Reversing turns the frame 180° about its normal — a rotation, not a reflection — so the swept
    // surface keeps its winding either way.
    let ordered = run === "crown" ? [...points].reverse() : [...points];
    let stations = frame(ordered);

    // Which side the face lands on falls out of the traversal direction, which callers should not have
    // to reason about. Measure it instead: the binormal either points away from the run's own centre or
    // toward it, and `facing` says which is wanted. Reversing the point list turns the frame 180° about
    // its normal — a rotation, not a reflection, so the swept surface keeps its winding.
    const centre = ordered
      .reduce((sum, point) => sum.add(point), new Vector3())
      .divideScalar(ordered.length);
    const first = stations[0];
    if (first) {
      const away = first.binormal.dot(first.position.clone().sub(centre));
      // A straight run has no inside — its centre lies on the line, so the test is meaningless and
      // nothing is flipped.
      if (Math.abs(away) > 1e-6 && away > 0 === (facing === "inward")) {
        ordered = ordered.reverse();
        stations = frame(ordered);
      }
    }

    const geometry = sweep(section, stations, { closed });
    this.copy(geometry);
    geometry.dispose();
    this.computeBoundingSphere();
  }
}

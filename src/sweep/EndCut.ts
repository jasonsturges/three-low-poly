import { BufferAttribute, BufferGeometry, Vector3 } from "three";

/**
 * A plane bounding a member's end. `normal` points INTO the region the member is allowed to occupy.
 *
 * At a joint these are not arbitrary: the plane mitering member `i` against member `j` passes through the
 * shared point with normal `normalize(a_i - a_j)`, both axes pointing AWAY down their own member. Handing
 * `j` the same plane with the arguments swapped gives exactly the opposite normal, so two neighbours are
 * bounded by ONE surface from opposite sides and cannot leave a gap between them.
 */
export interface CutPlane {
  point: Vector3;
  normal: Vector3;
}

/** One ring point, where it landed, and which bounding plane claimed it. */
export interface CutPoint {
  /** Where this point started, on the member's own ring. */
  start: Vector3;
  /** Where it came to rest against the bounds. */
  end: Vector3;
  /** `0` or `1` for the plane it met, or `-1` for a point sitting exactly on the crease between them. */
  owner: number;
}

export interface CutEndOptions {
  /**
   * Which plane stops a ring point — the FIRST one met, or the LAST. Defaults to `"first"`.
   *
   * This single word is the whole difference between the two kinds of corner, and it is worth getting
   * right rather than guessing:
   *
   * - `"first"` — the member is landing INSIDE a corner, so it is bounded by whichever surface it reaches
   *   soonest and its end comes to a point reaching into the joint. The ARROWHEAD. A roof HIP, and any
   *   member mitered against its neighbours at a junction.
   * - `"last"` — the member wraps the OUTSIDE of a corner and may continue until it is behind both
   *   surfaces, so the end is notched instead of pointed. A roof VALLEY, and any reentrant corner.
   *
   * Geometrically the discriminator is whether the material is the INTERSECTION of the two half-spaces
   * (convex, `"first"`) or their UNION (reflex, `"last"`).
   */
  stopAt?: "first" | "last";
}

/**
 * How far along `axis` from `p` until `plane` is met. `Infinity` when the axis runs parallel to it.
 */
const hitDistance = (p: Vector3, axis: Vector3, plane: CutPlane): number => {
  const denominator = axis.dot(plane.normal);
  if (Math.abs(denominator) < 1e-9) return Infinity;
  return plane.point.clone().sub(p).dot(plane.normal) / denominator;
};

/**
 * Cut a member's end against TWO bounding planes — the general joint cut.
 *
 * Framing cannot reach this: one station is one ring is one plane, so a swept member can only ever be cut
 * square or by a single bevel. Lofting can. Every point of the member's ring runs along `axis` until it
 * meets a bounding plane, and each point takes whichever it meets first (or last — see
 * {@link CutEndOptions.stopAt}).
 *
 * **The crease is split exactly.** Where consecutive ring points disagree about which plane they meet, the
 * edge between them is divided precisely on the crossing. Without that split the band spanning the
 * disagreement is a single quad straddling both planes, and the ridge between the two facets comes out
 * smeared into a rounded band instead of a sharp line. The division is not searched for: with the axis
 * fixed, each distance is a linear function of position, so their difference is linear along a ring edge
 * and its root is one division.
 *
 * Returned points are in ring order with any crease points inserted, so consecutive entries are always
 * adjacent around the section — which is what {@link cutEndGeometry} relies on.
 *
 * @example
 * ```ts
 * // Two hips meeting at a roof apex: each cap is cut against its two neighbours.
 * const bound = (mine: Vector3, theirs: Vector3): CutPlane => ({
 *   point: apex,
 *   normal: mine.clone().sub(theirs).normalize(),
 * });
 * const points = cutEnd(ring, direction, [bound(mine, previous), bound(mine, next)]);
 * const geometry = cutEndGeometry(points, direction);
 * ```
 */
export function cutEnd(
  ring: Vector3[],
  axis: Vector3,
  planes: [CutPlane, CutPlane],
  { stopAt = "first" }: CutEndOptions = {},
): CutPoint[] {
  const distances = ring.map((p) => [hitDistance(p, axis, planes[0]), hitDistance(p, axis, planes[1])]);
  const pick = (t: number[]) => (stopAt === "first" ? (t[0]! <= t[1]! ? 0 : 1) : t[0]! >= t[1]! ? 0 : 1);

  const out: CutPoint[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const here = pick(distances[i]!);

    out.push({
      start: ring[i]!.clone(),
      end: ring[i]!.clone().addScaledVector(axis, distances[i]![here]!),
      owner: here,
    });
    if (here === pick(distances[j]!)) continue;

    const f0 = distances[i]![0]! - distances[i]![1]!;
    const f1 = distances[j]![0]! - distances[j]![1]!;
    const s = f0 / (f0 - f1);
    if (!Number.isFinite(s) || s <= 0 || s >= 1) continue;

    const crease = ring[i]!.clone().lerp(ring[j]!, s);
    out.push({
      start: crease,
      end: crease.clone().addScaledVector(axis, hitDistance(crease, axis, planes[0])),
      owner: -1,
    });
  }
  return out;
}

/**
 * The member itself, from one list of cut points: its square start, its sides, and its cut end.
 *
 * Non-indexed, so every facet keeps its own normal and shades flat.
 *
 * **The end is fanned ONE FAN PER FACET.** Fanning the whole loop would span both planes and emit
 * non-planar triangles — the crease is exactly where the cap has to be cut in two. A fan is safe within a
 * facet because each is the intersection of the member's convex section with one plane, and therefore
 * convex itself.
 */
export function cutEndGeometry(points: CutPoint[], axis: Vector3): BufferGeometry {
  const triangles: Vector3[][] = [];
  const count = points.length;

  // The sides. Each band is planar by construction: both of its ends travel along the SAME axis.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    triangles.push(
      [points[j]!.start, points[i]!.start, points[i]!.end],
      [points[j]!.start, points[i]!.end, points[j]!.end],
    );
  }

  // The start, square to the axis.
  for (let i = 1; i < count - 1; i++) {
    triangles.push([points[0]!.start, points[i]!.start, points[i + 1]!.start]);
  }

  const creases = points.map((p, i) => (p.owner === -1 ? i : -1)).filter((i) => i >= 0);
  if (creases.length === 2) {
    for (const [from, to] of [
      [creases[0]!, creases[1]!],
      [creases[1]!, creases[0]!],
    ]) {
      const arc: Vector3[] = [];
      for (let i = from; ; i = (i + 1) % count) {
        arc.push(points[i]!.end);
        if (i === to) break;
      }
      for (let i = 1; i < arc.length - 1; i++) {
        triangles.push([arc[0]!, arc[i + 1]!, arc[i]!]);
      }
    }
  } else {
    // No crossing: every point met the same plane, so this is an ordinary seat cut.
    for (let i = 1; i < count - 1; i++) {
      triangles.push([points[0]!.end, points[i + 1]!.end, points[i]!.end]);
    }
  }

  // A joint can consume a whole facet — a member fully overrun by a neighbour leaves coincident points.
  // A zero-area triangle contributes a zero-length normal, which lights as solid black rather than as
  // nothing at all, so they are dropped rather than emitted.
  const solid = triangles.filter(
    ([a, b, c]) => new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).length() > 1e-12,
  );

  const positions = new Float32Array(solid.length * 9);
  solid.forEach((triangle, i) => triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)));

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The plane mitering one member against another at a shared point.
 *
 * Both axes point AWAY from the joint, down their own member. The normal `normalize(a - b)` points into
 * `a`'s territory, since `(a - b) . a = 1 - a . b` is positive for any two members that are not parallel.
 *
 * **A miter closes only when this plane is a MIRROR of the whole member — axis, roll AND section.** Equal
 * angles are not enough and neither is equal size: two members of different WIDTH can still be mitered
 * cleanly, but not by this plane — that cut runs from the joint's outer corner to its inner corner
 * instead. Bisecting the axes is necessary, never sufficient.
 */
export function miterPlane(joint: Vector3, a: Vector3, b: Vector3): CutPlane {
  return { point: joint.clone(), normal: a.clone().sub(b).normalize() };
}

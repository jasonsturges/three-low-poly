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

/** Which planes bound each end of a segment cut at both ends. */
export interface SegmentBounds {
  start: [CutPlane, CutPlane];
  end: [CutPlane, CutPlane];
}

/**
 * A member cut at BOTH ends — the general case {@link cutEnd} does not cover.
 *
 * Any member with a joint at each end needs this: a roof RIDGE running between two junctions, a rail
 * between two posts, a lattice bar crossing two others. Cutting one end and squaring the other is not a
 * substitute, because the two ends can disagree at DIFFERENT places around the ring.
 *
 * **That disagreement is the whole reason this cannot be two calls to {@link cutEnd}.** Each end splits
 * the ring where its own bounding planes swap over, and those splits generally fall on different edges. A
 * ring split for only one end leaves the other's crease straddling a quad, which rounds it off. So every
 * crossing from BOTH ends is collected first, and the whole ring is evaluated at all of them.
 *
 * The ring is positioned wherever the caller put it; both ends are lofted from there, forward along
 * `axis` and backward against it.
 */
export function cutSegment(
  ring: Vector3[],
  axis: Vector3,
  { start, end }: SegmentBounds,
  { stopAt = "first" }: CutEndOptions = {},
): BufferGeometry {
  const backward = axis.clone().negate();
  const pick = (t: number[]) => (stopAt === "first" ? (t[0]! <= t[1]! ? 0 : 1) : t[0]! >= t[1]! ? 0 : 1);
  const distances = (p: Vector3, along: Vector3, planes: [CutPlane, CutPlane]) => [
    hitDistance(p, along, planes[0]),
    hitDistance(p, along, planes[1]),
  ];

  // Every crossing from both ends, as (edge index, fraction along it).
  const stations: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    stations.push([i, 0]);
    for (const [along, planes] of [
      [axis, end],
      [backward, start],
    ] as const) {
      const a = distances(ring[i]!, along, planes);
      const b = distances(ring[j]!, along, planes);
      if (pick(a) === pick(b)) continue;
      const f0 = a[0]! - a[1]!;
      const f1 = b[0]! - b[1]!;
      const s = f0 / (f0 - f1);
      if (Number.isFinite(s) && s > 1e-9 && s < 1 - 1e-9) stations.push([i, s]);
    }
  }
  stations.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const points = stations.map(([i, s]) => ring[i]!.clone().lerp(ring[(i + 1) % ring.length]!, s));
  const land = (p: Vector3, along: Vector3, planes: [CutPlane, CutPlane]) => {
    const t = distances(p, along, planes);
    const owner = pick(t);
    return { point: p.clone().addScaledVector(along, t[owner]!), owner };
  };
  const heads = points.map((p) => land(p, axis, end));
  const tails = points.map((p) => land(p, backward, start));

  const triangles: Vector3[][] = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    triangles.push(
      [tails[j]!.point, tails[i]!.point, heads[i]!.point],
      [tails[j]!.point, heads[i]!.point, heads[j]!.point],
    );
  }

  // Each end, ONE FAN PER FACET. A run that wraps past index 0 is one facet, not two, and each facet is
  // closed by the crease ending the PREVIOUS run — that point lies on both planes, so it is the only
  // vertex that can close the polygon without leaving its own plane.
  const fan = (landings: { point: Vector3; owner: number }[], flip: boolean) => {
    const runs: number[][] = [];
    for (let i = 0; i < count; i++) {
      const previous = landings[(i + count - 1) % count]!.owner;
      if (runs.length > 0 && landings[i]!.owner === previous) runs[runs.length - 1]!.push(i);
      else runs.push([i]);
    }
    if (runs.length > 1 && landings[runs[0]![0]!]!.owner === landings[runs[runs.length - 1]![0]!]!.owner) {
      runs[0] = [...runs.pop()!, ...runs[0]!];
    }
    const emit = (arc: Vector3[]) => {
      for (let i = 1; i < arc.length - 1; i++) {
        const tri = [arc[0]!, arc[i]!, arc[i + 1]!];
        triangles.push(flip ? [tri[0]!, tri[2]!, tri[1]!] : tri);
      }
    };
    if (runs.length < 2) {
      emit(landings.map((p) => p.point));
      return;
    }
    runs.forEach((run, r) => {
      const previous = runs[(r + runs.length - 1) % runs.length]!;
      emit([landings[previous[previous.length - 1]!]!.point, ...run.map((i) => landings[i]!.point)]);
    });
  };
  fan(heads, false);
  fan(tails, true);

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

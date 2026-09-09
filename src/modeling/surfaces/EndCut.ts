import { BufferAttribute, BufferGeometry, Vector3 } from "three";

/**
 * Member-end plane whose normal points into the allowed region. For unit outward member axes,
 * a shared miter normal is normalize(a_i - a_j); swapping axes reverses it.
 */
export interface CutPlane {
  point: Vector3;
  normal: Vector3;
}

/** Original ring point, projected endpoint, and selected bounding-plane index. */
export interface CutPoint {
  /** Source ring position. */
  start: Vector3;
  /** Projected endpoint. */
  end: Vector3;
  /** `0` or `1` for the plane it met, or `-1` for a point sitting exactly on the crease between them. */
  owner: number;
}

export interface CutEndOptions {
  /**
 * first selects the smaller axis parameter (intersection of halfspaces); last selects the larger (union).
 * Use finite forward hits from ring points inside both bounds.
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
 * Project an ordered ring along axis to two bounding planes, inserting points where plane ownership changes.
 * Hit-distance differences are linear along an edge, so crease fraction is f0 / (f0 - f1); avoid parallel axes.
 *
 * ```ts
 * // Two hips meeting at a roof apex: each cap is cut against its two neighbors.
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
 * Build flat-shaded, nonindexed sides and caps from CutPoints; requires a convex source section.
 * Each planar end facet is fanned separately; axis is accepted but unused.
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

  // Discard collapsed triangles before computing face normals.
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
 * For unit axes pointing away from joint, normal = normalize(a - b), with (a - b) · a = 1 - a · b > 0.
 * A closing joint requires mirrored section and roll as well as axes; distinct axes are required.
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
 * Project a convex ring to two bounds at each end, along ±axis, splitting at both ends’ crease crossings.
 * Returns a flat-shaded nonindexed solid; selected hits must be finite and lie in the intended direction.
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

  // Merge owner runs across the seam; the previous run’s crease closes each planar facet.
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

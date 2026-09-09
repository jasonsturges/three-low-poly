import { ShapeUtils, Vector2 } from "three";

export interface TriangulateRegionOptions {
  /** Uniform midpoint subdivisions, 0–5. Triangle count grows by four per level. Default 0. */
  subdivisions?: number;
  /** Improve interior edges with up to 40 Delaunay-flip passes. Boundary edges stay fixed. Default true. */
  improveTriangles?: boolean;
}

export interface TriangulatedRegion {
  /** Owned points in the same coordinate system as the input. */
  points: Vector2[];
  /** Counter-clockwise triangles referencing points. */
  triangles: [number, number, number][];
  /** Counter-clockwise outer boundary, without a repeated closing index. */
  outline: number[];
  /** Clockwise hole boundaries, in input hole order, without repeated closing indices. */
  holes: number[][];
}

type Triangle = [number, number, number];

/**
 * Triangulate a planar region with holes, refine its triangles and retain corresponding boundary
 * loops. Map these points onto a curved surface, or use the loops to attach thickness or frames.
 * Input loops are cloned. Either winding and an optional repeated closing point are accepted.
 *
 * Loops must be simple, nondegenerate and disjoint, with holes strictly inside the outline and no
 * nested holes. Redundant collinear corners are rejected. This is region meshing, not a boolean
 * operation or a general constrained-Delaunay solver; the bounded improvement pass is heuristic.
 * Coordinates are normalized internally so geometric tolerances are independent of model scale.
 */
export function triangulateRegion(
  contour: readonly Vector2[],
  cutouts: readonly (readonly Vector2[])[] = [],
  { subdivisions = 0, improveTriangles = true }: TriangulateRegionOptions = {},
): TriangulatedRegion {
  if (!Number.isInteger(subdivisions) || subdivisions < 0 || subdivisions > 5) {
    throw new RangeError("triangulateRegion: subdivisions must be an integer from 0 to 5.");
  }
  const loops = [contour, ...cutouts].map((loop) => {
    const copy = loop.map((p) => p.clone());
    if (copy.length > 1 && copy[0].equals(copy[copy.length - 1])) copy.pop();
    if (copy.length < 3 || copy.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      throw new RangeError("triangulateRegion: each loop needs at least three finite points.");
    }
    return copy;
  });
  const min = new Vector2(Infinity, Infinity),
    max = new Vector2(-Infinity, -Infinity);
  for (const loop of loops)
    for (const p of loop) {
      min.min(p);
      max.max(p);
    }
  const scale = Math.max(max.x - min.x, max.y - min.y);
  if (!(scale > 0) || !Number.isFinite(scale)) throw new RangeError("triangulateRegion: invalid extent.");
  for (const loop of loops) for (const p of loop) p.sub(min).divideScalar(scale);
  validateLoops(loops);
  // Establish an explicit winding contract for both surfaces and attached walls.
  loops.forEach((loop, i) => {
    if (ShapeUtils.isClockWise(loop) !== i > 0) loop.reverse();
  });
  const [outline, ...holes] = loops;
  const points = [...outline, ...holes.flat()];
  let triangles = ShapeUtils.triangulateShape(outline, holes) as Triangle[];
  let offset = 0;
  let boundaries = [outline, ...holes].map((hole) => {
    const ring = hole.map((_, i) => offset + i);
    offset += hole.length;
    return ring;
  });

  for (let level = 0; level < subdivisions; level++) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      let index = midpoints.get(key);
      if (index === undefined) {
        index = points.length;
        points.push(points[a].clone().add(points[b]).multiplyScalar(0.5));
        midpoints.set(key, index);
      }
      return index;
    };
    triangles = triangles.flatMap(([a, b, c]): Triangle[] => {
      const ab = midpoint(a, b),
        bc = midpoint(b, c),
        ca = midpoint(c, a);
      return [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ];
    });
    boundaries = boundaries.map((ring) => ring.flatMap((a, i) => [a, midpoint(a, ring[(i + 1) % ring.length])]));
  }

  // Ear clipping creates long diagonals around the holes. After subdivision, flip interior
  // edges toward a Delaunay triangulation in parameter space: skinny triangles otherwise fold
  // visibly across ribs when wrapped. Boundary edges (including holes) never move.
  const orient = (a: number, b: number, c: number) =>
    (points[b].x - points[a].x) * (points[c].y - points[a].y) - (points[b].y - points[a].y) * (points[c].x - points[a].x);
  for (let pass = 0; pass < (improveTriangles ? 40 : 0); pass++) {
    const edges = new Map<string, { triangle: number; c: number }>();
    const changed = new Set<number>();
    for (let t = 0; t < triangles.length; t++) {
      if (changed.has(t)) continue;
      const triangle = triangles[t];
      for (let e = 0; e < 3; e++) {
        const a = triangle[e],
          b = triangle[(e + 1) % 3],
          c = triangle[(e + 2) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const other = edges.get(key);
        if (!other) {
          edges.set(key, { triangle: t, c });
          continue;
        }
        if (changed.has(other.triangle)) continue;
        const d = other.c;
        if (orient(c, d, b) <= 1e-12 || orient(d, c, a) <= 1e-12) continue;
        const ax = points[a].x - points[d].x,
          ay = points[a].y - points[d].y;
        const bx = points[b].x - points[d].x,
          by = points[b].y - points[d].y;
        const cx = points[c].x - points[d].x,
          cy = points[c].y - points[d].y;
        const inCircle =
          (ax * ax + ay * ay) * (bx * cy - by * cx) -
          (bx * bx + by * by) * (ax * cy - ay * cx) +
          (cx * cx + cy * cy) * (ax * by - ay * bx);
        if (inCircle <= 1e-12) continue;
        triangles[t] = [c, d, b];
        triangles[other.triangle] = [d, c, a];
        changed.add(t);
        changed.add(other.triangle);
        break;
      }
    }
    if (changed.size === 0) break;
  }

  for (const p of points) p.multiplyScalar(scale).add(min);
  return { points, triangles, outline: boundaries[0], holes: boundaries.slice(1) };
}

/** Validation happens before subdivision, while the user-authored boundaries are small. */
function validateLoops(loops: Vector2[][]): void {
  const epsilon = 1e-12;
  const turn = (a: Vector2, b: Vector2, c: Vector2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSegment = (a: Vector2, b: Vector2, p: Vector2) =>
    Math.abs(turn(a, b, p)) <= epsilon &&
    p.x >= Math.min(a.x, b.x) - epsilon &&
    p.x <= Math.max(a.x, b.x) + epsilon &&
    p.y >= Math.min(a.y, b.y) - epsilon &&
    p.y <= Math.max(a.y, b.y) + epsilon;
  const intersects = (a: Vector2, b: Vector2, c: Vector2, d: Vector2) => {
    const abC = turn(a, b, c),
      abD = turn(a, b, d),
      cdA = turn(c, d, a),
      cdB = turn(c, d, b);
    return (
      (((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon)) &&
        ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon))) ||
      onSegment(a, b, c) ||
      onSegment(a, b, d) ||
      onSegment(c, d, a) ||
      onSegment(c, d, b)
    );
  };
  const inside = (p: Vector2, loop: Vector2[]) => {
    let result = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i],
        b = loop[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) result = !result;
    }
    return result;
  };
  for (let l = 0; l < loops.length; l++) {
    const loop = loops[l];
    if (Math.abs(ShapeUtils.area(loop)) <= epsilon) throw new RangeError("triangulateRegion: degenerate loop.");
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i],
        b = loop[(i + 1) % loop.length];
      if (Math.abs(turn(a, b, loop[(i + 2) % loop.length])) <= epsilon) {
        throw new RangeError("triangulateRegion: duplicate or collinear corners.");
      }
      for (let m = l; m < loops.length; m++) {
        const other = loops[m];
        for (let j = m === l ? i + 1 : 0; j < other.length; j++) {
          if (m === l && (j === (i + 1) % loop.length || (j + 1) % loop.length === i)) continue;
          if (intersects(a, b, other[j], other[(j + 1) % other.length])) {
            throw new RangeError("triangulateRegion: boundaries must not cross or touch.");
          }
        }
      }
    }
    if (
      l > 0 &&
      (!inside(loop[0], loops[0]) || loops.slice(1, l).some((other) => inside(loop[0], other) || inside(other[0], loop)))
    ) {
      throw new RangeError("triangulateRegion: holes must lie inside the outline without nesting.");
    }
  }
}

import { Vector2 } from "three";

/**
 * Offset a CCW loop: positive distance expands, negative contracts; repeated closing points are removed.
 * Miters beyond miterLimit × |distance| bevel; right-angle miter ratio is √2 ≈ 1.41. No global intersection repair.
 *
 * ```ts
 * const outline = openingOutline(opening).getPoints(48);
 * const outer = offsetLoop(outline, 0.06);   // the frame's outer edge, out on the wall
 * const inner = offsetLoop(outline, -0.03);  // its inner edge, biting into the aperture
 * ```
 */
export function offsetLoop(points: Vector2[], distance: number, miterLimit = 4): Vector2[] {
  // Remove zero-length edges before calculating normals.
  const loop = points.filter((p, i) => i === 0 || p.distanceToSquared(points[i - 1]!) > 1e-12);
  if (loop.length > 1 && loop[0]!.distanceToSquared(loop[loop.length - 1]!) < 1e-12) loop.pop();

  const count = loop.length;
  if (count < 3 || distance === 0) return loop.map((p) => p.clone());

  // The outward normal of an edge, for a counter-clockwise loop: turn its direction right.
  const normals = loop.map((p, i) => {
    const next = loop[(i + 1) % count]!;
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const length = Math.hypot(dx, dy) || 1;
    return new Vector2(dy / length, -dx / length);
  });

  const offset: Vector2[] = [];

  loop.forEach((p, i) => {
    const into = normals[(i - 1 + count) % count]!; // the edge arriving here
    const outOf = normals[i]!; // the edge leaving

    const bisector = new Vector2().addVectors(into, outOf);
    if (bisector.lengthSq() < 1e-12) {
      // A full reversal — the miter is infinite. Bevel across the two offset edges.
      offset.push(p.clone().addScaledVector(into, distance), p.clone().addScaledVector(outOf, distance));
      return;
    }
    bisector.normalize();

    // cos is the cosine of the normals' half-angle; 1/|cos| is the miter-length ratio.
    // Beyond the limit, join the offset edge endpoints with a bevel.
    const cos = bisector.dot(outOf);
    if (Math.abs(cos) < 1e-6 || 1 / Math.abs(cos) > miterLimit) {
      offset.push(p.clone().addScaledVector(into, distance), p.clone().addScaledVector(outOf, distance));
      return;
    }

    offset.push(p.clone().addScaledVector(bisector, distance / cos));
  });

  // Heuristic: discard points closer than |distance| to a source vertex.
  // This tests vertex distance, not edge distance or self-intersections; keep the offset if fewer than three survive.
  const reach = Math.abs(distance) * (1 - 1e-3);
  const kept = offset.filter((p) => nearest(p, loop) >= reach);

  return kept.length >= 3 ? kept : offset;
}

/** Distance from a point to the closest vertex of a loop. */
function nearest(point: Vector2, loop: Vector2[]): number {
  let best = Infinity;
  for (const q of loop) best = Math.min(best, point.distanceToSquared(q));
  return Math.sqrt(best);
}

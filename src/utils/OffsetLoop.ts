import { Vector2 } from "three";

/**
 * Push a closed outline outward (or inward) by a fixed distance — the operation behind every RING.
 *
 * **An offset arch is not an arch.** Shrink an ellipse's radii and you do not get its offset curve; you
 * get a different ellipse that is closer in some places than others. Same for an ogee, a pointed arch,
 * anything but a circle. So a frame that hugs an opening at a constant width cannot be built by tweaking
 * the opening's parameters — it has to be built by offsetting the CURVE.
 *
 * Which is fine, because the curve is already a polyline by the time anyone wants a ring out of it. This
 * takes points and returns points; it owns nothing.
 *
 * Each vertex moves along the BISECTOR of its two edge normals, far enough that both offset edges pass
 * through it — a mitre. At a sharp corner that distance runs away (a 180° turn needs an infinite spike),
 * so it is capped, exactly as a stroke's mitre limit is.
 *
 * @param points a CLOSED loop, wound counter-clockwise. Do not repeat the first point.
 * @param distance positive pushes OUT, negative pulls IN.
 *
 * @example
 * ```ts
 * const outline = openingOutline(opening).getPoints(48);
 * const outer = offsetLoop(outline, 0.06);   // the frame's outer edge, out on the wall
 * const inner = offsetLoop(outline, -0.03);  // its inner edge, biting into the aperture
 * ```
 */
export function offsetLoop(points: Vector2[], distance: number, miterLimit = 4): Vector2[] {
  // A repeated point has no edge, and no edge has no normal. `closePath()` and curve joins both produce
  // them, so this is not hypothetical.
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

  const limit = Math.abs(distance) * miterLimit;

  const offset = loop.map((p, i) => {
    const into = normals[(i - 1 + count) % count]!; // the edge arriving here
    const outOf = normals[i]!; // the edge leaving

    const bisector = new Vector2().addVectors(into, outOf);
    if (bisector.lengthSq() < 1e-12) return p.clone(); // a full reversal — nowhere sensible to go
    bisector.normalize();

    // How far along the bisector both offset edges meet. `cos` is the half-angle between the normals.
    const cos = bisector.dot(outOf);
    const reach = Math.abs(cos) < 1e-6 ? limit : distance / cos;
    const capped = Math.max(-limit, Math.min(limit, reach));

    return p.clone().addScaledVector(bisector, capped);
  });

  // **An offset FOLDS at a corner sharper than it is wide.** Pull a loop inward past a point — an ogee's
  // crown, say — and the two offset edges cross: the polyline doubles back through itself and ties a tiny
  // knot, which shows up as the frame pinching to nothing right under the tip.
  //
  // The folded points give themselves away. A true offset point is EXACTLY `distance` from the outline —
  // it cannot be nearer. Anything that comes back closer than that has been carried through the curve by
  // the fold. Drop those, and the fold closes into the chord that should have been there.
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

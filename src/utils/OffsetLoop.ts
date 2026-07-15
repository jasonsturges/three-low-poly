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
 * Each vertex offsets with a JOIN, exactly as a stroked path does — the Cairo / SVG model. Most corners
 * MITRE: the two offset edges are extended until they meet at a point. But at a sharp corner that point
 * runs away (a true cusp needs an infinite spike), so past a `miterLimit` the join BEVELS instead —
 * emitting the two offset-edge endpoints and cutting straight across between them.
 *
 * **A clamped mitre is not a bevel.** Shortening the spike's length leaves a shorter spike that no longer
 * reaches either edge; the corner is still a needle, just a stubbier one. The fix is to change the JOIN,
 * not the distance — which is why a sharp ogee point blunts cleanly here rather than growing a thorn.
 *
 * @param points a CLOSED loop, wound counter-clockwise. Do not repeat the first point.
 * @param distance positive pushes OUT, negative pulls IN.
 * @param miterLimit how far a mitre may reach, as a multiple of `distance`, before it bevels. The SVG
 *   default is `4`; lower blunts sharp corners sooner. A right angle reaches `1.41`, so anything above
 *   that keeps square corners sharp.
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

  const offset: Vector2[] = [];

  loop.forEach((p, i) => {
    const into = normals[(i - 1 + count) % count]!; // the edge arriving here
    const outOf = normals[i]!; // the edge leaving

    const bisector = new Vector2().addVectors(into, outOf);
    if (bisector.lengthSq() < 1e-12) {
      // A full reversal — the mitre is infinite. Bevel across the two offset edges.
      offset.push(p.clone().addScaledVector(into, distance), p.clone().addScaledVector(outOf, distance));
      return;
    }
    bisector.normalize();

    // `cos` is the half-angle between the two edge normals; `1/cos` is how far the mitre reaches, as a
    // multiple of `distance`. Past the limit, a mitre would be a spike — so bevel instead, joining the
    // two offset-edge endpoints with a straight cut across the corner.
    const cos = bisector.dot(outOf);
    if (Math.abs(cos) < 1e-6 || 1 / Math.abs(cos) > miterLimit) {
      offset.push(p.clone().addScaledVector(into, distance), p.clone().addScaledVector(outOf, distance));
      return;
    }

    offset.push(p.clone().addScaledVector(bisector, distance / cos));
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

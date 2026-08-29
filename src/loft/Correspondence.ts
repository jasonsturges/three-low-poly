import { Vector2, Vector3 } from "three";

/**
 * How to reconcile sections with different vertex counts.
 *
 * `arclength`  Uniform spacing along the perimeter. The general answer, and the only one of the three
 *              that is indifferent to how an outline happened to be tessellated.
 * `index`      Proportional index, `loop[floor(i * n / count)]`. Cheap, and it never invents a point the
 *              author did not write — but it lands several output points on the same input vertex when
 *              upsampling, so the rails bunch at the corners and the bands between them collapse. A
 *              square resampled to 32 comes back as 4 distinct points and 28 zero-length edges.
 * `angular`    Uniform angle about the centroid. Exact on a star-convex section and the natural pairing
 *              between two circles, but a ray from the centroid can miss a concave outline or cross it
 *              more than once, and then there is no answer to return rather than a poor one.
 */
export type ResampleMethod = "arclength" | "index" | "angular";

export interface CorrespondOptions {
  /**
   * Points every loop is brought to. Defaults to the largest authored count.
   *
   * That default resamples UP, which invents positions along edges that are genuinely there. Resampling
   * DOWN would discard authored corners and quietly round the shape, which is a much worse failure to
   * ship silently.
   */
  count?: number;
  /** How the reconciliation is done. Defaults to `arclength`. */
  method?: ResampleMethod;
}

/** Cumulative edge lengths around a closed loop, plus its perimeter. */
function perimeter(loop: Vector2[]): { runs: number[]; total: number } {
  const runs = [0];
  let total = 0;

  for (let i = 0; i < loop.length; i++) {
    total += loop[i]!.distanceTo(loop[(i + 1) % loop.length]!);
    runs.push(total);
  }

  return { runs, total };
}

/**
 * Resample a closed outline to exactly `count` points — the half of correspondence that makes a pairing
 * POSSIBLE at all.
 *
 * Two sections with different vertex counts cannot be paired index to index, so something has to give.
 * Every method returns `count` points on the same outline and they disagree only about WHERE, which is
 * the entire quality of the loft. See {@link ResampleMethod} for what each one trades away.
 *
 * @example
 * ```ts
 * const circle = resampleLoop(squareOutline, 32);        // arc length: 32 evenly spaced points
 * const corners = resampleLoop(squareOutline, 32, "index"); // 4 distinct points, 28 collapsed edges
 * ```
 */
export function resampleLoop(loop: Vector2[], count: number, method: ResampleMethod = "arclength"): Vector2[] {
  const n = loop.length;
  if (n === 0 || count <= 0) return [];
  if (n === count && method === "index") return loop.map((p) => p.clone());

  if (method === "index") {
    return Array.from({ length: count }, (_, i) => loop[Math.floor((i * n) / count)]!.clone());
  }

  if (method === "angular") {
    const centroid = loop.reduce((sum, p) => sum.add(p), new Vector2()).divideScalar(n);
    // The angle the loop STARTS at, so resampling keeps the authored seam instead of snapping it to +X.
    // Without this the method would silently re-align every section it touched, which is alignment's job.
    const start = Math.atan2(loop[0]!.y - centroid.y, loop[0]!.x - centroid.x);

    return Array.from({ length: count }, (_, i) => {
      const theta = start + (i / count) * Math.PI * 2;
      const rx = Math.cos(theta);
      const ry = Math.sin(theta);

      // Walk every edge and keep the nearest forward hit. Taking the FIRST crossing is the answer a
      // ray-cast pairing is entitled to on a concave outline; it is not a good one, which is why the
      // method is documented as star-convex only.
      let best = Infinity;
      for (let e = 0; e < n; e++) {
        const a = loop[e]!;
        const b = loop[(e + 1) % n]!;
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const denominator = rx * ey - ry * ex;
        if (Math.abs(denominator) < 1e-12) continue;

        const dx = a.x - centroid.x;
        const dy = a.y - centroid.y;
        const t = (dx * ey - dy * ex) / denominator;
        const u = (dx * ry - dy * rx) / denominator;
        if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
      }

      return Number.isFinite(best)
        ? new Vector2(centroid.x + rx * best, centroid.y + ry * best)
        : loop[0]!.clone();
    });
  }

  const { runs, total } = perimeter(loop);
  if (total < 1e-12) return Array.from({ length: count }, () => loop[0]!.clone());

  return Array.from({ length: count }, (_, i) => {
    const target = (i / count) * total;
    let e = 0;
    while (e < n - 1 && runs[e + 1]! < target) e++;
    const span = runs[e + 1]! - runs[e]!;
    const t = span < 1e-12 ? 0 : (target - runs[e]!) / span;
    return loop[e]!.clone().lerp(loop[(e + 1) % n]!, t);
  });
}

/**
 * Bring a set of outlines to one vertex count, so they can be lofted.
 *
 * The convenience over calling {@link resampleLoop} per loop is the default `count`: the largest authored
 * count, which resamples up rather than down. See {@link CorrespondOptions.count} for why that direction
 * is the safe one.
 *
 * This settles only how many points there are and where they sit. It does not decide WHICH point pairs
 * with which — that is {@link alignRings}, and nothing about the geometry decides it for you.
 */
export function correspondLoops(loops: Vector2[][], { count, method = "arclength" }: CorrespondOptions = {}): Vector2[][] {
  if (loops.length === 0) return [];
  const target = count ?? Math.max(...loops.map((loop) => loop.length));
  return loops.map((loop) => resampleLoop(loop, target, method));
}

/** Cycle a ring's start index. The geometry is untouched — only which point is called number zero. */
export function rotateRing(ring: Vector3[], offset: number): Vector3[] {
  const n = ring.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return Array.from({ length: n }, (_, i) => ring[(i + k) % n]!.clone());
}

/**
 * The cyclic offset of `b` that pairs it most tightly against `a` — shortest total rail length.
 *
 * Shortest rails is the discrete form of "do not twist the skin", and it recovers the obvious pairing
 * without being told anything about shape. It is O(n²) and entirely fine at section counts.
 *
 * It is not infallible, and the failure is worth knowing: on a section with rotational symmetry several
 * offsets tie exactly, so on two identical 24-gons an authored offset of 12 ties with the 180°-wrong
 * answer. Symmetry is what makes the tie, and no metric on positions alone can break it.
 *
 * **Rail length answers ALIGNMENT and not resampling.** Asked to score a resampling instead, it gets the
 * answer backwards: proportional index beats arc length on a square-to-circle loft precisely because
 * collapsing 32 points onto 4 corners makes those rails short. Use it for where the seam goes, given a
 * fixed set of points; it says nothing about whether those points were worth having.
 */
export function bestRingOffset(a: Vector3[], b: Vector3[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  let best = 0;
  let shortest = Infinity;

  for (let k = 0; k < b.length; k++) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i]!.distanceTo(b[(i + k) % b.length]!);
    if (sum < shortest) {
      shortest = sum;
      best = k;
    }
  }

  return best;
}

/**
 * Align a sequence of rings so each pairs tightly with the one before it — the half of correspondence
 * that decides WHERE THE SEAM GOES.
 *
 * Nothing in the geometry decides this. Two sections can be identical point for point and in the same
 * order, differing only in which point is called index 0, and skinning them naively gives a twisted prism
 * instead of a cylinder. That is the cleanest statement of why alignment is a separate step: a loft
 * twists when the correspondence is wrong, the way a sweep twists when the frame is wrong.
 *
 * Each ring is aligned against its already-aligned PREDECESSOR rather than against ring 0, because a
 * long loft turns gradually and only neighbors are reliably comparable. Ring 0 is left alone, so the
 * authored seam is the reference rather than something this function invents.
 */
export function alignRings(rings: Vector3[][]): Vector3[][] {
  if (rings.length === 0) return [];

  const aligned: Vector3[][] = [rings[0]!.map((p) => p.clone())];

  for (let s = 1; s < rings.length; s++) {
    const previous = aligned[s - 1]!;
    const offset = previous.length === rings[s]!.length ? bestRingOffset(previous, rings[s]!) : 0;
    aligned.push(rotateRing(rings[s]!, offset));
  }

  return aligned;
}

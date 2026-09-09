import { Vector2, Vector3 } from "three";

/**
 * arclength samples perimeter distance; index selects loop[floor(i * n / count)] and can duplicate vertices.
 * angular takes nearest centroid-ray hits, falling back to the first point when a ray misses.
 */
export type ResampleMethod = "arclength" | "index" | "angular";

export interface CorrespondOptions {
  /** Requested output point count; resampling can omit authored corners. */
  count?: number;
  /** Resampling method for each input loop. */
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
 * Return count samples of a closed outline without a repeated endpoint. Empty input or count ≤ 0 returns [].
 * Angular sampling assumes a star-shaped outline about its centroid; index upsampling repeats vertices.
 *
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
    // Use the first vertex’s centroid angle as the seam reference.
    const start = Math.atan2(loop[0]!.y - centroid.y, loop[0]!.x - centroid.x);

    return Array.from({ length: count }, (_, i) => {
      const theta = start + (i / count) * Math.PI * 2;
      const rx = Math.cos(theta);
      const ry = Math.sin(theta);

      // Keep the nearest forward edge hit; concave outlines can have multiple crossings.
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

/** Resample outlines to a common point count; seam alignment and winding remain unchanged. */
export function correspondLoops(loops: Vector2[][], { count, method = "arclength" }: CorrespondOptions = {}): Vector2[][] {
  if (loops.length === 0) return [];
  const target = count ?? Math.max(...loops.map((loop) => loop.length));
  return loops.map((loop) => resampleLoop(loop, target, method));
}

/** Return cloned ring points with the start index shifted cyclically; offset must be an integer. */
export function rotateRing(ring: Vector3[], offset: number): Vector3[] {
  const n = ring.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return Array.from({ length: n }, (_, i) => ring[(i + k) % n]!.clone());
}

/**
 * Choose the cyclic offset minimizing summed a[i]-to-b[(i+k) % n] distance in O(n²) for equal counts.
 * Ties retain the first offset; winding is never reversed.
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
 * Clone rings and cyclically align each to its aligned predecessor; the first seam stays fixed.
 * Unequal neighboring counts keep their order; winding is never reversed.
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

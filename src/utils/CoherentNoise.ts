/**
 * Coherent value noise + fbm — the shared core for baking procedural detail into
 * real geometry. Coherence is the whole point: neighboring samples return nearby
 * values, so vertices displaced by these functions move together and faces never
 * tear the way independent per-vertex random offsets do.
 *
 * - {@link fbm2} — heightfields (terrain: `Y = f(x, z)`).
 * - {@link fbm3} — surfaces displaced in 3D (boulders: push along the normal).
 */

/** 32-bit integer hash → [0, 1). Deterministic per lattice cell + seed. */
function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h =
    Math.imul(ix | 0, 374761393) ^
    Math.imul(iy | 0, 668265263) ^
    Math.imul(iz | 0, 1274126177) ^
    Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smoothly interpolated 2D value noise on a unit lattice → [0, 1). */
function valueNoise2(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = smooth(x - x0);
  const v = smooth(y - y0);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return nx0 + (nx1 - nx0) * v;
}

/** Smoothly interpolated 3D value noise on a unit lattice → [0, 1). */
function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const u = smooth(x - x0);
  const v = smooth(y - y0);
  const w = smooth(z - z0);
  const c000 = hash3(x0, y0, z0, seed);
  const c100 = hash3(x0 + 1, y0, z0, seed);
  const c010 = hash3(x0, y0 + 1, z0, seed);
  const c110 = hash3(x0 + 1, y0 + 1, z0, seed);
  const c001 = hash3(x0, y0, z0 + 1, seed);
  const c101 = hash3(x0 + 1, y0, z0 + 1, seed);
  const c011 = hash3(x0, y0 + 1, z0 + 1, seed);
  const c111 = hash3(x0 + 1, y0 + 1, z0 + 1, seed);
  const x00 = c000 + (c100 - c000) * u;
  const x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u;
  const x11 = c011 + (c111 - c011) * u;
  const y0v = x00 + (x10 - x00) * v;
  const y1v = x01 + (x11 - x01) * v;
  return y0v + (y1v - y0v) * w;
}

/**
 * 2D fractal Brownian motion → roughly [-1, 1]. Each octave doubles frequency and
 * scales amplitude by `persistence`, with its own seed offset so layers don't
 * correlate. Normalized by total amplitude so the range is stable across octave counts.
 */
export function fbm2(x: number, y: number, seed: number, octaves: number, persistence: number): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += (valueNoise2(x * frequency, y * frequency, seed + o * 101) * 2 - 1) * amplitude;
    norm += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

/** 3D fractal Brownian motion → roughly [-1, 1]. The 3D counterpart to {@link fbm2}. */
export function fbm3(
  x: number,
  y: number,
  z: number,
  seed: number,
  octaves: number,
  persistence: number,
): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum +=
      (valueNoise3(x * frequency, y * frequency, z * frequency, seed + o * 101) * 2 - 1) * amplitude;
    norm += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

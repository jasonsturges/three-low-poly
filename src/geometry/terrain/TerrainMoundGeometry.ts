import { BufferAttribute, BufferGeometry } from "three";
import { fbm2 } from "../../utils/CoherentNoise";

export interface TerrainMoundGeometryOptions {
  /** Footprint radius (world units). Defaults to `8`. */
  radius?: number;
  /** Dome peak height at the center. Defaults to `1.2`. */
  height?: number;
  /** Concentric rings from center to rim. Defaults to `40`. */
  radialSegments?: number;
  /** Segments around the circumference. Defaults to `64`. */
  angularSegments?: number;
  /** Amplitude of the terrain relief added on top of the dome. Defaults to `0.5`. */
  noiseHeight?: number;
  /** Noise frequency — higher packs more, smaller bumps into the footprint. Defaults to `0.35`. */
  noiseScale?: number;
  /** fbm octaves (detail layers). Defaults to `4`. */
  octaves?: number;
  /** fbm gain per octave (0–1); lower is smoother, higher is rougher. Defaults to `0.5`. */
  persistence?: number;
  /** Normalized radius (0–1) where the rim begins fading relief to a flat edge. Defaults to `0.82`. */
  rim?: number;
  /** Seed for reproducible terrain. Defaults to `1`. */
  seed?: number;
}

/**
 * Rounded terrain cap — a circular disc bulged into a gentle dome, then broken up
 * with coherent fbm noise so it reads as rolling terrain rather than a smooth lens.
 * The relief tapers to a clean circular rim seated on the Y=0 plane.
 *
 * Displacement is baked into real vertices (no shader), so shadows, raycasts, and
 * any physics collider derived from the mesh match exactly what's drawn — and it
 * renders identically on WebGL and WebGPU/TSL. Pair with a `flatShading` material
 * for a faceted low-poly look; the coherent noise keeps neighboring vertices moving
 * together, so faces never tear.
 *
 * Local frame: base on Y=0, peak toward +Y, centered on the origin.
 */
export class TerrainMoundGeometry extends BufferGeometry {
  readonly radius: number;
  readonly height: number;

  constructor({
    radius = 8,
    height = 1.2,
    radialSegments = 40,
    angularSegments = 64,
    noiseHeight = 0.5,
    noiseScale = 0.35,
    octaves = 4,
    persistence = 0.5,
    rim = 0.82,
    seed = 1,
  }: TerrainMoundGeometryOptions = {}) {
    super();

    this.radius = radius;
    this.height = height;

    const rings = Math.max(1, Math.round(radialSegments));
    const segs = Math.max(3, Math.round(angularSegments));

    // Height at normalized radius r ∈ [0, 1]: raised cosine — 1 at center, 0 at the
    // rim, with zero slope at both ends so the peak is rounded and the edge melts
    // flush into Y=0. Relief is added on top and faded out over the rim band.
    const domeAt = (r: number) => 0.5 + 0.5 * Math.cos(Math.PI * r);
    const rimFade = (r: number) => {
      if (r <= rim) return 1;
      const t = (r - rim) / (1 - rim);
      return 1 - t * t * (3 - 2 * t);
    };
    const yAt = (r: number, x: number, z: number) =>
      domeAt(r) * height + fbm2(x * noiseScale, z * noiseScale, seed, octaves, persistence) * noiseHeight * rimFade(r);

    const vertexCount = 1 + rings * segs;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    // Center vertex.
    positions[1] = yAt(0, 0, 0);
    uvs[0] = 0.5;
    uvs[1] = 0.5;

    // Ring vertices: ring j ∈ [1, rings], each with `segs` points.
    for (let j = 1; j <= rings; j++) {
      const r = j / rings;
      const ringRadius = r * radius;
      for (let k = 0; k < segs; k++) {
        const angle = (k / segs) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius;
        const vi = 1 + (j - 1) * segs + k;
        positions[vi * 3] = x;
        positions[vi * 3 + 1] = yAt(r, x, z);
        positions[vi * 3 + 2] = z;
        uvs[vi * 2] = x / (2 * radius) + 0.5;
        uvs[vi * 2 + 1] = z / (2 * radius) + 0.5;
      }
    }

    const ringVertex = (j: number, k: number) => 1 + (j - 1) * segs + (k % segs);
    const indices: number[] = [];

    // Center fan (center → ring 1). Wound so the surface faces +Y.
    for (let k = 0; k < segs; k++) {
      indices.push(0, ringVertex(1, k + 1), ringVertex(1, k));
    }

    // Concentric quad strips between successive rings.
    for (let j = 1; j < rings; j++) {
      for (let k = 0; k < segs; k++) {
        const inner0 = ringVertex(j, k);
        const inner1 = ringVertex(j, k + 1);
        const outer0 = ringVertex(j + 1, k);
        const outer1 = ringVertex(j + 1, k + 1);
        indices.push(inner0, outer1, outer0);
        indices.push(inner0, inner1, outer1);
      }
    }

    this.setAttribute("position", new BufferAttribute(positions, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.computeVertexNormals();
  }
}

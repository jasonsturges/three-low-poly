import { BufferGeometry, IcosahedronGeometry, Vector3 } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { fbm3 } from "../../utils/CoherentNoise";

export interface BoulderGeometryOptions {
  /** Base radius before displacement (world units). Defaults to `1`. */
  radius?: number;
  /** Icosahedron subdivision — more detail = more, finer facets. Defaults to `2`. */
  detail?: number;
  /** Radial relief amplitude (world units, ±). Keep below `radius`. Defaults to `0.35`. */
  noiseHeight?: number;
  /** Noise frequency over the unit sphere — higher packs more, smaller lumps. Defaults to `1.6`. */
  noiseScale?: number;
  /** fbm octaves (detail layers). Defaults to `3`. */
  octaves?: number;
  /** fbm gain per octave (0–1); lower is smoother, higher is rougher. Defaults to `0.5`. */
  persistence?: number;
  /** Seed for reproducible shape. Defaults to `1`. */
  seed?: number;
}

/**
 * Boulder — an icosphere lumped by coherent 3D fbm ({@link fbm3}) displaced along
 * each vertex's radial direction. The 3D counterpart to the terrain heightfields:
 * same noise strategy, applied over a closed surface instead of a height map.
 *
 * The icosphere is welded (`mergeVertices` after stripping seam UVs) so coincident
 * vertices share one displacement — the coherent noise then moves neighbors together,
 * so the surface stays watertight and never cracks (the failure mode of displacing a
 * non-indexed polyhedron along normals). Real baked geometry, so shadows, raycasts,
 * and physics colliders match what's drawn, on WebGL and WebGPU/TSL alike.
 *
 * Centered on the origin. Pair with a `flatShading` material for a faceted low-poly
 * look. Vary `seed` per instance to fill a field with unique boulders.
 */
export class BoulderGeometry extends BufferGeometry {
  readonly radius: number;

  constructor({
    radius = 1,
    detail = 2,
    noiseHeight = 0.35,
    noiseScale = 1.6,
    octaves = 3,
    persistence = 0.5,
    seed = 1,
  }: BoulderGeometryOptions = {}) {
    super();

    this.radius = radius;

    // Strip seam UVs/normals before welding so coincident vertices actually merge —
    // otherwise the icosphere stays split at UV seams and displacing along normals
    // would pull those duplicates apart into cracks.
    const base = new IcosahedronGeometry(radius, detail);
    base.deleteAttribute("uv");
    base.deleteAttribute("normal");
    const merged = mergeVertices(base);
    base.dispose();

    const position = merged.getAttribute("position");
    const v = new Vector3();
    // Sample noise on the unit sphere (position / radius) so lump count stays
    // consistent regardless of radius; displace radially outward/inward.
    const s = noiseScale / radius;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      const n = fbm3(v.x * s, v.y * s, v.z * s, seed, octaves, persistence);
      const length = v.length() || 1;
      const scale = (length + n * noiseHeight) / length;
      position.setXYZ(i, v.x * scale, v.y * scale, v.z * scale);
    }
    position.needsUpdate = true;

    merged.computeVertexNormals();
    merged.center();

    this.copy(merged);
    merged.dispose();
  }
}

import { BufferAttribute, BufferGeometry } from "three";
import { fbm2 } from "../../utils/CoherentNoise";

export interface TerrainPlaneGeometryOptions {
  /** Extent along X (world units). Defaults to `16`. */
  width?: number;
  /** Extent along Z (world units). Defaults to `16`. */
  depth?: number;
  /** Grid segments along X. Defaults to `48`. */
  widthSegments?: number;
  /** Grid segments along Z. Defaults to `48`. */
  depthSegments?: number;
  /** Amplitude of the terrain relief (world units, ±). Defaults to `0.8`. */
  noiseHeight?: number;
  /** Noise frequency — higher packs more, smaller features into the footprint. Defaults to `0.35`. */
  noiseScale?: number;
  /** fbm octaves (detail layers). Defaults to `4`. */
  octaves?: number;
  /** fbm gain per octave (0–1); lower is smoother, higher is rougher. Defaults to `0.5`. */
  persistence?: number;
  /**
   * Border band (0–1 fraction of the half-extent) over which relief fades to a flat
   * edge at Y=0. `0` leaves a raw, seamless heightfield (tileable); higher values
   * seat the slab like a contained diorama patch. Defaults to `0`.
   */
  edgeFalloff?: number;
  /** Seed for reproducible terrain. Defaults to `1`. */
  seed?: number;
}

/**
 * Rectangular terrain patch — a flat grid displaced on Y by the shared coherent fbm
 * sampler ({@link fbm2}). The rectangular counterpart to {@link TerrainMoundGeometry}:
 * same noise strategy, grid layout instead of a radial disc.
 *
 * A pure heightfield (Y is single-valued per XZ) so faces can never fold, and it's
 * baked into real vertices — shadows, raycasts, and physics colliders match what's
 * drawn, on WebGL and WebGPU/TSL alike. Pair with a `flatShading` material for a
 * faceted low-poly look. Leave `edgeFalloff` at `0` for a tileable field; raise it to
 * seat the edges flat at Y=0.
 *
 * Local frame: base grid on Y=0, relief toward ±Y, centered on the origin.
 */
export class TerrainPlaneGeometry extends BufferGeometry {
  readonly width: number;
  readonly depth: number;

  constructor({
    width = 16,
    depth = 16,
    widthSegments = 48,
    depthSegments = 48,
    noiseHeight = 0.8,
    noiseScale = 0.35,
    octaves = 4,
    persistence = 0.5,
    edgeFalloff = 0,
    seed = 1,
  }: TerrainPlaneGeometryOptions = {}) {
    super();

    this.width = width;
    this.depth = depth;

    const cols = Math.max(1, Math.round(widthSegments));
    const rows = Math.max(1, Math.round(depthSegments));
    const halfW = width / 2;
    const halfD = depth / 2;

    // Fade relief to zero within `edgeFalloff` of the border so the rim seats flat.
    const fade = Math.min(Math.max(edgeFalloff, 0), 1);
    const edgeFade = (x: number, z: number) => {
      if (fade <= 0) return 1;
      const nx = Math.min(x + halfW, halfW - x) / halfW; // 0 at X edges → 1 at center line
      const nz = Math.min(z + halfD, halfD - z) / halfD;
      const d = Math.min(nx, nz);
      if (d >= fade) return 1;
      const t = d / fade;
      return t * t * (3 - 2 * t);
    };

    const vertexCount = (cols + 1) * (rows + 1);
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    for (let iz = 0; iz <= rows; iz++) {
      const z = -halfD + (iz / rows) * depth;
      for (let ix = 0; ix <= cols; ix++) {
        const x = -halfW + (ix / cols) * width;
        const y =
          fbm2(x * noiseScale, z * noiseScale, seed, octaves, persistence) * noiseHeight * edgeFade(x, z);
        const vi = iz * (cols + 1) + ix;
        positions[vi * 3] = x;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = z;
        uvs[vi * 2] = ix / cols;
        uvs[vi * 2 + 1] = iz / rows;
      }
    }

    const indices: number[] = [];
    const vertex = (ix: number, iz: number) => iz * (cols + 1) + ix;
    for (let iz = 0; iz < rows; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const a = vertex(ix, iz);
        const b = vertex(ix + 1, iz);
        const c = vertex(ix, iz + 1);
        const d = vertex(ix + 1, iz + 1);
        // Wound so the surface faces +Y.
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    this.setAttribute("position", new BufferAttribute(positions, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.computeVertexNormals();
  }
}

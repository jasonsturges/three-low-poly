import {
  Color,
  ColorRepresentation,
  Euler,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { BoulderGeometry } from "../geometry/rocks/BoulderGeometry";
import { createRandom } from "../utils/Random";
import type { RockScatterPlacementOptions } from "./RockFactory";

export interface ScatterBouldersOptions extends RockScatterPlacementOptions {
  /** Base radius for each boulder geometry. Defaults to `1`. */
  radius?: number;
  /** Icosphere subdivision per boulder. Defaults to `2`. */
  detail?: number;
  /** Radial relief amplitude per boulder. Defaults to `0.35`. */
  noiseHeight?: number;
  /** Noise frequency per boulder. Defaults to `1.6`. */
  noiseScale?: number;
  /** fbm octaves per boulder. Defaults to `3`. */
  octaves?: number;
  /** fbm gain per octave. Defaults to `0.5`. */
  persistence?: number;
  /**
   * Distinct boulder geometries generated and distributed across the field. Each is
   * a real, unique lumped shape (unlike rotating one shared mesh); instances round-robin
   * across them, so the field stays batch-friendly (one draw call per variant).
   * Defaults to `4`.
   */
  variants?: number;
  /** Override the default stone material (shared across all instances). */
  material?: Material;
  /** Stone tint when `material` is omitted. Defaults to `#6f6f6f`. */
  color?: ColorRepresentation;
}

/**
 * Scatter a field of instanced boulders inside a horizontal bounds region — a "created
 * layer" of the noise-lumped {@link BoulderGeometry}. Unlike {@link scatterRocks}, which
 * rotates a single shared shape, this generates several distinct boulder geometries
 * (see `variants`) and distributes instances across them, so the field reads as unique
 * rocks while staying to a few draw calls.
 *
 * Returns a {@link Group} of {@link InstancedMesh}es (one per variant), each sharing the
 * stone material. Pass a `seed` for a reproducible field. Dispose each child's geometry
 * and the shared material when removing it.
 *
 * @example
 * ```ts
 * const boulders = scatterBoulders({ count: 24, width: 12, depth: 12, seed: 1337 });
 * scene.add(boulders);
 * ```
 */
export function scatterBoulders({
  count = 8,
  width = 6,
  depth = 6,
  heightJitter = 0,
  scaleMin = 0.8,
  scaleMax = 1.2,
  seed,
  radius = 1,
  detail = 2,
  noiseHeight = 0.35,
  noiseScale = 1.6,
  octaves = 3,
  persistence = 0.5,
  variants = 4,
  material,
  color = "#6f6f6f",
}: ScatterBouldersOptions = {}): Group {
  const source = createRandom(seed);
  const variantCount = Math.max(1, Math.min(Math.round(variants), Math.max(1, count)));

  const boulderMaterial =
    material ?? new MeshStandardMaterial({ color: new Color(color), roughness: 1, metalness: 0, flatShading: true });

  // One distinct geometry per variant, each seeded from the scatter stream so the whole
  // field is reproducible when `seed` is given.
  const geometries: BoulderGeometry[] = [];
  for (let v = 0; v < variantCount; v++) {
    geometries.push(
      new BoulderGeometry({
        radius,
        detail,
        noiseHeight,
        noiseScale,
        octaves,
        persistence,
        seed: source.int(0, 1_000_000),
      }),
    );
  }

  // Round-robin instance counts across variants.
  const perVariant = new Array<number>(variantCount).fill(0);
  for (let i = 0; i < count; i++) perVariant[i % variantCount]++;

  const meshes = geometries.map((geometry, v) => new InstancedMesh(geometry, boulderMaterial, perVariant[v]));
  const cursors = new Array<number>(variantCount).fill(0);

  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const rotation = new Euler();

  for (let i = 0; i < count; i++) {
    // Uniform scale keeps the lumped shape from stretching.
    const s = source.float(scaleMin, scaleMax);
    scale.set(s, s, s);
    rotation.set(
      source.float(0, Math.PI * 2),
      source.float(0, Math.PI * 2),
      source.float(0, Math.PI * 2),
    );
    quaternion.setFromEuler(rotation);
    position.set(
      source.float(-width / 2, width / 2),
      source.float(0, heightJitter),
      source.float(-depth / 2, depth / 2),
    );
    matrix.compose(position, quaternion, scale);

    const v = i % variantCount;
    meshes[v].setMatrixAt(cursors[v]++, matrix);
  }

  const group = new Group();
  for (const mesh of meshes) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

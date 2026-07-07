import {
  Color,
  ColorRepresentation,
  Euler,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { MossyRockGeometry } from "../geometry/rocks/MossyRockGeometry";
import { RockGeometry } from "../geometry/rocks/RockGeometry";
import { createRandom } from "../utils/Random";

export interface RockScatterBounds {
  /** Scatter extent along X (centered on origin). Defaults to `4`. */
  width?: number;
  /** Scatter extent along Z (centered on origin). Defaults to `4`. */
  depth?: number;
  /** Max random Y offset above the ground plane. Defaults to `0`. */
  heightJitter?: number;
}

export interface RockScatterPlacementOptions extends RockScatterBounds {
  /** Number of instances. Defaults to `5`. */
  count?: number;
  /** Min per-axis instance scale. Defaults to `0.8`. */
  scaleMin?: number;
  /** Max per-axis instance scale. Defaults to `1.2`. */
  scaleMax?: number;
  /** Optional seed for reproducible scatter. Omit for unique runtime. */
  seed?: number;
}

export interface ScatterRocksOptions extends RockScatterPlacementOptions {
  /** Base sphere radius for each instance geometry. Defaults to `1`. */
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  material?: Material;
  /** Stone tint when `material` is omitted. Defaults to `#808080`. */
  color?: ColorRepresentation;
}

export interface ScatterMossyRocksOptions extends RockScatterPlacementOptions {
  /** Dodecahedron radius for each instance geometry. Defaults to `1`. */
  radius?: number;
  detail?: number;
  mossScaleXZ?: number;
  mossScaleY?: number;
  mossOffsetY?: number;
  rockMaterial?: Material;
  mossMaterial?: Material;
  /** Rock tint when `rockMaterial` is omitted. Defaults to `#808080`. */
  rockColor?: ColorRepresentation;
  /** Moss tint when `mossMaterial` is omitted. Defaults to `#4b8b3b`. */
  mossColor?: ColorRepresentation;
  /** Moss opacity when `mossMaterial` is omitted. Defaults to `0.8`. */
  mossOpacity?: number;
}

function placeInstances(
  mesh: InstancedMesh,
  {
    count = 5,
    width = 4,
    depth = 4,
    heightJitter = 0,
    scaleMin = 0.8,
    scaleMax = 1.2,
    seed,
  }: RockScatterPlacementOptions,
): void {
  const source = createRandom(seed);
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const rotation = new Euler();

  for (let i = 0; i < count; i++) {
    scale.set(
      source.float(scaleMin, scaleMax),
      source.float(scaleMin, scaleMax),
      source.float(scaleMin, scaleMax),
    );
    rotation.set(source.float(0, Math.PI), source.float(0, Math.PI), source.float(0, Math.PI));
    quaternion.setFromEuler(rotation);
    position.set(
      source.float(-width / 2, width / 2),
      source.float(0, heightJitter),
      source.float(-depth / 2, depth / 2),
    );
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Scatter instanced rocks inside a horizontal bounds region.
 *
 * @example
 * ```ts
 * const rocks = scatterRocks({ count: 12, width: 8, depth: 8, seed: 1337 });
 * scene.add(rocks);
 * ```
 */
export function scatterRocks({
  count = 5,
  width = 4,
  depth = 4,
  heightJitter = 0,
  scaleMin = 0.8,
  scaleMax = 1.2,
  seed,
  radius = 1,
  widthSegments = 4,
  heightSegments = 4,
  material,
  color = "#808080",
}: ScatterRocksOptions = {}): InstancedMesh {
  const rockMaterial =
    material ??
    new MeshStandardMaterial({ color: new Color(color), flatShading: true });

  const geometry = new RockGeometry({ radius, widthSegments, heightSegments });
  const mesh = new InstancedMesh(geometry, rockMaterial, count);

  placeInstances(mesh, { count, width, depth, heightJitter, scaleMin, scaleMax, seed });
  return mesh;
}

/**
 * Scatter instanced mossy rocks inside a horizontal bounds region.
 *
 * Uses two material groups (rock + moss) on a shared {@link InstancedMesh}.
 */
export function scatterMossyRocks({
  count = 5,
  width = 4,
  depth = 4,
  heightJitter = 0,
  scaleMin = 0.8,
  scaleMax = 1.2,
  seed,
  radius = 1,
  detail = 0,
  mossScaleXZ = 0.9,
  mossScaleY = 0.5,
  mossOffsetY = 0.3,
  rockMaterial,
  mossMaterial,
  rockColor = "#808080",
  mossColor = "#4b8b3b",
  mossOpacity = 0.8,
}: ScatterMossyRocksOptions = {}): InstancedMesh {
  const materials: Material[] = [
    rockMaterial ??
      new MeshStandardMaterial({ color: new Color(rockColor), flatShading: true }),
    mossMaterial ??
      new MeshStandardMaterial({
        color: new Color(mossColor),
        flatShading: true,
        opacity: mossOpacity,
        transparent: mossOpacity < 1,
      }),
  ];

  const geometry = new MossyRockGeometry({ radius, detail, mossScaleXZ, mossScaleY, mossOffsetY });
  const mesh = new InstancedMesh(geometry, materials, count);

  placeInstances(mesh, { count, width, depth, heightJitter, scaleMin, scaleMax, seed });
  return mesh;
}
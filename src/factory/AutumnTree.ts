import {
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRandom } from "../utils/Random";

export interface AutumnTreeOptions {
  /** Seed for the deterministic stream. Defaults to `0xa711`. Shapes differ from the source scene's. */
  seed?: number;
  /** Trunk radius at the base. Defaults to `0.32`. */
  trunkRadius?: number;
  /** Length of one branch segment before taper. Defaults to `0.66`. */
  segmentLength?: number;
  /** Recursion limit for branching. Defaults to `4`. */
  maxDepth?: number;
  /** Fraction of crown points that receive leaf clusters. Defaults to `0.72`. */
  leafDensity?: number;
  /** Bark color. Defaults to `"#332419"`. */
  barkColor?: string;
  /** Colors sampled per leaf cluster. Defaults to a rust/ochre/deep-red autumn set. */
  leafPalette?: string[];
  /** Leaf cluster radius. Defaults to `0.38`. */
  leafSize?: number;
  /** Clusters placed at each crown point. Defaults to `2`. */
  clustersPerPoint?: number;
  /**
   * Height of the straight vertical rise before the trunk starts leaning. Defaults to `0.35`.
   *
   * This is what lets the base sit FLAT. The trunk leans from its first segment, so without a rise the
   * bottom face is tilted with it and its low edge sinks below `y = 0` by roughly
   * `trunkRadius × sin(lean)` — measured at `-0.087` on the default seed. One vertical segment makes the
   * tangent at the base exactly UP, so the face lies in the ground plane.
   *
   * A correction to the PATH, not to the geometry: a real trunk rises out of the earth before it does
   * anything interesting. Same fix, same reasoning as {@link GnarledTreeGeometry}'s `baseRise`. Set `0` to
   * see the original tilt.
   */
  baseRise?: number;
}

const UP = /*@__PURE__*/ new Vector3(0, 1, 0);

function perpendicular(direction: Vector3, random: () => number): Vector3 {
  const reference = Math.abs(direction.y) < 0.98 ? UP : new Vector3(1, 0, 0);
  return new Vector3()
    .crossVectors(direction, reference)
    .normalize()
    .applyAxisAngle(direction, random() * Math.PI * 2);
}

/** A tapered cylinder from `start` to `end`, oriented along the segment. */
function frustum(start: Vector3, end: Vector3, startRadius: number, endRadius: number): BufferGeometry {
  const axis = new Vector3().subVectors(end, start);
  const length = Math.max(axis.length(), 0.0001);
  axis.normalize();
  const geometry = new CylinderGeometry(endRadius, startRadius, length, 6, 1);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, axis));
  geometry.translate(start.x, start.y, start.z);
  return geometry;
}

/**
 * Deterministic crooked deciduous tree with a sparse, instanced autumn crown.
 *
 * One merged low-poly branch skeleton plus an {@link InstancedMesh} of faceted leaf clusters tinted per
 * instance from {@link AutumnTreeOptions.leafPalette}. The trunk's deliberate lean supplies the large
 * silhouette; recursive branching supplies the gnarl.
 *
 * Local frame: **grows from the origin**, so the base sits flat on the `y = 0` plane and the tree occupies
 * `+Y`. That flatness comes from {@link AutumnTreeOptions.baseRise}; without it the leaning trunk's bottom
 * face tilts and sinks below the ground.
 *
 * Two draw calls regardless of crown size — one for the merged branches, one for every leaf cluster. Both are
 * exposed as {@link branches} and {@link leaves} rather than left to be dug out of `children`.
 *
 * **This factory owns its materials**, unlike the geometry classes. That is faithful to the scene it came
 * from, where bark color and leaf palette are part of the asset's identity rather than a consumer choice.
 * Call {@link dispose} to release them.
 *
 * @example
 * ```typescript
 * const tree = new AutumnTree({ seed: 0xa711 });
 * scene.add(tree);
 * ```
 */
export class AutumnTree extends Group {
  /** The merged branch skeleton — one draw call however deep the branching goes. */
  readonly branches: Mesh<BufferGeometry, MeshStandardMaterial>;
  /** Every leaf cluster, tinted per instance. `count` is the cluster total. */
  readonly leaves: InstancedMesh<BufferGeometry, MeshStandardMaterial>;
  readonly #geometries: BufferGeometry[];
  readonly #materials: Material[];

  constructor({
    seed = 0xa711,
    trunkRadius = 0.32,
    segmentLength = 0.66,
    maxDepth = 4,
    leafDensity = 0.72,
    barkColor = "#332419",
    leafPalette = ["#8d3c1d", "#aa5b21", "#c27a28", "#6e3120", "#b68a32"],
    leafSize = 0.38,
    clustersPerPoint = 2,
    baseRise = 0.35,
  }: AutumnTreeOptions = {}) {
    super();

    // The library's seeded source (mulberry32) rather than the scene's own linear congruential generator.
    // A different algorithm means a different sequence, so a given seed grows a different — equally valid —
    // tree than the website's. Deliberate: one random implementation across the library beats seed parity
    // with the sketch it came from.
    const source = createRandom(seed);
    const random = () => source.next();
    const branchParts: BufferGeometry[] = [];
    const crownPoints: Vector3[] = [];

    const grow = (
      origin: Vector3,
      initialDirection: Vector3,
      radius: number,
      length: number,
      depth: number,
    ): void => {
      const steps = Math.max(2, 5 - depth);
      const taper = 0.82;
      let position = origin.clone();
      const direction = initialDirection.clone().normalize();
      let currentRadius = radius;

      // Rise straight up before leaning, so the bottom face lands flat in the ground plane.
      if (depth === 0 && baseRise > 0) {
        const risen = position.clone().addScaledVector(UP, baseRise);
        branchParts.push(frustum(position, risen, currentRadius, currentRadius));
        position = risen;
      }

      for (let i = 0; i < steps; i++) {
        const bend = depth === 0 ? 0.16 + random() * 0.18 : 0.2 + random() * 0.32;
        direction.applyAxisAngle(perpendicular(direction, random), bend);
        if (depth === 0) direction.lerp(UP, 0.23).normalize();

        const nextRadius = currentRadius * taper;
        const next = position.clone().addScaledVector(direction, length * (0.84 + random() * 0.3));
        branchParts.push(frustum(position, next, currentRadius, nextRadius));
        branchParts.push(new SphereGeometry(nextRadius * 1.04, 6, 4).translate(next.x, next.y, next.z));

        if (depth === 0 && (i === 2 || i === 3)) {
          const offshoot = direction
            .clone()
            .applyAxisAngle(perpendicular(direction, random), 0.72 + random() * 0.42);
          offshoot.lerp(UP, 0.08).normalize();
          grow(next, offshoot, nextRadius * 0.57, length * 0.76, depth + 1);
        }

        position = next;
        currentRadius = nextRadius;
      }

      // Continue into genuinely fine twigs. A 0.025 cutoff exhausted the taper near depth two, which made
      // larger `maxDepth` values look identical.
      if (depth < maxDepth && currentRadius > 0.006) {
        const children = depth === 0 ? 4 : depth < 3 ? 2 : random() < 0.6 ? 2 : 1;
        for (let i = 0; i < children; i++) {
          const childDirection = direction
            .clone()
            .applyAxisAngle(perpendicular(direction, random), 0.48 + random() * 0.7);
          if (depth < 2) childDirection.lerp(UP, 0.12).normalize();
          grow(position, childDirection, currentRadius * 0.69, length * 0.79, depth + 1);
        }
      } else {
        crownPoints.push(position.clone());
      }
    };

    // A purposeful lean gives the trunk its Sleepy Hollow silhouette before the recursive gnarl adds
    // smaller-scale irregularity.
    grow(new Vector3(), new Vector3(-0.16, 1, 0.08), trunkRadius, segmentLength, 0);

    const branchGeometry = mergeGeometries(branchParts);
    if (!branchGeometry) throw new Error("AutumnTree: branch parts failed to merge.");
    branchParts.forEach((geometry) => geometry.dispose());

    const barkMaterial = new MeshStandardMaterial({
      color: new Color(barkColor),
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const branches = new Mesh(branchGeometry, barkMaterial);
    branches.castShadow = branches.receiveShadow = true;
    this.branches = branches;
    this.add(branches);

    const visiblePoints = crownPoints.filter(() => random() < leafDensity);
    const leafGeometry = new DodecahedronGeometry(leafSize, 0);
    const leafMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const leaves = new InstancedMesh(leafGeometry, leafMaterial, visiblePoints.length * clustersPerPoint);
    const placement = new Object3D();
    const tint = new Color();
    let index = 0;

    for (const point of visiblePoints) {
      for (let cluster = 0; cluster < clustersPerPoint; cluster++) {
        placement.position
          .copy(point)
          .add(
            new Vector3(
              (random() - 0.5) * 0.7,
              (random() - 0.5) * 0.55,
              (random() - 0.5) * 0.7,
            ),
          );
        placement.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
        const scale = 0.65 + random() * 0.55;
        placement.scale.set(scale * (0.8 + random() * 0.45), scale, scale * 0.8);
        placement.updateMatrix();
        leaves.setMatrixAt(index, new Matrix4().copy(placement.matrix));
        leaves.setColorAt(index, tint.set(leafPalette[Math.floor(random() * leafPalette.length)]!));
        index++;
      }
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    leaves.castShadow = leaves.receiveShadow = true;
    this.leaves = leaves;
    this.add(leaves);

    this.#geometries = [branchGeometry, leafGeometry];
    this.#materials = [barkMaterial, leafMaterial];
  }

  /** Release the geometries and materials this factory created. */
  dispose(): void {
    this.#geometries.forEach((geometry) => geometry.dispose());
    this.#materials.forEach((material) => material.dispose());
  }
}

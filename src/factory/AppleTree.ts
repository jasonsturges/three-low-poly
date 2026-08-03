import {
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
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

export interface AppleTreeOptions {
  /** Seed for the deterministic stream. Defaults to `0xa991`. */
  seed?: number;
  /** Overall tree height, which the branch reach and rise are derived from. Defaults to `3.4`. */
  height?: number;
  /** Horizontal reach of the crown. Defaults to `1.5`. */
  crownRadius?: number;
  /** Fraction of crown anchors that receive leaf clusters. Defaults to `0.82`. */
  leafDensity?: number;
  /** Number of apples scattered through the crown. Defaults to `18`. */
  appleCount?: number;
  /**
   * Height of the straight vertical rise before the trunk leans. Defaults to `0.25`.
   *
   * The trunk's top carries a small random offset, so without a rise the trunk tilts from the ground up and
   * its bottom face tilts with it, sinking the low edge below `y = 0`. One vertical segment makes the base
   * tangent exactly UP so the face lies flat. Set `0` to see the original tilt.
   */
  baseRise?: number;
}

const UP = /*@__PURE__*/ new Vector3(0, 1, 0);

/** A tapered branch from `start` to `end`, oriented along the segment. */
function branchGeometry(
  start: Vector3,
  end: Vector3,
  bottomRadius: number,
  topRadius: number,
): BufferGeometry {
  const direction = new Vector3().subVectors(end, start);
  const length = Math.max(direction.length(), 0.0001);
  const geometry = new CylinderGeometry(topRadius, bottomRadius, length, 7, 1);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  geometry.translate(start.x, start.y, start.z);
  return geometry;
}

/**
 * A compact cultivated apple tree with a low, rounded crown.
 *
 * Six primary branches leave a short trunk, each carrying a shoulder, a tip, and two twigs — orchard form
 * rather than the recursive gnarl of {@link AutumnTree}. **Deliberately independent of it:** branching rules,
 * foliage, and fruit all live here, because a pruned orchard tree is a different thing from a wild one, not a
 * reparameterization of it.
 *
 * Three draw calls at any size — merged wood, one {@link InstancedMesh} of leaf clusters tinted per instance,
 * and one of apples. Exposed as {@link wood}, {@link leaves}, and {@link apples}.
 *
 * Local frame: **grows from the origin**, base flat on the `y = 0` plane, occupying `+Y`. See
 * {@link AppleTreeOptions.baseRise}.
 *
 * **This factory owns its materials**, faithful to the scene it came from, where bark, leaf, and apple colors
 * are part of the asset's identity. Call {@link dispose} to release them.
 *
 * @example
 * ```typescript
 * const tree = new AppleTree({ seed: 0xa991, appleCount: 24 });
 * scene.add(tree);
 * ```
 */
export class AppleTree extends Group {
  /** The merged trunk, branches, and twigs — one draw call. */
  readonly wood: Mesh<BufferGeometry, MeshStandardMaterial>;
  /** Leaf clusters, tinted per instance. */
  readonly leaves: InstancedMesh<BufferGeometry, MeshStandardMaterial>;
  /** Apples scattered through the crown. */
  readonly apples: InstancedMesh<BufferGeometry, MeshStandardMaterial>;
  readonly #geometries: BufferGeometry[];
  readonly #materials: Material[];

  constructor({
    seed = 0xa991,
    height = 3.4,
    crownRadius = 1.5,
    leafDensity = 0.82,
    appleCount = 18,
    baseRise = 0.25,
  }: AppleTreeOptions = {}) {
    super();

    // The library's seeded source rather than the scene's own linear congruential generator, so one random
    // implementation serves the whole library. A given seed therefore grows a different — equally valid — tree
    // than the website's.
    const source = createRandom(seed);
    const random = () => source.next();

    const woodParts: BufferGeometry[] = [];
    const crownAnchors: Vector3[] = [];

    const trunkTop = new Vector3(
      (random() - 0.5) * 0.18,
      height * 0.46,
      (random() - 0.5) * 0.18,
    );

    // Rise straight up before the trunk leans toward its offset top, so the bottom face lands flat.
    let trunkBase = new Vector3();
    if (baseRise > 0) {
      const risen = new Vector3(0, baseRise, 0);
      woodParts.push(branchGeometry(trunkBase, risen, 0.24, 0.24));
      trunkBase = risen;
    }
    woodParts.push(branchGeometry(trunkBase, trunkTop, 0.24, 0.16));

    const primaryCount = 6;
    for (let branch = 0; branch < primaryCount; branch++) {
      const angle = (branch / primaryCount) * Math.PI * 2 + (random() - 0.5) * 0.35;
      const reach = crownRadius * (0.62 + random() * 0.24);
      const shoulder = trunkTop
        .clone()
        .add(
          new Vector3(
            Math.cos(angle) * reach * 0.48,
            height * (0.15 + random() * 0.08),
            Math.sin(angle) * reach * 0.48,
          ),
        );
      const tip = trunkTop
        .clone()
        .add(
          new Vector3(
            Math.cos(angle) * reach,
            height * (0.28 + random() * 0.13),
            Math.sin(angle) * reach,
          ),
        );
      woodParts.push(branchGeometry(trunkTop, shoulder, 0.13, 0.085));
      woodParts.push(branchGeometry(shoulder, tip, 0.085, 0.035));
      crownAnchors.push(tip, shoulder.clone().lerp(tip, 0.55));

      for (const side of [-1, 1]) {
        const twigAngle = angle + side * (0.45 + random() * 0.28);
        const twigTip = shoulder
          .clone()
          .add(
            new Vector3(
              Math.cos(twigAngle) * reach * 0.46,
              height * (0.12 + random() * 0.12),
              Math.sin(twigAngle) * reach * 0.46,
            ),
          );
        woodParts.push(branchGeometry(shoulder, twigTip, 0.065, 0.025));
        crownAnchors.push(twigTip);
      }
    }

    const woodGeometry = mergeGeometries(woodParts);
    if (!woodGeometry) throw new Error("AppleTree: wood parts failed to merge.");
    woodParts.forEach((geometry) => geometry.dispose());

    const woodMaterial = new MeshStandardMaterial({
      color: new Color("#493222"),
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const wood = new Mesh(woodGeometry, woodMaterial);
    wood.castShadow = wood.receiveShadow = true;
    this.wood = wood;
    this.add(wood);

    const visibleAnchors = crownAnchors.filter(() => random() < leafDensity);
    const leafGeometry = new IcosahedronGeometry(0.43, 1);
    const leafMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const leaves = new InstancedMesh(leafGeometry, leafMaterial, visibleAnchors.length * 2);
    const placement = new Object3D();
    const leafColors = ["#53602c", "#697438", "#7d7531", "#8a692b", "#465126"];
    const tint = new Color();
    let leafIndex = 0;

    for (const anchor of visibleAnchors) {
      for (let cluster = 0; cluster < 2; cluster++) {
        placement.position.set(
          anchor.x + (random() - 0.5) * 0.62,
          anchor.y + (random() - 0.5) * 0.48,
          anchor.z + (random() - 0.5) * 0.62,
        );
        placement.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
        const scale = 0.68 + random() * 0.46;
        placement.scale.set(scale * 1.15, scale, scale * 1.05);
        placement.updateMatrix();
        leaves.setMatrixAt(leafIndex, placement.matrix);
        leaves.setColorAt(leafIndex, tint.set(leafColors[Math.floor(random() * leafColors.length)]!));
        leafIndex++;
      }
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    leaves.castShadow = leaves.receiveShadow = true;
    this.leaves = leaves;
    this.add(leaves);

    const appleGeometry = new SphereGeometry(0.105, 8, 6);
    const appleMaterial = new MeshStandardMaterial({
      color: new Color("#8f251b"),
      roughness: 0.82,
      metalness: 0,
      flatShading: true,
    });
    const apples = new InstancedMesh(appleGeometry, appleMaterial, appleCount);
    for (let i = 0; i < appleCount; i++) {
      // Every anchor is eligible, including ones the leaf pass skipped — fruit and foliage are scattered
      // independently.
      const anchor = crownAnchors[Math.floor(random() * crownAnchors.length)]!;
      placement.position.set(
        anchor.x + (random() - 0.5) * 0.72,
        anchor.y - 0.18 - random() * 0.42,
        anchor.z + (random() - 0.5) * 0.72,
      );
      placement.rotation.set(0, random() * Math.PI, 0);
      placement.scale.setScalar(0.82 + random() * 0.35);
      placement.updateMatrix();
      apples.setMatrixAt(i, placement.matrix);
    }
    apples.instanceMatrix.needsUpdate = true;
    apples.castShadow = true;
    this.apples = apples;
    this.add(apples);

    this.#geometries = [woodGeometry, leafGeometry, appleGeometry];
    this.#materials = [woodMaterial, leafMaterial, appleMaterial];
  }

  /** Release the geometries and materials this factory created. */
  dispose(): void {
    this.#geometries.forEach((geometry) => geometry.dispose());
    this.#materials.forEach((material) => material.dispose());
  }
}

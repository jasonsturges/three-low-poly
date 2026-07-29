import {
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";

export interface RusticFenceOptions {
  /** Number of bays between posts. */
  sections?: number;
  sectionLength?: number;
  railCount?: 2 | 3;
  postHeight?: number;
  postThickness?: number;
  railThickness?: number;
  seed?: number;
}

const UP = new Vector3(0, 1, 0);

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * A low-poly timber with an uneven, hand-hewn silhouette. It is authored one
 * unit tall on +Y; callers stretch and orient it between their own endpoints.
 */
function createHewnTimberGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(0.5, 0.55, 1, 6, 3, false);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (Math.hypot(x, z) < 0.01) continue;

    // The perturbation is derived from the existing vertex, keeping the asset
    // deterministic and its end caps watertight while breaking the lathed look.
    const irregularity = 1 + Math.sin(x * 17.3 + y * 11.7 + z * 23.1) * 0.075;
    position.setXYZ(i, x * irregularity, y, z * irregularity);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A straight run of rough split-rail country fence, centered on local X with
 * its feet on y=0. Short runs can be rotated and joined to trace a boundary.
 */
export class RusticFence extends Group {
  readonly #geometry: BufferGeometry;
  readonly #materials: Material[];

  constructor({
    sections = 4,
    sectionLength = 2.4,
    railCount = 3,
    postHeight = 1.65,
    postThickness = 0.22,
    railThickness = 0.16,
    seed = 0xf3ce,
  }: RusticFenceOptions = {}) {
    super();

    const random = randomGenerator(seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    this.#geometry = createHewnTimberGeometry();
    this.#materials = ["#5b3820", "#6a4326", "#49301f"].map(
      (color) =>
        new MeshStandardMaterial({
          color: new Color(color),
          roughness: 1,
          metalness: 0,
          flatShading: true,
        }),
    );

    const width = sections * sectionLength;
    const postX: number[] = [];
    const postTop: number[] = [];

    for (let i = 0; i <= sections; i++) {
      const height = postHeight * (1 + signed(0.07));
      const x = i * sectionLength - width / 2 + signed(0.055);
      postX.push(x);
      postTop.push(height);

      const post = new Mesh(
        this.#geometry,
        this.#materials[i % this.#materials.length],
      );
      post.position.set(x, height / 2 - signed(0.025), signed(0.035));
      post.scale.set(
        postThickness * (1 + signed(0.1)),
        height,
        postThickness * (1 + signed(0.1)),
      );
      post.rotation.set(signed(0.045), signed(0.2), signed(0.045));
      post.castShadow = post.receiveShadow = true;
      this.add(post);
    }

    const start = new Vector3();
    const end = new Vector3();
    const direction = new Vector3();
    const orientation = new Quaternion();

    for (let section = 0; section < sections; section++) {
      for (let rail = 0; rail < railCount; rail++) {
        const fraction =
          railCount === 2 ? 0.38 + rail * 0.32 : 0.3 + rail * 0.25;
        const overlap = railThickness * 0.7;
        const side = (section + rail) % 2 === 0 ? -1 : 1;

        start.set(
          postX[section] - overlap,
          postTop[section] * fraction + signed(0.035),
          side * postThickness * 0.34,
        );
        end.set(
          postX[section + 1] + overlap,
          postTop[section + 1] * fraction + signed(0.035),
          -side * postThickness * 0.34,
        );

        direction.subVectors(end, start);
        const length = direction.length();
        orientation.setFromUnitVectors(UP, direction.normalize());

        const timber = new Mesh(
          this.#geometry,
          this.#materials[(section + rail + 1) % this.#materials.length],
        );
        timber.position.addVectors(start, end).multiplyScalar(0.5);
        timber.quaternion.copy(orientation);
        timber.rotateY(signed(0.12));
        timber.scale.set(
          railThickness * (1 + signed(0.12)),
          length,
          railThickness * (0.85 + random() * 0.25),
        );
        timber.castShadow = timber.receiveShadow = true;
        this.add(timber);
      }
    }
  }

  dispose(): void {
    this.#geometry.dispose();
    this.#materials.forEach((material) => material.dispose());
  }
}

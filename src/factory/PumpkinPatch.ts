import {
  Color,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import {
  createPumpkinRindGeometry,
  createPumpkinStemGeometry,
  pumpkinStemMatrix,
} from "../geometry/flora/PumpkinGeometry";

const UP = new Vector3(0, 1, 0);
const TILT_AXIS = new Vector3(1, 0, 0);

/**
 * The instancing half of the pattern: a field of pumpkins — rows × columns,
 * potentially thousands — batched into exactly two draw calls, one rind
 * InstancedMesh and one stem InstancedMesh.
 *
 * This is why the geometry stayed separable. Because rind and stem are distinct
 * batches, each can carry its own per-instance data — `setColorAt` gives every
 * pumpkin its own rind tint, which a single merged geometry could never do.
 * Organic variety, not tuning knobs: `lean`/`twist`/`sink`/`drift` are the
 * seeded *max* ranges from the shared placement vocabulary, sampled per instance.
 *
 * The stem batch reuses `pumpkinStemMatrix` — the exact positioning the
 * single-instance merge bakes — composed here into each instance's world matrix.
 * Positioning computed once; only the mechanics (bake vs. instance) differ.
 */
export interface PumpkinPatchOptions {
  rows?: number;
  columns?: number;
  spacing?: number;
  seed?: number;
  scaleMin?: number;
  scaleMax?: number;

  // Stem tier — the part, jittered per pumpkin (assembly). Prefixed `stem…`, the
  // same vocabulary the single geometry exposes.
  /** Max stem tilt off vertical, radians. Sampled ±value. */
  stemLeanMax?: number;
  /** Max extra stem burial into the rind past its seat. Sampled 0..value. */
  stemSinkMax?: number;

  // Unit tier — the whole pumpkin, jittered per pumpkin (placement). Bare names,
  // because the unit is the subject here.
  /** Max whole-pumpkin tilt off vertical, radians. Sampled ±value — keep subtle. */
  leanMax?: number;
  /** Max whole-pumpkin yaw, radians. Sampled ±value. */
  twistMax?: number;
  /** Max depth the whole pumpkin beds into the ground. Sampled 0..value. */
  sinkMax?: number;
  /** Max XZ wander off the grid point. Sampled ±value. */
  driftMax?: number;

  /** Per-instance rind tint spread in HSL, for a non-repeating field. */
  colorVariance?: number;
}

/** Repeatable LCG so a given `seed` always yields the same field. */
function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export class PumpkinPatch extends Group {
  readonly rindInstances: InstancedMesh;
  readonly stemInstances: InstancedMesh;

  readonly #materials: Material[];

  constructor({
    rows = 12,
    columns = 16,
    spacing = 0.9,
    seed = 0x51a7,
    scaleMin = 0.22,
    scaleMax = 0.38,
    stemLeanMax = 0.35,
    stemSinkMax = 0.06,
    leanMax = 0.08,
    twistMax = Math.PI,
    sinkMax = 0.05,
    driftMax = 0.18,
    colorVariance = 0.08,
  }: PumpkinPatchOptions = {}) {
    super();

    const count = rows * columns;
    const random = randomGenerator(seed);

    // Base unit-pumpkin parts (radius 1); per-instance scale sizes them, keeping
    // the stem proportional for free.
    const rindGeometry = createPumpkinRindGeometry();
    const stemGeometry = createPumpkinStemGeometry();

    // White rind base so setColorAt yields the exact tint rather than a product;
    // stems share one solid color, so they need no per-instance color at all.
    const rindMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, flatShading: true });
    const stemMaterial = new MeshStandardMaterial({ color: new Color("#30311f"), roughness: 1, metalness: 0, flatShading: true });
    this.#materials = [rindMaterial, stemMaterial];

    this.rindInstances = new InstancedMesh(rindGeometry, rindMaterial, count);
    this.stemInstances = new InstancedMesh(stemGeometry, stemMaterial, count);
    this.rindInstances.castShadow = this.rindInstances.receiveShadow = true;
    this.stemInstances.castShadow = true;

    const placement = new Object3D();
    const stemWorld = new Matrix4();
    const yaw = new Quaternion();
    const tilt = new Quaternion();
    const tint = new Color();
    const baseRind = new Color("#804319");

    const xOffset = ((columns - 1) * spacing) / 2;
    const zOffset = ((rows - 1) * spacing) / 2;
    const signed = (max: number) => (random() - 0.5) * 2 * max;

    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const scale = scaleMin + random() * (scaleMax - scaleMin);

        // Unit tier — the whole pumpkin, as placement.
        const unitLean = signed(leanMax);
        const unitTwist = signed(twistMax);
        const unitSink = random() * sinkMax;

        // Grid point + drift, bedded into the ground by sink, yawed and tipped.
        // yaw ∘ tilt so the yaw also spins the tilt into a random compass heading.
        placement.position.set(
          column * spacing - xOffset + signed(driftMax),
          -unitSink,
          row * spacing - zOffset + signed(driftMax),
        );
        yaw.setFromAxisAngle(UP, unitTwist);
        tilt.setFromAxisAngle(TILT_AXIS, unitLean);
        placement.quaternion.multiplyQuaternions(yaw, tilt);
        placement.scale.setScalar(scale);
        placement.updateMatrix();
        this.rindInstances.setMatrixAt(index, placement.matrix);

        // Stem tier — the part, seated on its rind then carried by the unit
        // placement. The exact pumpkinStemMatrix the single-instance merge bakes.
        stemWorld.multiplyMatrices(
          placement.matrix,
          pumpkinStemMatrix({ stemLean: signed(stemLeanMax), stemSink: random() * stemSinkMax }),
        );
        this.stemInstances.setMatrixAt(index, stemWorld);

        tint.copy(baseRind).offsetHSL(signed(colorVariance) * 0.3, signed(colorVariance), signed(colorVariance));
        this.rindInstances.setColorAt(index, tint);

        index++;
      }
    }

    this.rindInstances.instanceMatrix.needsUpdate = true;
    this.stemInstances.instanceMatrix.needsUpdate = true;
    if (this.rindInstances.instanceColor) this.rindInstances.instanceColor.needsUpdate = true;

    this.add(this.rindInstances, this.stemInstances);
  }

  /** Release both instanced geometries and the owned materials. */
  dispose(): void {
    this.rindInstances.geometry.dispose();
    this.stemInstances.geometry.dispose();
    this.#materials.forEach((material) => material.dispose());
  }
}

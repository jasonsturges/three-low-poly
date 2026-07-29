import { BufferGeometry, CylinderGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRandom, type RandomSource } from "../../utils/Random";

const UP = /*@__PURE__*/ new Vector3(0, 1, 0);

export interface ClearingTreeGeometryOptions {
  /** Radius at the foot of the trunk. Defaults to `0.28`. */
  trunkRadius?: number;
  /** Length of one trunk growth step. Defaults to `0.76`. */
  segmentLength?: number;
  /** Growth steps in the trunk before it forks. Defaults to `7` — this is what makes the tree tall. */
  trunkSteps?: number;
  /** Growth seed — a tree is an address, not an accident. Defaults to `1`. */
  seed?: number;
  /**
   * Height of the straight vertical rise before the trunk leans. Defaults to `0.3`.
   *
   * The trunk starts a hair off vertical so no two trees stand to identical attention, which tilts its bottom
   * face and sinks the low edge below `y = 0`. One vertical segment makes the base tangent exactly UP so the
   * face lies flat. A correction to the PATH, not the geometry — the same fix as
   * {@link GnarledTreeGeometry}'s `baseRise`. Set `0` to see the original tilt.
   */
  baseRise?: number;
}

/** A random unit axis perpendicular to `direction` — the plane a segment bends in. */
function perpendicular(direction: Vector3, random: () => number): Vector3 {
  const reference = Math.abs(direction.y) < 0.98 ? UP : new Vector3(1, 0, 0);
  return new Vector3()
    .crossVectors(direction, reference)
    .normalize()
    .applyAxisAngle(direction, random() * Math.PI * 2);
}

/** A tapered tube from `start` (radius `startRadius`) to `end` (radius `endRadius`). */
function frustum(start: Vector3, end: Vector3, startRadius: number, endRadius: number): BufferGeometry {
  const direction = end.clone().sub(start);
  const length = Math.max(direction.length(), 0.001);
  direction.normalize();
  const geometry = new CylinderGeometry(endRadius, startRadius, length, 5, 1);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction));
  geometry.translate(start.x, start.y, start.z);
  return geometry;
}

/**
 * Grow one branch and, recursively, its offshoots.
 *
 * `depth === 0` is the trunk: it bends less, leans back toward vertical each step, tapers slower, and holds
 * its first limbs until it has risen a few steps — the open bole. Deeper branches reach outward and split
 * more freely.
 */
function grow(
  parts: BufferGeometry[],
  random: () => number,
  origin: Vector3,
  initialDirection: Vector3,
  radius: number,
  segmentLength: number,
  depth: number,
  steps: number,
): void {
  let position = origin.clone();
  const direction = initialDirection.clone().normalize();
  let currentRadius = radius;

  for (let step = 0; step < steps; step++) {
    const bend = depth === 0 ? 0.07 + random() * 0.13 : 0.17 + random() * 0.3;
    direction.applyAxisAngle(perpendicular(direction, random), bend);
    if (depth === 0) direction.lerp(UP, 0.34).normalize();

    const nextRadius = currentRadius * (depth === 0 ? 0.84 : 0.76);
    const next = position.clone().addScaledVector(direction, segmentLength * (0.86 + random() * 0.28));
    parts.push(frustum(position, next, currentRadius, nextRadius));

    // Keep the lower trunk clear: the first limbs wait until step 3. That open bole is the whole point of
    // this tree — it is what lets an iron guard ring a clean trunk instead of fouling a thicket of low boughs.
    if (
      depth < 3 &&
      (depth > 0 || step >= 3) &&
      currentRadius > 0.022 &&
      random() < (depth === 0 ? 0.72 : 0.42)
    ) {
      const childDirection = direction
        .clone()
        .applyAxisAngle(perpendicular(direction, random), 0.62 + random() * 0.62);
      childDirection.y += depth === 0 ? 0.16 : -0.02 + random() * 0.14;
      childDirection.normalize();
      grow(
        parts,
        random,
        next,
        childDirection,
        nextRadius * 0.58,
        segmentLength * 0.74,
        depth + 1,
        Math.max(2, 4 - depth),
      );
    }

    position = next;
    currentRadius = nextRadius;
  }

  if (depth < 3 && currentRadius > 0.018) {
    const forks = depth === 0 ? 3 : 2;
    for (let fork = 0; fork < forks; fork++) {
      const forkDirection = direction
        .clone()
        .applyAxisAngle(perpendicular(direction, random), 0.48 + random() * 0.72);
      forkDirection.y += 0.05 + random() * 0.18;
      forkDirection.normalize();
      grow(
        parts,
        random,
        position,
        forkDirection,
        currentRadius * 0.64,
        segmentLength * 0.77,
        depth + 1,
        Math.max(2, 4 - depth),
      );
    }
  }
}

/**
 * A tall, open-trunked gnarled tree — the single tree from a clearing forest.
 *
 * One recursive routine grows the whole skeleton: a branch is a short walk of tapered frustums, gnarled by a
 * small random bend at each step, splitting into thinner children when it runs out of steps. Merged to a
 * single geometry.
 *
 * It differs from {@link GnarledTreeGeometry} in the one way that matters: **the lower trunk is kept open.**
 * The trunk is continually nudged back toward vertical and its first limbs are withheld until several steps
 * up, so the bole rises clear before it branches. That is what lets something ring a clean trunk — an iron
 * guard, a bench, a lantern — rather than fouling a thicket of low boughs.
 *
 * Material groups: **none** — bare bark, one material for the whole skeleton.
 *
 * Local frame: **grows from the origin**, base flat on the `y = 0` plane, occupying `+Y`. See
 * {@link ClearingTreeGeometryOptions.baseRise}.
 *
 * @example
 * ```typescript
 * const tree = new Mesh(new ClearingTreeGeometry({ seed: 1 }), bark);
 * ```
 */
export class ClearingTreeGeometry extends BufferGeometry {
  readonly trunkRadius: number;

  constructor({
    trunkRadius = 0.28,
    segmentLength = 0.76,
    trunkSteps = 7,
    seed = 1,
    baseRise = 0.3,
  }: ClearingTreeGeometryOptions = {}) {
    super();

    this.trunkRadius = trunkRadius;

    // The library's seeded source rather than the scene's own linear congruential generator, so one random
    // implementation serves the whole library. A given seed therefore grows a different — equally valid — tree
    // than the website's.
    const source: RandomSource = createRandom(seed);
    const random = () => source.next();
    const parts: BufferGeometry[] = [];

    // Rise straight up before leaning, so the bottom face lands flat in the ground plane.
    let foot = new Vector3();
    if (baseRise > 0) {
      const risen = new Vector3(0, baseRise, 0);
      parts.push(frustum(foot, risen, trunkRadius, trunkRadius));
      foot = risen;
    }

    // A hair off vertical so no two trees stand to identical attention.
    const lean = new Vector3((random() - 0.5) * 0.18, 1, (random() - 0.5) * 0.18);
    grow(parts, random, foot, lean, trunkRadius, segmentLength, 0, trunkSteps);

    const merged = mergeGeometries(parts);
    if (!merged) throw new Error("ClearingTreeGeometry: branch parts failed to merge.");
    parts.forEach((part) => part.dispose());

    this.copy(merged);
    merged.dispose();
    this.computeBoundingSphere();
  }
}

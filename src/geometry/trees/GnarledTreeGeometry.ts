import { BufferGeometry, CatmullRomCurve3, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PathPoint } from "../../paths/PathPoint";
import { circleProfile } from "../../sweep/Profiles";
import { sweep, transportFrames } from "../../sweep/Sweep";
import { createRandom, type RandomSource } from "../../utils/Random";

const UP = new Vector3(0, 1, 0);

export interface GnarledTreeGeometryOptions {
  /** Radius of the trunk at the collar. Defaults to `0.24`. */
  trunkRadius?: number;
  /** Length of one step of growth. Defaults to `0.5`. */
  segmentLength?: number;
  /** How many times a branch may fork. Defaults to `4`. */
  maxDepth?: number;
  /** How hard each step bends. Defaults to `1`. */
  gnarl?: number;
  /** How much each step narrows. Defaults to `0.86`. */
  taper?: number;
  /** Sides of a branch's cross-section — the low-poly knob. Defaults to `5`. */
  sides?: number;
  /** Stations swept per skeleton step. `1` is faceted; higher smooths the gnarl into a curve. Defaults to `4`. */
  smoothing?: number;
  /**
   * A straight vertical rise before the trunk starts to gnarl — the root collar. Defaults to `0.35`.
   *
   * Without it the trunk bends on its very first step and leaves the ground already leaning, so its
   * base cannot lie flat. This is a correction to the PATH, not to the geometry: a real trunk rises
   * vertically out of the earth before it does anything interesting.
   */
  baseRise?: number;
  /** How much wider the trunk is at the ground than just above it — the root flare. `1` is none. Defaults to `1.5`. */
  rootFlare?: number;
  /** Optional seed for a reproducible tree. Omit for unique per runtime. */
  seed?: number;
}

/** One branch: the skeleton nodes it walked through, and how thick it was at each. */
interface Branch {
  nodes: { position: Vector3; radius: number }[];
}

/** A random unit axis perpendicular to `d` — the direction a segment bends in. */
function randomPerp(d: Vector3, source: RandomSource): Vector3 {
  const reference = Math.abs(d.y) < 0.99 ? UP : new Vector3(1, 0, 0);

  return new Vector3()
    .crossVectors(d, reference)
    .normalize()
    .applyAxisAngle(d, source.float(0, Math.PI * 2));
}

/**
 * A gnarled, leafless oak — the kind that belongs in a graveyard.
 *
 * One recursive routine grows the skeleton. A branch is not a straight tube: it is a short *walk*, and
 * at every step the growth direction is nudged by a small random angle (the gnarl) while the radius
 * tapers. When a branch runs out of steps it forks into thinner, shorter children that walk the same
 * way, and recursion does the rest.
 *
 * Each branch is then given a body by the SWEEP — one continuous tube carried along a curve threaded
 * through its nodes. The obvious alternative, a chain of tapered frustums, needs a sphere at every
 * joint to mask the seam where consecutive tubes fail to meet; parallel transport carries one ring
 * around the bend and there is no seam to hide. Where a child meets its parent the tubes simply
 * intersect — welding branch surfaces is skinning, and at this polygon budget nobody will see it.
 *
 * Local frame: base at Y=0, growing +Y.
 *
 * @example
 * ```ts
 * const geometry = new GnarledTreeGeometry({ seed: 1337, maxDepth: 4 });
 * ```
 */
export class GnarledTreeGeometry extends BufferGeometry {
  readonly trunkRadius: number;

  constructor(options: GnarledTreeGeometryOptions = {}) {
    super();

    const {
      trunkRadius = 0.24,
      segmentLength = 0.5,
      maxDepth = 4,
      gnarl = 1,
      taper = 0.86,
      sides = 5,
      smoothing = 4,
      baseRise = 0.35,
      rootFlare = 1.5,
      seed,
    } = options;

    this.trunkRadius = trunkRadius;

    const source = createRandom(seed);
    const branches: Branch[] = [];

    const grow = (
      origin: Vector3,
      direction: Vector3,
      radius: number,
      segLen: number,
      depth: number,
    ): void => {
      const steps = Math.max(2, source.int(4, 6) - depth); // deeper branches are shorter
      const upBias = Math.max(0, 0.2 - depth * 0.06); // the trunk reaches up; branches reach out

      const nodes: Branch["nodes"] = [{ position: origin.clone(), radius }];

      let pos = origin.clone();
      const dir = direction.clone().normalize();
      let r = radius;

      // The trunk rises straight before it gnarls. That one vertical segment is what lets the base sit
      // flat: the tangent at t=0 is then exactly the first segment's direction, which is UP. It also
      // gives the root flare somewhere to live.
      if (depth === 0 && baseRise > 0) {
        nodes[0]!.radius = radius * rootFlare;
        pos = origin.clone().addScaledVector(dir, baseRise);
        nodes.push({ position: pos.clone(), radius });
      }

      for (let i = 0; i < steps; i++) {
        // gnarl: bend around a random perpendicular axis, then nudge back toward upright
        dir.applyAxisAngle(randomPerp(dir, source), source.float(0.18, 0.5) * gnarl);
        if (upBias > 0) dir.lerp(UP, upBias).normalize();

        const r2 = r * taper;
        const next = pos.clone().addScaledVector(dir, segLen * source.float(0.85, 1.15));
        nodes.push({ position: next.clone(), radius: r2 });

        // an offshoot partway along the branch
        if (depth < maxDepth && i > 0 && r2 > 0.05 && source.float(0, 1) < 0.28) {
          const off = dir.clone().applyAxisAngle(randomPerp(dir, source), source.float(0.6, 1.1));
          grow(next.clone(), off, r2 * 0.6, segLen * 0.8, depth + 1);
        }

        pos = next;
        r = r2;
      }

      branches.push({ nodes });

      // terminal fork
      if (depth < maxDepth && r > 0.045) {
        const children = depth === 0 ? source.int(2, 3) : source.int(1, 3);

        for (let c = 0; c < children; c++) {
          const childDir = dir.clone().applyAxisAngle(randomPerp(dir, source), source.float(0.4, 0.9));
          grow(pos.clone(), childDir, r * 0.7, segLen * 0.82, depth + 1);
        }
      }
    };

    grow(new Vector3(0, 0, 0), UP.clone(), trunkRadius, segmentLength, 0);

    // A unit circle, scaled per station by the branch's own radius — the path carries its thickness.
    const profile = circleProfile(1, sides);

    const parts = branches
      .map((branch) => this.branchPath(branch, smoothing))
      .filter((path) => path.length >= 2)
      .map((path) => sweep(profile, transportFrames(path)));

    this.copy(mergeGeometries(parts, false) as BufferGeometry);
    parts.forEach((part) => part.dispose());
  }

  /**
   * Turn a skeleton into a path. A Catmull-Rom curve threads the nodes, which turns the gnarl from a
   * chain of hard corners into an actual curve — and, crucially, the curve KNOWS ITS OWN TANGENT. We
   * ask it rather than estimating from the chords.
   *
   * The radius is read from the nodes the generator actually walked, not fitted to its endpoints: a
   * formula would smear the root flare all the way up the trunk.
   */
  private branchPath(branch: Branch, smoothing: number): PathPoint[] {
    const nodes = branch.nodes;
    if (nodes.length < 2) return [];

    const curve = new CatmullRomCurve3(
      nodes.map((n) => n.position),
      false,
      "centripetal", // handles the tight kinks of a gnarl without overshooting
    );

    const stations = Math.max(2, (nodes.length - 1) * smoothing);

    const radiusAt = (t: number) => {
      const x = t * (nodes.length - 1);
      const i = Math.min(nodes.length - 2, Math.floor(x));
      const f = x - i;
      return nodes[i]!.radius * (1 - f) + nodes[i + 1]!.radius * f;
    };

    return Array.from({ length: stations + 1 }, (_, i) => {
      const t = i / stations;

      return {
        position: curve.getPointAt(t),
        tangent: curve.getTangentAt(t),
        scale: radiusAt(t),
      };
    });
  }
}

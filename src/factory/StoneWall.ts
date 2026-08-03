import {
  BoxGeometry,
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../utils/Random";

export interface StoneWallOptions {
  /** Extent along X. Defaults to `3.2`. */
  width?: number;
  /** Extent along Y, from the ground up. Defaults to `3`. */
  height?: number;
  /** Extent along Z. Defaults to `0.34`. */
  thickness?: number;

  /**
   * Target course height. Defaults to `0.26`.
   *
   * Courses are fitted to `height`, so this is a target and never leaves a sliver at the top. The number
   * actually laid is reported as {@link StoneWall.courseHeight}.
   */
  courseHeight?: number;
  /** A whole stone's length, as a multiple of the course. Defaults to `2.2`. */
  stoneAspect?: number;
  /**
   * The mortar line. Defaults to `0.012`.
   *
   * **Taken OUT of the stone**, so the coursing keeps its pitch as the joint widens. That is the mason's
   * convention — stone is cut to suit a course. Brick does the opposite, adding the joint to the pitch,
   * because a brick arrives at a fixed size.
   */
  joint?: number;
  /**
   * How far alternate courses start along a stone. Defaults to `0.5` — a RUNNING BOND, so no vertical
   * joint runs through. `0` is a STACK BOND: real, but nothing is bonded to anything.
   */
  bondOffset?: number;
  /**
   * The shortest stone worth cutting, as a fraction of a whole one. Defaults to `0.45`.
   *
   * **The only reason a course ends on anything but a whole stone.** Before laying, a stone that would
   * strand an uncuttable remainder takes the remainder instead — so every course reaches the edge and no
   * sliver is ever left. Below about `1 − lengthVariance` this governs only the closers; above it, it
   * starts clipping every stone's low-side variance.
   */
  shortestStone?: number;

  /**
   * How much course heights differ from one another. Defaults to `0`.
   *
   * Per COURSE, never within one — a course that is not level is not a course. `0` is ASHLAR; above it is
   * RANDOM COURSED. The courses are jittered and then normalized, so they still sum to `height` exactly.
   */
  courseVariance?: number;
  /** How much stone lengths differ, as a fraction of a whole stone. Defaults to `0.22`. */
  lengthVariance?: number;

  /**
   * Bed the stones in a mortar core. Defaults to `true`.
   *
   * Without it the joints are holes — at a hairline they read as shadow, but open the joint and you see
   * daylight through the wall. `false` is a DRY STONE wall, which is a real thing and wants tight joints.
   */
  mortar?: boolean;
  /**
   * How far the core sits BEHIND the stonework, on EVERY axis. Defaults to `0.014`.
   *
   * Recessed rather than flush: a joint filled level with the face has no shadow and reads as a painted
   * line. Raked back, it reads as a joint. It insets from the wall's ends and head as well as its faces,
   * because the stones themselves stop `joint / 2` short of the nominal extent — a core built to full size
   * would stand proud of the stonework there and ring the wall with a pale edge.
   */
  mortarRecess?: number;
  /** Mortar tint. Defaults to `#b8b2a6`. */
  mortarColor?: string;

  /**
   * How far each stone strays from its bed, in world units. Defaults to `0`.
   *
   * Displacement, not size. Together with {@link StoneWallOptions.tilt} this takes a wall from newly built
   * to long-standing — a stylized read rather than masonry truth, which is why both default to nothing.
   */
  settle?: number;
  /**
   * Max roll per stone, radians, about its own center. Defaults to `0`.
   *
   * Past about `0.038` a stone's corner reaches through the mortar recess, which is the decrepit look and
   * is allowed. Note only the Z component stays in the wall's plane; X and Y tip the stone out of it and
   * are what drive it into the core.
   */
  tilt?: number;

  /** How far each stone sits in or out of the face, in world units. Defaults to `0.006`. */
  depthVariance?: number;
  /** Chance a stone stands notably PROUD. Defaults to `0.12`. */
  proudChance?: number;
  /** How far a proud stone stands out. Defaults to `0.03`. */
  proudDepth?: number;

  /** Base stone tint. Defaults to `#6a6560`. */
  color?: string;
  /** Per-stone tint spread in HSL. Defaults to `0.07` — mostly lightness, barely any hue. */
  colorVariance?: number;
  /** Defaults to `0x2c1a`. */
  seed?: number;
  /** A material to use instead of the default. **Must set `vertexColors: true`**, or every stone goes white. */
  material?: Material;
}

/**
 * A coursed stone wall — **ASHLAR**: squared, dressed stone laid in level courses. Centered on X, foot on
 * `y = 0`, faces on ±Z.
 *
 * The wall is built stone by stone rather than as a slab with lines drawn on it, and three rules make it
 * read as masonry:
 *
 * - **A RUNNING BOND.** Alternate courses start part-way along a stone, so no vertical joint (a PERPEND)
 *   runs through. `bondOffset: 0` gives a stack bond, which is not a bond at all.
 * - **No course ever gives up.** A stone that would strand an uncuttable remainder takes the remainder
 *   instead, so every course reaches the edge and no sliver appears. The same rule {@link layPlankFloor}
 *   lays floors by — it belongs to LAYING, not to floors.
 * - **The joint comes OUT of the stone.** Stone is cut to suit a course, so widening the mortar does not
 *   move the coursing.
 *
 * **Three axes of variance, and they are not interchangeable.** `lengthVariance` and `depthVariance` are
 * per STONE; `courseVariance` is per COURSE, because a course that is not level is not a course. Their
 * ceilings are set low deliberately: variance compounds and ceilings do not, so a wall with this many
 * controls needs each one reined in.
 *
 * `settle` and `tilt` are **displacement**, not size — where a stone ended up rather than how big it is —
 * and are a stylized, decrepit read rather than masonry truth. Both default to nothing.
 *
 * **One geometry, one material, one draw call** at any size. Every stone differs, so they merge; the tint
 * rides a vertex attribute rather than a material group, which is what keeps it to a single call.
 *
 * @example
 * ```ts
 * const wall = new StoneWall({ width: 6, height: 4, seed: 12 });
 * scene.add(wall);
 * wall.stoneCount;  // stones laid
 * wall.closerCount; // how many were cut short to finish a course
 * ```
 */
export class StoneWall extends Group {
  readonly mesh: Mesh;

  /** Stones laid. */
  readonly stoneCount: number;
  /** Courses laid — fitted to `height`, so not necessarily `height / courseHeight`. */
  readonly courseCount: number;
  /** The course height actually used. */
  readonly courseHeight: number;
  /** Stones cut short to finish a course. */
  readonly closerCount: number;
  /** Stones that came out standing proud. */
  readonly proudCount: number;

  readonly #geometry: BufferGeometry;
  readonly #material: Material;
  readonly #ownsMaterial: boolean;

  constructor({
    width = 3.2,
    height = 3,
    thickness = 0.34,
    courseHeight = 0.26,
    stoneAspect = 2.2,
    joint = 0.012,
    bondOffset = 0.5,
    shortestStone = 0.45,
    courseVariance = 0,
    lengthVariance = 0.22,
    mortar = true,
    mortarRecess = 0.014,
    mortarColor = "#b8b2a6",
    settle = 0,
    tilt = 0,
    depthVariance = 0.006,
    proudChance = 0.12,
    proudDepth = 0.03,
    color = "#6a6560",
    colorVariance = 0.07,
    seed = 0x2c1a,
    material,
  }: StoneWallOptions = {}) {
    super();

    const random = mulberry32(seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(color);
    const tint = new Color();

    const courses = Math.max(1, Math.round(height / courseHeight));

    // Course heights vary ACROSS courses and never within one. They must still sum to the wall exactly, so
    // this is slack absorption: jitter every course, then normalize the set. Jittering independently and
    // hoping would strand a remainder at the top — the runt problem standing on its end.
    const weights = Array.from({ length: courses }, () => 1 + signed(courseVariance));
    const weightTotal = weights.reduce((sum, w) => sum + w, 0);
    const heights = weights.map((w) => (w / weightTotal) * height);

    const stones: BufferGeometry[] = [];
    let closers = 0;
    let proud = 0;

    const paint = (geometry: BufferGeometry, tone: Color) => {
      const count = geometry.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tone.r;
        colors[i * 3 + 1] = tone.g;
        colors[i * 3 + 2] = tone.b;
      }
      geometry.setAttribute("color", new BufferAttribute(colors, 3));
      stones.push(geometry);
    };

    let below = 0;
    for (let c = 0; c < courses; c++) {
      const course = heights[c]!;
      // A taller course carries proportionally longer stones — the aspect belongs to the stone.
      const nominal = course * stoneAspect;
      const y = below + course / 2;
      below += course;

      const offset = (c % 2) * nominal * bondOffset;
      const shortest = nominal * shortestStone;
      let x = 0;

      while (x < width - 1e-6) {
        const remaining = width - x;
        // A course opens with a CLOSER taking up the bond offset, rather than hanging a whole stone off
        // the corner.
        const wanted =
          c % 2 === 1 && x === 0 && offset > 1e-6
            ? Math.max(offset, shortest)
            : nominal * (1 + signed(lengthVariance));

        let length = Math.min(Math.max(wanted, shortest), remaining);
        // NO RUNT. If putting this stone in would strand a remainder too short to cut, take the remainder
        // now. Without it the last stone is whatever is left — sometimes a sliver, and sometimes so little
        // that the course gives up short of the edge.
        if (remaining - length < shortest) length = remaining;
        if (length < nominal * 0.75) closers++;

        const cut = Math.max(length - joint, course * 0.15);

        // Depth. Every stone sits a little in or out, and a few stand notably proud. The stone is GROWN or
        // SHRUNK rather than slid, so its back stays flush — sliding would open a hole behind every proud
        // stone, and the through-joints would show it.
        let out = signed(depthVariance);
        if (random() < proudChance) {
          out += proudDepth * (0.7 + random() * 0.9);
          proud++;
        }
        const depth = Math.max(course * 0.15, thickness + out);

        const block = new BoxGeometry(cut, course - joint, depth);
        // Rotate about the stone's own center first, then move it — the geometry is born centered, so this
        // is a spin in place rather than a swing about the wall's origin.
        if (tilt > 0) {
          block.rotateX(signed(tilt));
          block.rotateY(signed(tilt));
          block.rotateZ(signed(tilt));
        }
        block.translate(
          x + length / 2 + signed(settle),
          y + signed(settle),
          (depth - thickness) / 2 + signed(settle),
        );

        tint
          .copy(base)
          .offsetHSL(signed(colorVariance) / 4, signed(colorVariance) / 2, signed(colorVariance));
        paint(block, tint);

        x += length;
      }
    }

    // The mortar core: one box behind everything, recessed from EVERY face so each joint reads as a joint
    // rather than a hole. Painted with the same vertex colors, so the wall is still one draw call.
    //
    // Recessed on all three axes, not just the thickness. The stones do not reach the wall's nominal
    // extent — each is `length - joint` wide and `course - joint` tall, so the stonework stops `joint / 2`
    // short at every edge. A core built to the full width and height therefore stands PROUD of the
    // stonework at the ends and at the head, and its pale edge reads as a band round the wall. Which is
    // exactly wrong: the core is meant to be the thing you glimpse BEHIND the stones, never past them.
    if (mortar) {
      const inset = (extent: number) => Math.max(extent * 0.15, extent - mortarRecess * 2);
      const core = new BoxGeometry(inset(width), inset(height), inset(thickness));
      core.translate(width / 2, height / 2, 0);
      paint(core, new Color(mortarColor));
    }

    const merged = mergeGeometries(stones, false);
    stones.forEach((part) => part.dispose());
    if (!merged) throw new Error("StoneWall: merge failed — the wall may be smaller than one stone.");
    // Centered on X, foot on y = 0.
    merged.translate(-width / 2, 0, 0);

    this.#ownsMaterial = material === undefined;
    this.#material =
      material ??
      // White, so the vertex color lands as the exact tint rather than multiplying into it.
      new MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      });

    this.#geometry = merged;
    this.stoneCount = stones.length - (mortar ? 1 : 0);
    this.courseCount = courses;
    this.courseHeight = height / courses;
    this.closerCount = closers;
    this.proudCount = proud;

    this.mesh = new Mesh(merged, this.#material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
  }

  /** Releases the merged geometry, and the material when this wall made it. */
  dispose(): void {
    this.#geometry.dispose();
    if (this.#ownsMaterial) this.#material.dispose();
  }
}

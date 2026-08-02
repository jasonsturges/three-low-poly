import { BoxGeometry, BufferAttribute, BufferGeometry, Color } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../../utils/Random";

/**
 * How the two returns vary from course to course. Every pattern in the catalogue is a rule for two
 * numbers, which is why one construction covers them all.
 *
 * - `"straight"` — equal returns, every course the same. Reads as a plain stacked column.
 * - `"alternating"` — the long face swaps walls each course. This is TOOTHING: it reads as though the two
 *   walls are bonded into one another rather than merely meeting, which is the classic quoin.
 * - `"staggered"` — one leg varies and the other holds. A softer step that keeps a clean line on one wall.
 */
export type QuoinPattern = "straight" | "alternating" | "staggered";

export interface QuoinStackGeometryOptions {
  /** How tall the stack runs. Defaults to `2.8`. */
  height?: number;
  /**
   * Target course height. Defaults to `0.26`.
   *
   * Fitted to `height`, so it never leaves a sliver at the top. Give it the wall's own course height and
   * the quoins line up with the coursing.
   */
  courseHeight?: number;
  /** See {@link QuoinPattern}. Defaults to `"alternating"`. */
  pattern?: QuoinPattern;
  /** The longer return. Defaults to `0.44`. */
  longLeg?: number;
  /** The shorter return. Defaults to `0.22`. Ignored by `"straight"`, which uses `longLeg` for both. */
  shortLeg?: number;
  /**
   * Lay a quoin on every other course, leaving the wall showing between — "teeth of a comb". Defaults to
   * `false`. The pattern still advances per quoin LAID, so gapping and alternating compose rather than
   * cancelling.
   */
  everyOther?: boolean;
  /**
   * Which phase the pattern starts on, `0` or `1`. Defaults to `0`.
   *
   * Two corners of one building want opposite phases, or the pattern mirrors instead of continuing round.
   */
  phase?: number;
  /**
   * The wall's thickness — what the stack is standing at the corner of. Defaults to `0.34`.
   *
   * Together with `proud` this places the stack's outer corner. See the note on the origin below.
   */
  wallThickness?: number;
  /**
   * How far the stack stands out of BOTH wall faces. Defaults to `0.032`.
   *
   * Most of why a corner reads as dressed rather than merely turned. On a 340mm wall: under 0.02 is a
   * shadow line, 0.02–0.045 is clearly proud, past that is RUSTICATED. **Not optional at 0** — flush would
   * land the quoin's end exactly coplanar with the other wall's face, and two coplanar surfaces fight.
   */
  proud?: number;
  /** Base stone tint. Defaults to `#d6ccb6` — dressed limestone, paler than the wall it turns. */
  color?: string;
  /** Per-quoin tint spread in HSL. Defaults to `0.025`. A delivery of dressed stone is fairly uniform. */
  colorVariance?: number;
  /**
   * Shade alternate courses light and dark. Defaults to `false`.
   *
   * **Only correct because ONE stack owns the corner.** A real corner is built by two walls contributing
   * alternate courses; were this two stacks, each would need a UNIFORM tint opposite its neighbour, since
   * both alternating in step gives light, light, dark, dark. Ownership decides the rule.
   */
  alternateTint?: boolean;
  /** Defaults to `0x2c1a`. */
  seed?: number;
}

/**
 * The dressed stones at a building's external corner.
 *
 * **A quoin is not an L-shaped block.** It is a rectangular stone laid so it shows a LONG face on one wall
 * and a SHORT end on the other, and every pattern in the catalogue is just a rule for those two returns
 * per course. That is why one construction covers `straight`, `alternating` and `staggered` — nothing
 * differs but two numbers.
 *
 * **The origin is the corner LINE**, where the two walls' centre planes cross — not the stack's own outer
 * corner. So placing it is one line: put it where the walls meet, and `wallThickness` and `proud` carry it
 * out to where a quoin actually sits. The stack runs UP from `y = 0` and its returns run along `−X` and
 * `−Z`, so the outside corner it dresses faces `+X +Z`.
 *
 * ```ts
 * const quoins = new Mesh(new QuoinStackGeometry({ height: 2.8, wallThickness: 0.34 }), stone);
 * quoins.position.set(cornerX, 0, cornerZ);   // where the two walls cross
 * ```
 *
 * Per-course tint rides a **vertex attribute**, so the whole stack is one geometry and one draw call and
 * still varies stone to stone. Give it a material with `vertexColors: true`, or every quoin comes out white.
 *
 * Material groups: none.
 */
export class QuoinStackGeometry extends BufferGeometry {
  /** Quoins laid. */
  readonly quoinCount: number;
  /** Courses the stack was divided into — fitted to `height`. */
  readonly courseCount: number;
  /** The course height actually used. */
  readonly courseHeight: number;

  constructor({
    height = 2.8,
    courseHeight = 0.26,
    pattern = "alternating",
    longLeg = 0.44,
    shortLeg = 0.22,
    everyOther = false,
    phase = 0,
    wallThickness = 0.34,
    proud = 0.032,
    color = "#d6ccb6",
    colorVariance = 0.025,
    alternateTint = false,
    seed = 0x2c1a,
  }: QuoinStackGeometryOptions = {}) {
    super();

    const random = mulberry32(seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(color);
    const tint = new Color();

    const courses = Math.max(1, Math.round(height / courseHeight));
    const step = height / courses;
    const outer = wallThickness / 2 + proud;
    const start = Math.round(phase) % 2;

    const parts: BufferGeometry[] = [];

    for (let c = 0; c < courses; c++) {
      // "Teeth of a comb" — the wall shows between quoins, an accent rather than a structural tie.
      if (everyOther && (c + start) % 2 !== 0) continue;

      // The pattern advances per QUOIN LAID, not per course. Keying it to the course makes gapping and
      // alternating cancel: taking every second course only ever lands on one phase, so the long face
      // stops swapping and the corner silently reverts to straight.
      const swap = (parts.length + start) % 2 === 1;

      let legA = longLeg;
      let legB = shortLeg;
      if (pattern === "straight") {
        legA = longLeg;
        legB = longLeg;
      } else if (pattern === "alternating") {
        legA = swap ? shortLeg : longLeg;
        legB = swap ? longLeg : shortLeg;
      } else {
        legA = swap ? shortLeg : longLeg;
        legB = longLeg;
      }

      const block = new BoxGeometry(legA, step * 0.96, legB);
      block.translate(outer - legA / 2, (c + 0.5) * step, outer - legB / 2);

      const shade = alternateTint && parts.length % 2 === 1 ? -colorVariance : colorVariance;
      tint.copy(base).offsetHSL(signed(colorVariance) / 4, 0, shade * 0.5 + signed(colorVariance) / 2);

      const count = block.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      block.setAttribute("color", new BufferAttribute(colors, 3));
      parts.push(block);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!merged) throw new Error("QuoinStackGeometry: no quoins were laid.");

    this.copy(merged);
    merged.dispose();
    this.computeBoundingSphere();

    this.quoinCount = parts.length;
    this.courseCount = courses;
    this.courseHeight = step;
  }
}

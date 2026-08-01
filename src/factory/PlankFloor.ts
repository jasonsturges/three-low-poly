import {
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WeatheredPlankGeometry } from "../geometry/timber/WeatheredPlankGeometry";
import { mulberry32 } from "../utils/Random";
import { layPlankFloor, type PlankFloorLayoutOptions } from "./PlankFloorLayout";

export interface PlankFloorOptions extends PlankFloorLayoutOptions {
  /** Board thickness. Defaults to `0.055`. */
  plankThickness?: number;
  /**
   * Edge wander per board, as a fraction of its width. Defaults to `0.05`.
   *
   * Most of the floor's character lives here: raised, the boards' edges break up and the run stops
   * repeating; too high and it turns cartoonish, which is a style of its own; low, and the floor reads as
   * planed and refined.
   */
  plankEdgeRoughness?: number;
  /**
   * End skew per board, as a fraction of its width — how far a board's cut ends lean off square. Defaults
   * to `0.06`. The other half of the character, and what makes the butt joints read as sawn rather than
   * machined.
   */
  plankEndSkew?: number;
  /**
   * Broad bow per board, as a fraction of its thickness. Defaults to `0.12`. Nailed flooring cannot bow
   * much, so this stays low; it mostly catches the light.
   */
  plankBow?: number;
  /** Base timber colour. Defaults to `#6b4b2c`. Ignored when `tints` is given. */
  color?: string;
  /**
   * Per-board tint spread in HSL, so no two boards match. Defaults to `0.06`.
   *
   * Sampled ± about {@link PlankFloorOptions.color}, hue a third as far as saturation and lightness —
   * timber from one delivery varies in depth far more than in hue.
   */
  colorVariance?: number;
  /**
   * Deal boards from a fixed palette instead of varying them continuously.
   *
   * Costs nothing extra — the tint still rides the same vertex attribute — and reads as a delivery of
   * mixed timber rather than a run of one board dyed slightly differently each time.
   */
  tints?: string[];
  /** A material to use instead of the default. **Must set `vertexColors: true`**, or every board goes white. */
  material?: Material;
}

/**
 * A boarded floor, **laid rather than tiled**. Walking surface on `y = 0`, boards running along X, centred
 * on the origin.
 *
 * The laying is {@link layPlankFloor} — rows of boards butted end to end, joints staggered from the row
 * alongside, a shortened starter board, and no runt at the end of a run. Read that for the reasoning; this
 * factory only decides what the boards are *made of*.
 *
 * **Baked to a single geometry and a single material**, whatever the floor's size. Every board is its own
 * {@link WeatheredPlankGeometry} with its own seed, so no two repeat — and differing items merge where
 * identical ones would instance. Per-board colour rides a **vertex attribute** rather than a material
 * group, which is what keeps it to one draw call: a palette would otherwise cost one group, and one draw
 * call, per tint. The board's whole shell gets one colour, so it reads as a board rather than a gradient.
 *
 * **Rotation is deliberately absent.** These boards are deformed individually and butt end-grain to
 * end-grain; laying them diagonally would need every perimeter board cut to the room, which is a different
 * construction rather than an option on this one.
 *
 * Material groups: none.
 *
 * @example
 * ```ts
 * const floor = new PlankFloor({ length: 6, depth: 4, seed: 12 });
 * scene.add(floor);
 * floor.plankCount;   // how many boards it took
 * floor.closestJoint; // how close two neighbouring joints came — compare to minStagger
 * ```
 */
export class PlankFloor extends Group {
  readonly mesh: Mesh;

  /** Boards laid. */
  readonly plankCount: number;
  /** Rows across the floor's depth. */
  readonly rowCount: number;
  /** The width each board actually got, after the rows were fitted to `depth`. */
  readonly plankWidth: number;
  /** How close any two neighbouring-row joints came. Compare to `minStagger`. */
  readonly closestJoint: number;

  readonly #geometry: BufferGeometry;
  readonly #material: Material;
  readonly #ownsMaterial: boolean;

  constructor({
    plankThickness = 0.055,
    plankEdgeRoughness = 0.05,
    plankEndSkew = 0.06,
    plankBow = 0.12,
    color = "#6b4b2c",
    colorVariance = 0.06,
    tints,
    material,
    ...layout
  }: PlankFloorOptions = {}) {
    super();

    const { placements, rows, plankWidth, closestJoint } = layPlankFloor(layout);
    const seed = layout.seed ?? 0x51ab;
    // A separate stream from the layout's, so changing a colour cannot move a board.
    const random = mulberry32(seed ^ 0x9e3779b9);

    this.#ownsMaterial = material === undefined;
    this.#material =
      material ??
      // White, so the vertex colour lands as the exact tint rather than multiplying into it — the same
      // trick `PumpkinPatch` plays with its rind.
      new MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });

    const base = new Color(color);
    const palette = tints?.map((t) => new Color(t));
    const tint = new Color();
    const signed = (spread: number) => (random() * 2 - 1) * spread;

    const boards: BufferGeometry[] = [];

    for (const { start, length, across, sequence } of placements) {
      const board = new WeatheredPlankGeometry({
        length,
        width: plankWidth,
        thickness: plankThickness,
        seed: seed + sequence * 37,
        roughness: plankEdgeRoughness,
        endSkew: plankEndSkew,
        bow: plankBow,
      });
      // The board is authored lying in XY with its thickness on Z; a quarter turn about X lays it flat,
      // width across Z and thickness on Y.
      board.rotateX(Math.PI / 2);
      board.translate(start + length / 2, -plankThickness / 2, across);

      if (palette && palette.length > 0) {
        tint.copy(palette[sequence % palette.length]!);
      } else {
        // Hue drifts a third as far as saturation and lightness: one delivery of timber varies in depth,
        // not in species.
        tint
          .copy(base)
          .offsetHSL(signed(colorVariance) / 3, signed(colorVariance), signed(colorVariance));
      }

      // One colour for the WHOLE board, so it reads as a board rather than a gradient across it.
      const count = board.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      board.setAttribute("color", new BufferAttribute(colors, 3));

      boards.push(board);
    }

    // Centre the run so the floor sits on the origin like every other assembly.
    const merged = mergeGeometries(boards, false);
    boards.forEach((part) => part.dispose());
    if (!merged) throw new Error("PlankFloor: merge failed.");
    merged.translate(-(layout.length ?? 2.5) / 2, 0, 0);

    this.#geometry = merged;
    this.plankCount = placements.length;
    this.rowCount = rows;
    this.plankWidth = plankWidth;
    this.closestJoint = closestJoint;

    this.mesh = new Mesh(merged, this.#material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
  }

  /** Releases the merged geometry, and the material when this floor made it. */
  dispose(): void {
    this.#geometry.dispose();
    if (this.#ownsMaterial) this.#material.dispose();
  }
}

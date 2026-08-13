import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "../utils/GeometryBuffers";
import { mulberry32 } from "../utils/Random";
import { layPlankFloor, type PlankFloorLayoutOptions } from "./PlankFloorLayout";

export interface HardwoodFloorOptions extends Omit<PlankFloorLayoutOptions, "length" | "depth"> {
  /** Room extent along X. Defaults to `5`. */
  width?: number;
  /** Room extent along Z. Defaults to `4`. */
  depth?: number;
  /**
   * Which way the boards run, in radians. Defaults to `0` — along the room's width.
   *
   * `Math.PI / 4` is the classic diagonal. Any angle works: the boards are laid on a sheet sized to cover
   * the room and then cut to it, so nothing here is a special case.
   */
  rotation?: number;
  /** Board thickness. Defaults to `0.055`. */
  plankThickness?: number;
  /**
   * Smallest offcut worth laying, in square units. Defaults to `0.004`.
   *
   * Cutting boards to a room leaves scraps, and past some size a scrap is not a board. Where that line
   * sits is a judgment rather than a calculation — set it to `0` and the corners fill with needles; set it
   * high and real boards go in the bin, leaving a visible notch at the wall.
   */
  minSliverArea?: number;
  /** Base timber color. Defaults to `#6b4b2c`. */
  color?: string;
  /** Per-board tint spread in HSL, so no two boards match. Defaults to `0.06`. */
  colorVariance?: number;
  /** A material to use instead of the default. **Must set `vertexColors: true`**, or every board goes white. */
  material?: Material;
}

/** A point on the floor plane: `[x, z]`. */
type Point = [number, number];

/**
 * Sutherland–Hodgman, against one half-plane at a time.
 *
 * Clipping a convex polygon by a convex region gives a convex polygon, so the room's four edges can be
 * applied one after another and the result stays well-behaved — which is what lets the perimeter boards be
 * fanned rather than ear-clipped.
 */
const clipHalfPlane = (
  polygon: Point[],
  inside: (p: Point) => boolean,
  cross: (a: Point, b: Point) => Point,
): Point[] => {
  const out: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const aIn = inside(a);
    const bIn = inside(b);
    if (aIn) out.push(a);
    if (aIn !== bIn) out.push(cross(a, b));
  }
  return out;
};

/** A board's outline, cut to the room. Empty when the board lies entirely outside. */
const clipToRoom = (polygon: Point[], halfWidth: number, halfDepth: number): Point[] => {
  const lerp = (a: Point, b: Point, t: number): Point => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  let result = polygon;
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= -halfWidth, (a, b) => lerp(a, b, (-halfWidth - a[0]) / (b[0] - a[0]))],
    [(p) => p[0] <= halfWidth, (a, b) => lerp(a, b, (halfWidth - a[0]) / (b[0] - a[0]))],
    [(p) => p[1] >= -halfDepth, (a, b) => lerp(a, b, (-halfDepth - a[1]) / (b[1] - a[1]))],
    [(p) => p[1] <= halfDepth, (a, b) => lerp(a, b, (halfDepth - a[1]) / (b[1] - a[1]))],
  ];
  for (const [inside, cross] of edges) {
    if (result.length === 0) return result;
    result = clipHalfPlane(result, inside, cross);
  }
  return result;
};

const areaOf = (polygon: Point[]): number => {
  let twice = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(twice) / 2;
};

/** A flat board: the clipped outline, given thickness. Convex, so a fan tiles both faces. */
const prism = (polygon: Point[], thickness: number): BufferGeometry => {
  const buffers = createGeometryBuffers();
  const top = (i: number): Vec3 => [polygon[i]![0], 0, polygon[i]![1]];
  const bottom = (i: number): Vec3 => [polygon[i]![0], -thickness, polygon[i]![1]];

  for (let i = 1; i < polygon.length - 1; i++) {
    pushTriangle(buffers, [top(0), top(i + 1), top(i)], [0, 1, 0]);
    pushTriangle(buffers, [bottom(0), bottom(i), bottom(i + 1)], [0, -1, 0]);
  }
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    pushQuad(buffers, [top(i), top(j), bottom(j), bottom(i)], undefined);
  }
  return toBufferGeometry(buffers);
};

/**
 * A hardwood floor of planed boards, laid at any angle and **cut to the room**. Walking surface on
 * `y = 0`, centered on the origin.
 *
 * The laying is {@link layPlankFloor} — the same rows, stagger, starter boards and no-runt rule the rustic
 * {@link PlankFloor} uses. It never learns that the rows are not square to the room: the boards are laid on
 * a sheet sized to COVER the room, then each is clipped to the room's outline and the overhang thrown away.
 *
 * **Clipped, not mitered.** A board crossing a corner comes back with five or six sides, which no pair of
 * cut planes on a swept box can express. Clipping handles it, handles every other case with the same code,
 * and at `rotation: 0` is a no-op — so the general case costs nothing when it is not needed. Measured, the
 * boards cover the room to within the row gaps at every angle.
 *
 * **Baked to a single geometry and a single material** at any size. Every board is a different shape once
 * cut, and differing items merge where identical ones would instance; per-board color rides a vertex
 * attribute rather than a material group, which is what keeps it to one draw call.
 *
 * A cut board at the wall is not a defect. **A wall is a boundary condition, not the end of the floor** —
 * a carpenter cuts what the room demands, and the offcuts at a diagonal's corners are what the style looks
 * like. `minSliverArea` decides only how small a scrap is still worth laying.
 *
 * Material groups: none.
 *
 * @example
 * ```ts
 * const floor = new HardwoodFloor({ width: 6, depth: 4, rotation: Math.PI / 4, seed: 12 });
 * scene.add(floor);
 * floor.boardCount;   // laid
 * floor.clippedCount; // how many met a wall
 * floor.sliverCount;  // how many offcuts were too small to lay
 * ```
 */
export class HardwoodFloor extends Group {
  readonly mesh: Mesh;

  /** Boards laid. */
  readonly boardCount: number;
  /** Of those, how many were cut by a wall. Zero at `rotation: 0`. */
  readonly clippedCount: number;
  /** Offcuts discarded for being smaller than `minSliverArea`. */
  readonly sliverCount: number;
  /** Rows across the laying sheet. */
  readonly rowCount: number;
  /** The width each board actually got. */
  readonly plankWidth: number;
  /** How close any two neighboring-row joints came. Compare to `minStagger`. */
  readonly closestJoint: number;

  readonly #geometry: BufferGeometry;
  readonly #material: Material;
  readonly #ownsMaterial: boolean;

  constructor({
    width = 5,
    depth = 4,
    rotation = 0,
    plankThickness = 0.055,
    minSliverArea = 0.004,
    color = "#6b4b2c",
    colorVariance = 0.06,
    material,
    ...layout
  }: HardwoodFloorOptions = {}) {
    super();

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    // The laying frame has to COVER the room, not match it. A rotated rectangle's extent along the run is
    // the room's own extents projected onto that axis, so a diagonal floor is laid on a bigger sheet and
    // the overhang is cut away.
    const extentAlong = width * Math.abs(cos) + depth * Math.abs(sin);
    const extentAcross = width * Math.abs(sin) + depth * Math.abs(cos);

    const { placements, rows, plankWidth, closestJoint } = layPlankFloor({
      ...layout,
      length: extentAlong,
      depth: extentAcross,
    });

    const seed = layout.seed ?? 0x51ab;
    // A separate stream from the layout's, so changing a color cannot move a board.
    const random = mulberry32(seed ^ 0x9e3779b9);
    const base = new Color(color);
    const tint = new Color();
    const signed = (spread: number) => (random() * 2 - 1) * spread;

    const boards: BufferGeometry[] = [];
    const halfBoard = plankWidth / 2;
    let clipped = 0;
    let slivers = 0;

    for (const { start, length, across } of placements) {
      const u0 = start - extentAlong / 2;
      const u1 = u0 + length;
      const toWorld = (u: number, v: number): Point => [u * cos - v * sin, u * sin + v * cos];
      const cut = clipToRoom(
        [
          toWorld(u0, across - halfBoard),
          toWorld(u1, across - halfBoard),
          toWorld(u1, across + halfBoard),
          toWorld(u0, across + halfBoard),
        ],
        halfWidth,
        halfDepth,
      );

      if (cut.length < 3) continue; // entirely outside the room
      if (cut.length !== 4) clipped++;
      if (areaOf(cut) < minSliverArea) {
        slivers++;
        continue;
      }

      const board = prism(cut, plankThickness);
      // Hue drifts a third as far as saturation and lightness: one delivery of timber varies in depth,
      // not in species.
      tint.copy(base).offsetHSL(signed(colorVariance) / 3, signed(colorVariance), signed(colorVariance));

      // One color for the WHOLE board, so it reads as a board rather than a gradient across it.
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

    const merged = mergeGeometries(boards, false);
    boards.forEach((part) => part.dispose());
    if (!merged) throw new Error("HardwoodFloor: merge failed — the room may be smaller than one board.");

    this.#ownsMaterial = material === undefined;
    this.#material =
      material ??
      // White, so the vertex color lands as the exact tint rather than multiplying into it.
      new MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });

    this.#geometry = merged;
    this.boardCount = boards.length;
    this.clippedCount = clipped;
    this.sliverCount = slivers;
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

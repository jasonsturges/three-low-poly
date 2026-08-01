import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createGeometryBuffers,
  layPlankFloor,
  mulberry32,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Rotated Plank Floor",
  description:
    "STUDY — the same laying rules as the shipped Plank Floor, run at an ANGLE. `layPlankFloor` returns " +
    "placements rather than geometry, so it does not care that the rows are not aligned with the room; the " +
    "boards are laid in a rotated frame sized to cover the room, then every board is CLIPPED to the room's " +
    "outline. Clipping rather than mitering is the point: a board crossing a corner comes back a pentagon, " +
    "which no cut-plane pair can express, and at 0° the clip is a no-op so nothing is paid for the general " +
    "case. Drag Rotation to 45° for a diagonal floor, or to 30° for a herringbone-ish run. Watch the " +
    "Readout: SLIVERS is the open question — clipping a corner leaves offcuts too small to be a board, and " +
    "how small is too small is a judgement, not a calculation.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  RUN DIRECTION  the way the boards point. 0° runs them along the room's length.
//  DIAGONAL       a floor laid at 45°. Wastes more board and shows more end grain at the walls, which is
//                 exactly why it reads as deliberate.
//  BORDER         a band of boards laid around the perimeter to hide the cut ends of a diagonal field.
//                 Not modelled here; it is the usual answer to the slivers this study exposes.
//  SLIVER         an offcut too small to lay. A real floor's are thrown away, not nailed down.

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
    pushTriangle(buffers, [top(0), top(i), top(i + 1)], [0, 1, 0]);
    pushTriangle(buffers, [bottom(0), bottom(i + 1), bottom(i)], [0, -1, 0]);
  }
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    pushQuad(buffers, [top(i), top(j), bottom(j), bottom(i)], undefined);
  }
  return toBufferGeometry(buffers);
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x1a1712,
    cameraPosition: [3.6, 3.2, 4.4],
  });

  controls.target.set(0, 0, 0);
  controls.update();

  const key = new DirectionalLight(0xfff1dd, 1.5);
  key.position.set(2.5, 4, 2);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-3, 1, -2);
  scene.add(key, bounce);

  const timber = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    rotation: 45,
    width: 5,
    depth: 4,
    plankWidth: 0.2,
    plankThickness: 0.055,
    gap: 0.012,
    minPlankLength: 0.5,
    maxPlankLength: 1.4,
    minStagger: 0.35,
    minSliverArea: 0.004,
    color: "#6b4b2c",
    colorVariance: 0.06,
    seed: 0x51ab,
    wireframe: false,
    laid: "",
    clipped: "",
    budget: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();

    const theta = (params.rotation * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const halfWidth = params.width / 2;
    const halfDepth = params.depth / 2;

    // The laying frame has to COVER the room, not match it. A rotated rectangle's extent along the run is
    // the room's own extents projected onto that axis — so a 45° floor is laid on a bigger sheet and the
    // overhang is thrown away by the clip.
    const extentAlong = params.width * Math.abs(cos) + params.depth * Math.abs(sin);
    const extentAcross = params.width * Math.abs(sin) + params.depth * Math.abs(cos);

    // THE SAME LAYING RULES as the shipped floor. It never learns that the rows are not square to the room.
    const { placements, rows, plankWidth, closestJoint } = layPlankFloor({
      length: extentAlong,
      depth: extentAcross,
      plankWidth: params.plankWidth,
      gap: params.gap,
      minPlankLength: params.minPlankLength,
      maxPlankLength: params.maxPlankLength,
      minStagger: params.minStagger,
      seed: params.seed,
    });

    const random = mulberry32(params.seed ^ 0x9e3779b9);
    const base = new Color(params.color);
    const tint = new Color();
    const signed = (spread: number) => (random() * 2 - 1) * spread;

    const boards: BufferGeometry[] = [];
    let clipped = 0;
    let slivers = 0;
    const halfBoard = plankWidth / 2;

    for (const { start, length, across } of placements) {
      // The board's four corners, in the rotated frame, then turned into the room's.
      const u0 = start - extentAlong / 2;
      const u1 = u0 + length;
      const toWorld = (u: number, v: number): Point => [u * cos - v * sin, u * sin + v * cos];
      const rect: Point[] = [
        toWorld(u0, across - halfBoard),
        toWorld(u1, across - halfBoard),
        toWorld(u1, across + halfBoard),
        toWorld(u0, across + halfBoard),
      ];

      const cut = clipToRoom(rect, halfWidth, halfDepth);
      if (cut.length < 3) continue; // entirely outside the room
      if (cut.length !== 4) clipped++;

      // An offcut too small to lay is thrown away, as it would be on site. Where the threshold sits is a
      // judgement — drop it to zero and the corners fill with needles.
      if (areaOf(cut) < params.minSliverArea) {
        slivers++;
        continue;
      }

      const board = prism(cut, params.plankThickness);
      tint
        .copy(base)
        .offsetHSL(signed(params.colorVariance) / 3, signed(params.colorVariance), signed(params.colorVariance));

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
    if (!merged) return;

    const mesh = new Mesh(merged, timber);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    stage.add(mesh);
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));

    const tris = merged.getAttribute("position").count / 3;
    params.laid = `${boards.length} boards in ${rows} rows · asked stagger ${params.minStagger.toFixed(3)}, got ${closestJoint.toFixed(4)}`;
    params.clipped = `${clipped} cut to the room · ${slivers} slivers thrown away`;
    params.budget = `${tris.toLocaleString()} tris · 1 geometry · 1 material · ${Math.max(1, merged.groups.length)} draw call`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Rotated Plank Floor");

  const run = gui.addFolder("Run");
  // 0 lays them along the room and the clip becomes a no-op. 45 is the classic diagonal.
  run.add(params, "rotation", 0, 90, 1).name("Rotation °").onChange(rebuild);
  run.add(params, "width", 1.5, 14, 0.5).name("Room Width").onChange(rebuild);
  run.add(params, "depth", 1.5, 14, 0.5).name("Room Depth").onChange(rebuild);
  run.open();

  const boardsFolder = gui.addFolder("Boards");
  boardsFolder.add(params, "plankWidth", 0.06, 0.5, 0.01).name("Width").onChange(rebuild);
  boardsFolder.add(params, "plankThickness", 0.02, 0.2, 0.005).name("Thickness").onChange(rebuild);
  boardsFolder.add(params, "gap", 0, 0.05, 0.002).name("Gap Between Rows").onChange(rebuild);
  boardsFolder.add(params, "minPlankLength", 0.2, 3, 0.05).name("Shortest Board").onChange(rebuild);
  boardsFolder.add(params, "maxPlankLength", 0.3, 4, 0.05).name("Longest Board").onChange(rebuild);
  boardsFolder.open();

  const laying = gui.addFolder("Laying");
  laying.add(params, "minStagger", 0, 1.5, 0.01).name("Min Stagger").onChange(rebuild);
  // THE open question of this study. Zero fills the corners with needles; too high eats real boards.
  laying.add(params, "minSliverArea", 0, 0.05, 0.001).name("Min Sliver Area").onChange(rebuild);
  laying.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);
  laying.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Timber").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.25, 0.005).name("Variance").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "clipped").name("Perimeter").listen().disable();
  readout.add(params, "budget").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    timber.dispose();
    wire.dispose();
    dispose();
  };
}

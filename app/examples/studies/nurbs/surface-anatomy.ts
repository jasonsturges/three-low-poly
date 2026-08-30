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
  Path,
  SphereGeometry,
  Vector3,
  Vector4,
} from "three";
import { NURBSSurface } from "three/examples/jsm/curves/NURBSSurface.js";
import {
  archRise,
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  traceArch,
  type ArchStyle,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "NURBS Surface Anatomy",
  description:
    "STUDY — the surface half of NURBS, and the head-to-head this whole thread was building toward. The " +
    "companion to `studies/nurbs/curve-anatomy`; nothing here is proposed for the library. " +
    "A NURBS surface is the curve's construction run in two directions at once: a control NET rather than " +
    "a control polygon, two degrees, two knot vectors, and a weight per control point. Everything true of " +
    "the curve is true twice. The surface does not pass through its net — turn the net on and watch the " +
    "sheet hold inside it, touching only at the four clamped corners. Degree 1 in both directions IS the " +
    "net, faceted; raise it and the surface pulls smooth and slack. Rational still buys exactness: the " +
    "Cylinder preset is the circle's nine control points on a square swept up a straight second " +
    "direction, degree 2 by degree 1, and it is round to machine epsilon for the same reason and by the " +
    "same weights. " +
    "THE FINDING is what happens on the vault cell, and it is a real difference in kind rather than in " +
    "quality. A NURBS surface APPROXIMATES its control net. A Coons patch INTERPOLATES its boundary " +
    "curves. Those are not two ways of doing one thing. Give the NURBS surface a control net sampled from " +
    "the vault's own Coons patch — the most favorable input available, geometry that is already exactly " +
    "right — and its edges still miss the ribs, because approximating is what the representation does. " +
    "The Coons patch sits at 1e-15 on the same cell without being fitted to anything, because " +
    "interpolation is what ITS construction does. " +
    "To make a NURBS surface meet given boundaries you have to SOLVE — fit a net whose surface passes " +
    "through the curves you want, which is a linear system and the thing CAD is quietly doing when you " +
    "pick Loft or Network Surface. That solve is the price of the representation, and what it buys back " +
    "is real: one exact, resolution-independent, editable surface with G1 or G2 continuity across " +
    "patches, tessellated to whatever density you like at the end. For manufacturing that is worth almost " +
    "any price. For a faceted low-poly vault it is worth nothing, because the facets are the aesthetic " +
    "and `segments` is a feature rather than an approximation to be minimized. " +
    "Set Degree U and Degree V to 1 and only HALF the gap closes, which is more instructive than all of " +
    "it closing. Net Deviation goes to exactly 0 — a degree-1 B-spline surface passes THROUGH its net — " +
    "while the boundary error falls only to 1.41e-1, because the net is a 5x5 SAMPLE of the ribs and the " +
    "surface's edge is now a five-point chord of a curve. Raise Net Size and it keeps shrinking without " +
    "ever arriving: 5.51e-1 at 3, 1.41e-1 at 5, 3.15e-2 at 9, 1.35e-2 at 15, 6.76e-3 at 29. The Coons " +
    "patch reads 5.44e-16 on the same cell, from three curves and no net at all. That is the whole " +
    "argument in one line — NURBS needs DENSITY to approximate what the boundary construction gets " +
    "exactly, because the boundary construction was handed the curves themselves rather than a sampling " +
    "of them. And raising the DEGREE moves it the wrong way: 1.41e-1 at degree 1, 4.34e-1 at 2, 5.48e-1 " +
    "at 3, 9.02e-1 at 4, because a higher degree pulls the surface further inside its own net. More " +
    "smoothness buys less fidelity here, which is the trade stated as bluntly as it can be. " +
    "The Sail preset is the shape from the tutorials, and it is worth seeing why it is genuinely a good " +
    "fit: a sail has no boundary anyone is trying to match to the millimeter, it wants smooth curvature " +
    "everywhere, and its draft is adjusted by dragging control points — which is exactly what a control " +
    "net is FOR. The vault is the opposite case. Same tool, and the answer flips.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CONTROL NET   the grid of control points a surface is blended from. The 2-D control polygon.
//  DEGREE U / V  the two degrees, one per parameter direction. They are independent.
//  ISOPARM       a curve on the surface holding one parameter fixed. The grid you see when it is drawn.
//  APPROXIMATE   pass NEAR the defining points. What a B-spline surface does above degree 1.
//  INTERPOLATE   pass THROUGH them. What a Coons patch does with its boundaries, and what a B-spline
//                surface only does at degree 1 or after a fit is solved.
//  FIT / SOLVE   finding a control net whose surface interpolates given curves. A linear system, and the
//                step CAD performs silently behind Loft and Network Surface.
//  DRAFT         a sail's camber — the depth of its curvature. Adjusted by moving control points, which
//                is the case a control net suits perfectly.
//
//  Deliberately NOT here: the fit itself, trimming, and multi-patch continuity (G1/G2 across seams).
//  The first is the honest next step; the other two are why real CAD is large.

type Preset = "net" | "cylinder" | "sail" | "vault";

/** A sampled curve. The vault's ribs and the Coons patch both speak in these. */
type Curve = Vector3[];

/** One cell of the vault — the four Coons boundaries, with the boss edge collapsed to a point. */
interface Cell {
  wall: Curve;
  left: Curve;
  right: Curve;
  boss: Vector3;
}

const S = Math.SQRT1_2;

//------------------------------
//  Knots
//------------------------------

/**
 * A clamped, uniform knot vector. Length is always `points + degree + 1`, which is an identity rather
 * than a convention — get it wrong and the surface fails to construct rather than looking wrong.
 *
 * Clamping repeats the end knots `degree + 1` times, which is what pins the surface to the four corners
 * of its net. Every net here is clamped in both directions.
 */
function clampedKnots(points: number, degree: number): number[] {
  const interior = Math.max(0, points - degree - 1);
  const ends = Array.from({ length: degree + 1 }, () => 0);
  const inner = Array.from({ length: interior }, (_, i) => (i + 1) / (interior + 1));
  return [...ends, ...inner, ...ends.map(() => 1)];
}

//------------------------------
//  The vault cell — kept local, because a study keeps its own code
//------------------------------

/** One rib, sampled by ARC LENGTH from springing to springing over the crown. */
function ribCurve(from: Vector3, to: Vector3, rise: number, style: ArchStyle, samples: number): Curve {
  const halfSpan = from.distanceTo(to) / 2;
  const path = new Path();
  path.moveTo(halfSpan, 0);
  traceArch(path, { style, x: 0, y: 0, halfSpan, rise, from: "right", to: "left" });

  return path.getSpacedPoints(samples).map((p) => {
    const t = (halfSpan - p.x) / (2 * halfSpan);
    return new Vector3().lerpVectors(from, to, t).setY(from.y + p.y);
  });
}

/**
 * A single cell of a quadripartite bay — one wall arch and two half-diagonals meeting at the boss.
 *
 * THE DIAGONAL SETS THE CROWN: it spans furthest, so its natural rise fixes the crown and the wall arch
 * is built to reach it. The rule comes from `RibVaultGeometry` in the pipe-organ scene, and the fuller
 * treatment with all four cells is `studies/surface/boundary-curves`.
 */
function vaultCell(width: number, depth: number, rise: number, style: ArchStyle, samples: number): Cell {
  const hw = width / 2;
  const hd = depth / 2;
  const a = new Vector3(-hw, 0, -hd);
  const b = new Vector3(hw, 0, -hd);

  const diagonalRise = archRise({ style, y: 0, halfSpan: Math.hypot(width, depth) / 2, rise });
  const boss = new Vector3(0, diagonalRise, 0);

  return {
    wall: ribCurve(a, b, diagonalRise, style, samples),
    left: ribCurve(a, new Vector3(hw, 0, hd), diagonalRise, style, samples * 2).slice(0, samples + 1),
    right: ribCurve(b, new Vector3(-hw, 0, hd), diagonalRise, style, samples * 2).slice(0, samples + 1),
    boss,
  };
}

/** Sample a curve at parameter `t`, linearly between its stations. */
function at(curve: Curve, t: number): Vector3 {
  const last = curve.length - 1;
  const x = Math.min(last, Math.max(0, t * last));
  const i = Math.min(last - 1, Math.floor(x));
  return curve[i]!.clone().lerp(curve[i + 1]!, x - i);
}

/** The Coons patch: `Lu + Lv − B`. Interpolates all four boundaries by construction, with no fit. */
function coonsPoint(cell: Cell, u: number, v: number): Vector3 {
  const cornerA = cell.wall[0]!;
  const cornerB = cell.wall[cell.wall.length - 1]!;

  const lu = at(cell.wall, u).multiplyScalar(1 - v).addScaledVector(cell.boss, v);
  const lv = at(cell.left, v).multiplyScalar(1 - u).addScaledVector(at(cell.right, v), u);
  const b = cornerA
    .clone()
    .multiplyScalar((1 - u) * (1 - v))
    .addScaledVector(cornerB, u * (1 - v))
    .addScaledVector(cell.boss, v);

  return lu.add(lv).sub(b);
}

//------------------------------
//  Control nets
//------------------------------

interface Net {
  points: Vector4[][];
  degreeU: number;
  degreeV: number;
  knotsU?: number[];
  knotsV?: number[];
  cell?: Cell;
  label: string;
}

/**
 * Four nets, each answering a different question.
 *
 * `net`      A plain freeform grid, for the degree dials to work on. The surface visibly holds inside it.
 * `cylinder` RATIONAL, in 2-D: the circle's nine control points on a square in u, a straight run in v.
 *            Exact to machine epsilon for the same reason the curve was — the weights.
 * `sail`     A triangular sail with camber. The case a control net genuinely suits: no boundary needs
 *            matching to a tolerance, curvature should be smooth everywhere, and the draft is adjusted
 *            by moving points, which is exactly what a net is for.
 * `vault`    The head-to-head. The net is SAMPLED FROM the vault's own Coons patch — the most favorable
 *            input available, geometry already exactly right — and the surface still misses the ribs,
 *            because approximating its net is what the representation does.
 */
function buildNet(preset: Preset, degreeU: number, degreeV: number, size: number, weight: number, bay: {
  width: number;
  depth: number;
  rise: number;
  style: ArchStyle;
}): Net {
  if (preset === "cylinder") {
    // u runs around the circle (degree 2, rational); v runs straight up (degree 1). The v direction is
    // linear on purpose — a cylinder is only curved one way, and saying so costs nothing.
    const ring: [number, number, number][] = [
      [1, 0, 1], [1, 1, S], [0, 1, 1], [-1, 1, S],
      [-1, 0, 1], [-1, -1, S], [0, -1, 1], [1, -1, S], [1, 0, 1],
    ];
    return {
      // The dial SCALES the corner weights, so 1.00 leaves them at cos 45° and the cylinder is exact.
      // Dialing the weight directly instead silently makes the default 1.0, and the "exact" preset is
      // then not a circle at all — which is exactly the bug this line shipped with.
      points: ring.map(([x, z, w]) => {
        const scaled = w < 1 ? w * weight : w;
        return [
          new Vector4(x * 1.2, -1, z * 1.2, scaled),
          new Vector4(x * 1.2, 1, z * 1.2, scaled),
        ];
      }),
      degreeU: 2,
      degreeV: 1,
      knotsU: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1],
      knotsV: [0, 0, 1, 1],
      label: "the circle's net, run up a straight second direction — exact by weights alone",
    };
  }

  if (preset === "vault") {
    const cell = vaultCell(bay.width, bay.depth, bay.rise, bay.style, 24);
    const n = Math.max(3, size);
    return {
      // Sampled from the Coons patch itself. Nothing fairer could be handed to it.
      points: Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
          const p = coonsPoint(cell, i / (n - 1), j / (n - 1));
          return new Vector4(p.x, p.y, p.z, 1);
        }),
      ),
      degreeU,
      degreeV,
      cell,
      label: "net sampled FROM the Coons patch — and the surface still misses the ribs",
    };
  }

  if (preset === "sail") {
    const n = Math.max(3, size);
    // Luff up the mast, foot along the boom, leech falling between them — narrowing toward the head,
    // with camber blown out to leeward. The taper is what makes it a sail rather than a bedsheet.
    return {
      points: Array.from({ length: n }, (_, i) => {
        const u = i / (n - 1);
        return Array.from({ length: n }, (_, j) => {
          const v = j / (n - 1);
          const chord = 1 - 0.82 * u;
          const camber = Math.sin(Math.PI * v) * Math.sin(Math.PI * u * 0.85) * 0.55 * weight;
          return new Vector4(v * chord * 2.4 - 0.2, u * 3, camber, 1);
        });
      }),
      degreeU,
      degreeV,
      label: "the tutorial shape — and the case a control net is genuinely right for",
    };
  }

  const n = Math.max(3, size);
  return {
    points: Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const u = i / (n - 1);
        const v = j / (n - 1);
        const y = Math.sin(u * Math.PI * 1.4) * Math.cos(v * Math.PI * 1.2) * 1.1 * weight;
        return new Vector4(u * 3 - 1.5, y, v * 3 - 1.5, 1);
      }),
    ),
    degreeU,
    degreeV,
    label: "a plain net — the surface holds INSIDE it, touching only the four clamped corners",
  };
}

//------------------------------
//  Meshing
//------------------------------

/** Stitch an open grid into a surface. Not `loft()` — that wraps closed rings and would fold a sheet. */
function gridGeometry(grid: Vector3[][]): BufferGeometry {
  const buffers = createGeometryBuffers();
  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  for (let j = 0; j < grid.length - 1; j++) {
    for (let i = 0; i < grid[j]!.length - 1; i++) {
      const a = grid[j]![i]!;
      const b = grid[j]![i + 1]!;
      const c = grid[j + 1]![i + 1]!;
      const d = grid[j + 1]![i]!;

      if (c.distanceToSquared(d) < 1e-14) pushTriangle(buffers, [xyz(a), xyz(b), xyz(c)], undefined);
      else if (a.distanceToSquared(b) < 1e-14) pushTriangle(buffers, [xyz(a), xyz(c), xyz(d)], undefined);
      else pushQuad(buffers, [xyz(a), xyz(b), xyz(c), xyz(d)], undefined);
    }
  }

  return toBufferGeometry(buffers);
}

//------------------------------
//  Drawing
//------------------------------

interface Line {
  a: Vector3;
  b: Vector3;
  color: Color;
  /** Fades the segment toward its start, so a line reads as an arrow without needing a head. */
  taper?: boolean;
}

/**
 * One `LineSegments` for a whole stage, colored per vertex.
 *
 * A single object rather than one per station: a 96-station diagram would otherwise be hundreds of
 * objects to add, traverse and dispose. Direction rides a brightness ramp — dark at the base, bright at
 * the tip — because line width is 1px whatever you ask for, in WebGL and WebGPU alike, so it cannot be
 * carried by weight.
 */
function lineSet(lines: Line[], material: LineBasicMaterial): LineSegments {
  const positions = new Float32Array(lines.length * 6);
  const colors = new Float32Array(lines.length * 6);
  const dim = new Color();

  lines.forEach(({ a, b, color, taper }, i) => {
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    dim.copy(color).multiplyScalar(taper ? 0.28 : 1);
    colors.set([dim.r, dim.g, dim.b, color.r, color.g, color.b], i * 6);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return new LineSegments(geometry, material);
}

//------------------------------
//  Scene
//------------------------------

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x12161c, cameraPosition: [4.6, 3.0, 5.4] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.5);
  key.position.set(4, 5.5, 4);
  const fill = new DirectionalLight(0x93a9c8, 0.5);
  fill.position.set(-4, 1.5, -3);
  scene.add(key, fill);

  const surfaceMaterial = new MeshStandardMaterial({
    color: 0xc8cedb,
    roughness: 0.62,
    metalness: 0.08,
    side: DoubleSide,
    flatShading: true,
  });
  const coonsMaterial = new MeshStandardMaterial({
    color: 0xff8a65,
    roughness: 0.7,
    side: DoubleSide,
    flatShading: true,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });
  // Small, smooth, semi-transparent — annotations, not handles. Nothing here is selectable.
  const pointMaterial = new MeshStandardMaterial({
    color: 0xffb454,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const pointGeometry = new SphereGeometry(1, 12, 8);

  const COLOR = {
    net: new Color(0x59657a),
    isoparm: new Color(0x5ce1ff),
    rib: new Color(0xffb454),
  };

  const params = {
    preset: "vault" as Preset,
    degreeU: 3,
    degreeV: 3,
    netSize: 5,
    weight: 1,
    resolution: 20,

    width: 4,
    depth: 4,
    rise: 2.6,
    arch: "pointed" as ArchStyle,

    showSurface: true,
    showNet: true,
    showPoints: true,
    showIsoparms: false,
    showCoons: true,
    showRibs: true,

    net: "",
    boundary: "",
    deviation: "",
    about: "",
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

    const net = buildNet(params.preset, params.degreeU, params.degreeV, params.netSize, params.weight, {
      width: params.width,
      depth: params.depth,
      rise: params.rise,
      style: params.arch,
    });

    const rows = net.points.length;
    const cols = net.points[0]!.length;
    // A degree cannot exceed `points − 1` in its own direction, or the knot vector runs out of room.
    const degreeU = Math.min(net.degreeU, rows - 1);
    const degreeV = Math.min(net.degreeV, cols - 1);
    const knotsU = net.knotsU ?? clampedKnots(rows, degreeU);
    const knotsV = net.knotsV ?? clampedKnots(cols, degreeV);

    const surface = new NURBSSurface(degreeU, degreeV, knotsU, knotsV, net.points);

    const n = params.resolution;
    const grid: Vector3[][] = Array.from({ length: n + 1 }, (_, j) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const p = new Vector3();
        surface.getPoint(i / n, j / n, p);
        return p;
      }),
    );

    if (params.showSurface) stage.add(new Mesh(gridGeometry(grid), surfaceMaterial));

    const lines: Line[] = [];

    // THE CONTROL NET — the thing the surface is blended from and does not pass through.
    if (params.showNet) {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (i + 1 < rows) lines.push({ a: v3(net.points[i]![j]!), b: v3(net.points[i + 1]![j]!), color: COLOR.net });
          if (j + 1 < cols) lines.push({ a: v3(net.points[i]![j]!), b: v3(net.points[i]![j + 1]!), color: COLOR.net });
        }
      }
    }

    // THE ISOPARMS — curves on the surface holding one parameter fixed. How it is actually parameterized.
    if (params.showIsoparms) {
      for (let j = 0; j <= n; j++) {
        for (let i = 0; i < n; i++) lines.push({ a: grid[j]![i]!, b: grid[j]![i + 1]!, color: COLOR.isoparm });
      }
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j < n; j++) lines.push({ a: grid[j]![i]!, b: grid[j + 1]![i]!, color: COLOR.isoparm });
      }
    }

    // THE COMPARISON. The same cell, filled by a Coons patch, overlaid in orange.
    let boundaryError = -1;
    if (net.cell) {
      const cell = net.cell;

      if (params.showCoons) {
        const coons: Vector3[][] = Array.from({ length: n + 1 }, (_, j) =>
          Array.from({ length: n + 1 }, (_, i) => coonsPoint(cell, i / n, j / n)),
        );
        stage.add(new Mesh(gridGeometry(coons), coonsMaterial));
      }

      if (params.showRibs) {
        for (const curve of [cell.wall, cell.left, cell.right]) {
          for (let i = 1; i < curve.length; i++) {
            lines.push({ a: curve[i - 1]!, b: curve[i]!, color: COLOR.rib });
          }
        }
      }

      // How far the NURBS surface's own edges sit from the ribs they are supposed to lie on.
      boundaryError = 0;
      for (let i = 0; i <= n; i++) {
        boundaryError = Math.max(
          boundaryError,
          grid[0]![i]!.distanceTo(at(cell.wall, i / n)),
          grid[i]![0]!.distanceTo(at(cell.left, i / n)),
          grid[i]![n]!.distanceTo(at(cell.right, i / n)),
        );
      }
    }

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    if (params.showPoints) {
      for (const row of net.points) {
        for (const p of row) {
          const dot = new Mesh(pointGeometry, pointMaterial);
          dot.position.set(p.x, p.y, p.z);
          dot.scale.setScalar(0.018 + 0.022 * Math.min(2, Math.max(0, p.w)));
          stage.add(dot);
        }
      }
    }

    // APPROXIMATION, measured: how far the surface sits from each control point. Zero only at the four
    // clamped corners — and everywhere, if both degrees are 1.
    let deviation = 0;
    for (const row of net.points) {
      for (const p of row) {
        const target = new Vector3(p.x, p.y, p.z);
        let nearest = Infinity;
        for (const line of grid) for (const q of line) nearest = Math.min(nearest, q.distanceTo(target));
        deviation = Math.max(deviation, nearest);
      }
    }

    params.net = `${rows} × ${cols} net · degree ${degreeU} × ${degreeV} · knots ${knotsU.length} / ${knotsV.length}`;
    params.deviation =
      deviation < 1e-9
        ? "0.00e+0 — the surface passes THROUGH its net (degree 1)"
        : `${deviation.toFixed(4)} from the net — it APPROXIMATES`;

    if (params.preset === "cylinder") {
      let worst = 0;
      for (const row of grid) for (const p of row) worst = Math.max(worst, Math.abs(Math.hypot(p.x, p.z) - 1.2));
      params.boundary =
        worst < 1e-12 ? `${worst.toExponential(2)} — EXACT, by weights` : `${worst.toExponential(3)} off round`;
    } else if (boundaryError >= 0) {
      params.boundary =
        boundaryError < 1e-9
          ? `${boundaryError.toExponential(2)} — ON the ribs`
          : `${boundaryError.toFixed(4)} OFF the ribs (Coons: ~1e-15)`;
    } else {
      params.boundary = "no boundary to match";
    }

    params.about = net.label;
  };

  const v3 = (p: Vector4) => new Vector3(p.x, p.y, p.z);

  rebuild();
  // FRAME ONCE — the rule every study here follows.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("NURBS Surface Anatomy");

  const form = gui.addFolder("Surface");
  form
    .add(params, "preset", {
      "Vault Cell (vs Coons)": "vault",
      "Freeform Net": "net",
      "Cylinder (rational)": "cylinder",
      "Sail": "sail",
    })
    .name("Preset")
    .onChange(rebuild);
  // Set BOTH to 1 and the surface interpolates its NET exactly (Net Deviation 0). The boundary error does
  // NOT follow it to zero — what is left is the net's own sampling of the ribs, and only Net Size shrinks
  // that. Raising the degree instead makes the boundary worse, not better.
  form.add(params, "degreeU", 1, 5, 1).name("Degree U").onChange(rebuild);
  form.add(params, "degreeV", 1, 5, 1).name("Degree V").onChange(rebuild);
  form.add(params, "netSize", 3, 29, 1).name("Net Size").onChange(rebuild);
  form.add(params, "weight", 0.2, 1.6, 0.01).name("Weight / Camber").onChange(rebuild);
  form.add(params, "resolution", 4, 48, 1).name("Resolution").onChange(rebuild);
  form.open();

  const vault = gui.addFolder("Vault Cell");
  vault.add(params, "width", 1.5, 9, 0.1).name("Width").onChange(rebuild);
  vault.add(params, "depth", 1.5, 9, 0.1).name("Depth").onChange(rebuild);
  vault.add(params, "rise", 0.5, 6, 0.1).name("Rise").onChange(rebuild);
  vault.add(params, "arch", ["pointed", "semicircle", "elliptical", "segmental"]).name("Arch").onChange(rebuild);

  const show = gui.addFolder("Show");
  show.add(params, "showSurface").name("NURBS Surface").onChange(rebuild);
  show.add(params, "showNet").name("Control Net").onChange(rebuild);
  show.add(params, "showPoints").name("Control Points").onChange(rebuild);
  show.add(params, "showIsoparms").name("Isoparms").onChange(rebuild);
  show.add(params, "showCoons").name("Coons Patch (orange)").onChange(rebuild);
  show.add(params, "showRibs").name("Ribs").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "net").name("Net").listen().disable();
  readout.add(params, "boundary").name("Boundary").listen().disable();
  readout.add(params, "deviation").name("Net Deviation").listen().disable();
  readout.add(params, "about").name("This Preset").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    pointGeometry.dispose();
    pointMaterial.dispose();
    surfaceMaterial.dispose();
    coonsMaterial.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

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
  Vector3,
} from "three";
import {
  archRise,
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  rectProfile,
  sweep,
  toBufferGeometry,
  traceArch,
  transportFrames,
  type ArchStyle,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Surface from Boundary Curves",
  description:
    "STUDY — the third way to make a surface, after sweeping and lofting: fill in the region bounded by " +
    "curves you already have. The application is the one thing a rib vault is always missing — the " +
    "WEBBING, the curved masonry panels between the ribs. A quadripartite bay's two diagonals cut it into " +
    "four cells, and each cell is a curvilinear TRIANGLE: two corners of the bay and the boss, bounded by " +
    "one wall arch and two half-diagonals. Every one of those boundaries is a rib that already exists, so " +
    "the web is fully determined before any surface is built. Nothing has to be invented, only filled. " +
    "The reason this needs its own study is that our other two primitives cannot do it, and the failure " +
    "is symmetric and instructive. A LOFT honors the sections it is given and nothing else. Rule the wall " +
    "arch toward the boss — RULED U, which is exactly a loft from the arch to a degenerate ring — and the " +
    "wall arch is perfect while both diagonals are missed by a wide margin: the web floats off the very " +
    "ribs it is supposed to spring from. Rule the other way, between the two half-diagonals — RULED V — " +
    "and the mirror image happens: the diagonals are exact and the wall arch is abandoned. Each ruled " +
    "surface honors TWO boundaries and abandons the other two, and no amount of resampling or seam " +
    "alignment fixes it, because the information is not missing, it is unused. " +
    "The COONS PATCH is the fix and it is almost embarrassingly simple — Steven Coons, MIT, 1967. Add the " +
    "two ruled surfaces and subtract the bilinear surface through the four corners: `S = Lu + Lv − B`. " +
    "The subtraction is the whole idea. Each ruled surface already carries the corners, so adding them " +
    "counts the corners twice, and `B` is exactly that double count removed. What comes out interpolates " +
    "ALL FOUR boundaries by construction rather than by tuning, and the readout shows it — 0.00e+0 " +
    "against every rib, at every bay shape and arch style. " +
    "NOTE WHAT IS NOT REQUIRED. No NURBS, no fitting, no solver, no trimming. The instructional videos on " +
    "this subject are almost all NURBS because the software they use stores surfaces that way, but the " +
    "construction is independent of the representation — the same three lines work on polylines, which is " +
    "what a low-poly library has. A sail is the same problem with three boundaries instead of four: luff, " +
    "leech and foot. " +
    "The vault is built the way the builders did it, which `RibVaultGeometry` in the pipe-organ scene " +
    "worked out first: THE DIAGONAL SETS THE CROWN, because it spans furthest and every rib has to arrive " +
    "at the same point. Switch Arch to semicircle to see the consequence — its rise is locked to its own " +
    "half-span, so the wall arches cannot reach the crown, the cells go slack and the boundary curves stop " +
    "meeting. That gap is the problem the pointed arch was invented to solve, and here it shows up as a " +
    "surface defect rather than a structural one.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  WEB / CELL   the curved panel of masonry filling between the ribs. French, `voûtain`.
//  SEVERY       one compartment of a vault — one bay's worth. A quadripartite bay has four cells.
//  BOSS         the carved keystone where the diagonal ribs cross, at the crown.
//  SPRINGING    the height where the ribs leave their supports and the curve begins.
//  WALL ARCH    the rib closing a cell against the wall. Spans one side of the bay.
//  DIAGONAL     the rib running corner to corner across the bay, over the boss. Always the longest.
//  QUADRIPARTITE  a bay divided into four cells by two diagonals. The standard gothic bay.
//  RULED SURFACE  straight lines joining two curves. Honors those two boundaries and no others.
//  COONS PATCH  a surface interpolating FOUR boundary curves: `Lu + Lv − B`.
//  BILINEAR     the surface through four corner POINTS only — the double count a Coons patch removes.
//
//  Deliberately NOT here: tierceron and lierne ribs (extra ribs that subdivide a cell further), fan
//  vaulting, and any masonry courses on the web itself. All three are subdivisions of this same surface.

type Construction = "ruledU" | "ruledV" | "coons" | "bilinear";

/** A boundary curve, sampled. Every construction below consumes only these. */
type Curve = Vector3[];

/** One cell of the vault: the four boundaries of a Coons patch, with the boss edge degenerate. */
interface Cell {
  /** `v = 0` — the wall arch, running corner A to corner B. */
  wall: Curve;
  /** `u = 0` — the half-diagonal from corner A up to the boss. */
  left: Curve;
  /** `u = 1` — the half-diagonal from corner B up to the boss. */
  right: Curve;
  /** `v = 1` — the boss, degenerate to a point. A triangle IS a quad with one edge collapsed. */
  boss: Vector3;
}

//------------------------------
//  Ribs
//------------------------------

/**
 * One rib, sampled from springing to springing over the crown.
 *
 * Solved in its OWN vertical plane and then laid into the bay, which is what lets one routine serve a
 * wall arch and a diagonal spanning half again as far — the construction `RibVaultGeometry` arrived at.
 * `traceArch` draws the named arch and `getSpacedPoints` samples it by ARC LENGTH, so the stations are
 * evenly spread along the curve rather than along its chord. That matters here in a way it does not for
 * a rib: a Coons patch blends its boundaries by parameter, so two boundaries parameterized differently
 * would shear the surface between them even when every boundary is individually correct.
 */
function ribCurve(from: Vector3, to: Vector3, rise: number, style: ArchStyle, samples: number): Curve {
  const halfSpan = from.distanceTo(to) / 2;
  const path = new Path();
  path.moveTo(halfSpan, 0);
  traceArch(path, { style, x: 0, y: 0, halfSpan, rise, from: "right", to: "left" });

  return path.getSpacedPoints(samples).map((p) => {
    // The trace runs right to left, so `t` climbs 0 → 1 from `from` to `to`.
    const t = (halfSpan - p.x) / (2 * halfSpan);
    return new Vector3().lerpVectors(from, to, t).setY(from.y + p.y);
  });
}

/** Reverse a sampled curve — a half-diagonal is often needed running the other way. */
const flip = (curve: Curve): Curve => [...curve].reverse();

/**
 * One bay of quadripartite vaulting, as boundary curves only.
 *
 * **The diagonal sets the crown.** It spans furthest — `√(W² + D²)` against a side — and every rib has to
 * arrive at the same point, so the tallest rib's natural rise fixes the crown and the wall arches are
 * built to reach it. Doing it the other way round, picking a crown and bending every rib to it, fails on
 * a pointed arch, which cannot rise below its own half-span without growing two humps and a dip where the
 * point belongs. Under `semicircle` the rise is locked to the half-span and the wall arches simply cannot
 * reach; that is not a bug here, it is the thing gothic was invented to fix.
 */
function buildBay(
  width: number,
  depth: number,
  springing: number,
  rise: number,
  style: ArchStyle,
  samples: number,
): { cells: Cell[]; ribs: Curve[]; crown: number; diagonalRise: number; wallRise: number } {
  const hw = width / 2;
  const hd = depth / 2;

  const corners = [
    new Vector3(-hw, springing, -hd),
    new Vector3(hw, springing, -hd),
    new Vector3(hw, springing, hd),
    new Vector3(-hw, springing, hd),
  ];

  const diagonalHalfSpan = Math.hypot(width, depth) / 2;
  const diagonalRise = archRise({ style, y: 0, halfSpan: diagonalHalfSpan, rise });
  const crown = springing + diagonalRise;

  // The two diagonals, each sampled at DOUBLE resolution so its midpoint lands exactly on the boss and
  // each half can be taken off whole.
  const half = samples;
  const diagonalA = ribCurve(corners[0]!, corners[2]!, diagonalRise, style, half * 2);
  const diagonalB = ribCurve(corners[1]!, corners[3]!, diagonalRise, style, half * 2);
  const boss = new Vector3(0, crown, 0);

  // Corner i up to the boss, for each of the four corners.
  const toBoss: Curve[] = [
    diagonalA.slice(0, half + 1),
    diagonalB.slice(0, half + 1),
    flip(diagonalA.slice(half)),
    flip(diagonalB.slice(half)),
  ];

  // The wall arches are given the DIAGONAL's rise, so they reach the same crown. Whether they actually
  // manage it is up to the style, and `archRise` is what answers rather than this function.
  const walls: Curve[] = corners.map((corner, i) =>
    ribCurve(corner, corners[(i + 1) % 4]!, diagonalRise, style, samples),
  );
  const wallRise = archRise({ style, y: 0, halfSpan: walls[0]![0]!.distanceTo(corners[1]!) / 2, rise: diagonalRise });

  const cells: Cell[] = corners.map((_, i) => ({
    wall: walls[i]!,
    left: toBoss[i]!,
    right: toBoss[(i + 1) % 4]!,
    boss,
  }));

  return { cells, ribs: [...walls, diagonalA, diagonalB], crown, diagonalRise, wallRise };
}

//------------------------------
//  Surface constructions
//------------------------------

/** Sample a curve at parameter `t`, linearly between its stations. */
function at(curve: Curve, t: number): Vector3 {
  const last = curve.length - 1;
  const x = Math.min(last, Math.max(0, t * last));
  const i = Math.min(last - 1, Math.floor(x));
  return curve[i]!.clone().lerp(curve[i + 1]!, x - i);
}

/**
 * A cell's surface, by one of four constructions, as a `(n+1) × (n+1)` grid of points.
 *
 * `ruledU`    straight lines from the wall arch to the boss. Interpolates `v = 0` and `v = 1`, and is
 *             precisely a LOFT from the arch to a degenerate ring. The diagonals are never consulted.
 * `ruledV`    straight lines between the two half-diagonals. Interpolates `u = 0` and `u = 1`, and
 *             abandons the wall arch. The exact mirror of the failure above.
 * `bilinear`  the four CORNERS only, blended. Interpolates no curve at all — shown because it is the
 *             term the Coons patch subtracts, and seeing it alone is what makes the formula obvious.
 * `coons`     `Lu + Lv − B`. Both ruled surfaces already carry the corners, so adding them counts the
 *             corners twice; `B` is that double count and removing it is the entire trick. What is left
 *             interpolates all four boundaries by construction.
 */
function buildPatch(cell: Cell, construction: Construction, n: number): Vector3[][] {
  const { wall, left, right, boss } = cell;
  const cornerA = wall[0]!;
  const cornerB = wall[wall.length - 1]!;

  const grid: Vector3[][] = [];

  for (let j = 0; j <= n; j++) {
    const v = j / n;
    const row: Vector3[] = [];

    for (let i = 0; i <= n; i++) {
      const u = i / n;

      // Lu — rule between the two u-boundaries: the wall arch at v=0, the boss at v=1.
      const lu = at(wall, u).multiplyScalar(1 - v).addScaledVector(boss, v);
      // Lv — rule between the two v-boundaries: the left half-diagonal at u=0, the right at u=1.
      const lv = at(left, v).multiplyScalar(1 - u).addScaledVector(at(right, v), u);
      // B — the bilinear through the four corners. The top two are both the boss, which collapses to
      // `v * boss` and is why a degenerate edge needs no special case anywhere in this function.
      const b = cornerA
        .clone()
        .multiplyScalar((1 - u) * (1 - v))
        .addScaledVector(cornerB, u * (1 - v))
        .addScaledVector(boss, v);

      row.push(
        construction === "ruledU"
          ? lu
          : construction === "ruledV"
            ? lv
            : construction === "bilinear"
              ? b
              : lu.add(lv).sub(b),
      );
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Stitch an OPEN grid of points into a surface.
 *
 * Not `loft()`, and the difference is worth stating: a loft's sections are closed RINGS and it wraps the
 * last point back to the first. A patch is an open sheet with four edges, so wrapping it would fold the
 * surface over on itself. Same stitch, different topology.
 *
 * Where a row collapses to a single point — the boss, on every cell here — the quad degenerates and a
 * triangle is emitted instead. A zero-area quad is not merely wasteful: its normal comes from a
 * degenerate cross product, so it shades black rather than failing loudly.
 */
function patchGeometry(grid: Vector3[][]): BufferGeometry {
  const buffers = createGeometryBuffers();
  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  for (let j = 0; j < grid.length - 1; j++) {
    const lower = grid[j]!;
    const upper = grid[j + 1]!;

    for (let i = 0; i < lower.length - 1; i++) {
      const a = lower[i]!;
      const b = lower[i + 1]!;
      const c = upper[i + 1]!;
      const d = upper[i]!;

      if (c.distanceToSquared(d) < 1e-14) {
        pushTriangle(buffers, [xyz(a), xyz(b), xyz(c)], undefined);
      } else if (a.distanceToSquared(b) < 1e-14) {
        pushTriangle(buffers, [xyz(a), xyz(c), xyz(d)], undefined);
      } else {
        pushQuad(buffers, [xyz(a), xyz(b), xyz(c), xyz(d)], undefined);
      }
    }
  }

  return toBufferGeometry(buffers);
}

/** How far a patch edge strays from the rib it is supposed to lie on. The whole readout. */
function edgeError(grid: Vector3[][], cell: Cell): { wall: number; diagonal: number } {
  const n = grid.length - 1;
  let wall = 0;
  let diagonal = 0;

  for (let i = 0; i <= n; i++) {
    wall = Math.max(wall, grid[0]![i]!.distanceTo(at(cell.wall, i / n)));
    diagonal = Math.max(
      diagonal,
      grid[i]![0]!.distanceTo(at(cell.left, i / n)),
      grid[i]![n]!.distanceTo(at(cell.right, i / n)),
    );
  }

  return { wall, diagonal };
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
  const handle = createScene(container, { background: 0x0e1116, cameraPosition: [6.5, 3.2, 7.5] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.5);
  key.position.set(4, 6, 4);
  const fill = new DirectionalLight(0x93a9c8, 0.5);
  fill.position.set(-4, 1.5, -3);
  scene.add(key, fill);

  const plaster = new MeshStandardMaterial({
    color: 0xcfc7b6,
    roughness: 0.94,
    // A web is a shell seen from below, and the study is usually orbited from outside it.
    side: DoubleSide,
    flatShading: true,
  });
  const stone = new MeshStandardMaterial({ color: 0xb0a894, roughness: 0.86, flatShading: true });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    rib: new Color(0xffb454),
    grid: new Color(0x5c6a7d),
  };

  const params = {
    width: 4,
    depth: 4,
    springing: 2.2,
    rise: 2.6,
    arch: "pointed" as ArchStyle,

    construction: "coons" as Construction,
    resolution: 12,
    allCells: true,

    showWeb: true,
    showRibs: true,
    showBoundaries: true,
    showGrid: false,
    opacity: 1,

    wallError: "",
    diagonalError: "",
    crown: "",
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

    const samples = Math.max(4, params.resolution);
    const bay = buildBay(params.width, params.depth, params.springing, params.rise, params.arch, samples);
    const cells = params.allCells ? bay.cells : [bay.cells[0]!];

    const lines: Line[] = [];
    let worstWall = 0;
    let worstDiagonal = 0;

    for (const cell of cells) {
      const grid = buildPatch(cell, params.construction, params.resolution);

      if (params.showWeb) stage.add(new Mesh(patchGeometry(grid), plaster));

      // The patch's own isoparametric lines — how the surface is actually parameterized, which a shaded
      // shell hides completely.
      if (params.showGrid) {
        for (let j = 0; j < grid.length; j++) {
          for (let i = 0; i < grid[j]!.length - 1; i++) {
            lines.push({ a: grid[j]![i]!, b: grid[j]![i + 1]!, color: COLOR.grid });
          }
        }
        for (let i = 0; i < grid[0]!.length; i++) {
          for (let j = 0; j < grid.length - 1; j++) {
            lines.push({ a: grid[j]![i]!, b: grid[j + 1]![i]!, color: COLOR.grid });
          }
        }
      }

      const error = edgeError(grid, cell);
      worstWall = Math.max(worstWall, error.wall);
      worstDiagonal = Math.max(worstDiagonal, error.diagonal);
    }

    // The ribs as real swept members, so the web is seen against the thing it has to meet rather than
    // against a diagram of it. `transportFrames` and not `miterFrames` — a single arch has no corner.
    if (params.showRibs) {
      for (const rib of bay.ribs) {
        const path = rib.map((position, i) => ({
          position,
          tangent: new Vector3()
            .subVectors(rib[Math.min(rib.length - 1, i + 1)]!, rib[Math.max(0, i - 1)]!)
            .normalize(),
        }));
        stage.add(new Mesh(sweep(rectProfile(0.16, 0.2), transportFrames(path)), stone));
      }
    }

    if (params.showBoundaries) {
      for (const cell of cells) {
        for (const curve of [cell.wall, cell.left, cell.right]) {
          for (let i = 1; i < curve.length; i++) {
            lines.push({ a: curve[i - 1]!, b: curve[i]!, color: COLOR.rib });
          }
        }
      }
    }

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    const report = (value: number) =>
      value < 5e-7 ? `${value.toExponential(2)} — ON the rib` : `${value.toFixed(4)} OFF the rib`;

    params.wallError = report(worstWall);
    params.diagonalError = report(worstDiagonal);
    params.crown =
      Math.abs(bay.wallRise - bay.diagonalRise) < 1e-6
        ? `crown ${bay.crown.toFixed(3)} · every rib reaches it`
        : `crown ${bay.crown.toFixed(3)} · wall arches reach only ${(params.springing + bay.wallRise).toFixed(3)}`;
    params.about =
      params.construction === "coons"
        ? "Lu + Lv − B — all four boundaries, by construction"
        : params.construction === "ruledU"
          ? "wall arch → boss. A loft: two boundaries honored, the diagonals unused"
          : params.construction === "ruledV"
            ? "diagonal → diagonal. The mirror failure: the wall arch is abandoned"
            : "four CORNERS only — the term a Coons patch subtracts";
  };

  rebuild();
  // FRAME ONCE — the same rule as the sweep, loft and NURBS studies.
  frameObject(handle, stage, { fit: 1.4 });

  const gui = new GUI();
  gui.title("Surface from Boundary Curves");

  const surface = gui.addFolder("Construction");
  surface
    .add(params, "construction", {
      "Coons Patch (Lu + Lv − B)": "coons",
      "Ruled U — arch to boss (a loft)": "ruledU",
      "Ruled V — diagonal to diagonal": "ruledV",
      "Bilinear — corners only": "bilinear",
    })
    .name("Surface")
    .onChange(rebuild);
  surface.add(params, "resolution", 2, 32, 1).name("Resolution").onChange(rebuild);
  surface.add(params, "allCells").name("All Four Cells").onChange(rebuild);
  surface.open();

  const vault = gui.addFolder("Bay");
  vault.add(params, "width", 1.5, 9, 0.1).name("Width").onChange(rebuild);
  vault.add(params, "depth", 1.5, 9, 0.1).name("Depth").onChange(rebuild);
  vault.add(params, "springing", 0.5, 5, 0.1).name("Springing").onChange(rebuild);
  // Under `pointed` this is a free choice above the floor; under `semicircle` the style overrides it.
  vault.add(params, "rise", 0.5, 6, 0.1).name("Rise").onChange(rebuild);
  // Switch to semicircle to watch the wall arches fall short of the crown.
  vault
    .add(params, "arch", ["pointed", "semicircle", "elliptical", "segmental", "ogee"])
    .name("Arch")
    .onChange(rebuild);
  vault.open();

  const show = gui.addFolder("Show");
  show.add(params, "showWeb").name("Web").onChange(rebuild);
  show.add(params, "showRibs").name("Ribs").onChange(rebuild);
  show.add(params, "showBoundaries").name("Boundary Curves").onChange(rebuild);
  // The isoparametric lines — how the patch is parameterized, which shading hides entirely.
  show.add(params, "showGrid").name("Patch Grid").onChange(rebuild);
  show
    .add(params, "opacity", 0.15, 1, 0.05)
    .name("Web Opacity")
    .onChange((value: number) => {
      plaster.opacity = value;
      plaster.transparent = value < 1;
      plaster.depthWrite = value >= 1;
      plaster.needsUpdate = true;
    });
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "wallError").name("Wall Arch").listen().disable();
  readout.add(params, "diagonalError").name("Diagonals").listen().disable();
  readout.add(params, "crown").name("Crown").listen().disable();
  readout.add(params, "about").name("This Surface").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    plaster.dispose();
    stone.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

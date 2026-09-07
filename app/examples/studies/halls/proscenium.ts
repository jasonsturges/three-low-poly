import { Box3, BufferGeometry, Color, CylinderGeometry, ExtrudeGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Shape, Vector3 } from "three";
import GUI from "lil-gui";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { GroundGrid } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DiamondLatticeGeometry } from "three-low-poly";
import { MoldingGeometry } from "three-low-poly";
import { type ArchStyle, traceArch } from "three-low-poly";

//  Inlined rather than imported: this is a prototype with no consumer, so it stays where it can be
//  torn apart and re-cut. Nothing is exported.


//------------------------------
//  The geometry, inlined
//------------------------------

/**
 * The front of a concert hall — a bowed proscenium on columns, with latticed wing bays.
 *
 * **The bow is a POLYGON, not a curve**, and that is the whole construction. Each bay is a flat panel
 * placed tangent to a circle, and a column stands over every joint where two panels meet at their angle —
 * so the columns hide the seams and no panel needs a wedge taper to close against its neighbour. The
 * orrery's rotunda is the same trick at a full 360°; a theatre front is a shallow arc of it.
 *
 * ## A bay is a spandrel, not a wall with a hole
 *
 * The arch is the panel's LOWER EDGE, cut out of its underside, and the panel runs from the springing up
 * to the cornice. Below the springing there is no panel at all — the columns are what stands there. Which
 * means no boolean, no hole, and an arch of any rise is just a different lower outline.
 *
 * ## Scale, and why it is stated in metres
 *
 * A real proscenium is 10–14 m across and the arch springs 5–6 m up. Against a 2.5 m harpsichord that is
 * the point: the instrument should look small inside it. Everything here is absolute for that reason —
 * nothing is a fraction of anything, because the whole job of this geometry is to establish a scale the
 * subject is measured against.
 *
 * Rest pose: the centre bay's face on `z = 0`, the arc sweeping toward `+z`, floor at `y = 0`.
 */
interface ProsceniumGeometryOptions {
  /** Chord of the central opening — the stage mouth. Defaults to `9`. */
  openingChord?: number;
  /** How much of that chord is opening; the rest is haunch resting on the columns. Defaults to `0.86`. */
  openingFraction?: number;
  /** Rise of the main arch above its springing. Defaults to half the opening — a semicircle. */
  archRise?: number;

  /** Wing bays each side. Defaults to `2`. `0` gives a bare proscenium. */
  wingBays?: number;
  /** Chord of one wing bay. Defaults to `3.2`. */
  wingChord?: number;
  /** Opening fraction of a wing bay. Defaults to `0.72`. */
  wingFraction?: number;

  /**
   * Radius the front is bowed on. Defaults to `18`. Larger is flatter; `0` builds it dead straight.
   *
   * Shallow on purpose — a hall wraps its audience gently. At 18 m the wings come forward about a metre
   * over their run, which is enough to read as an embrace and not so much that it looks like a rotunda.
   */
  radius?: number;

  /** Springing line of the main arch — where it leaves its columns. Defaults to `5.4`. */
  springHeight?: number;
  /**
   * Springing line of the WING arches. Defaults to `3.6`.
   *
   * Lower than the proscenium's, because they are. A hall's side bays are a storey of their own under a
   * much taller stage mouth, and springing them all off one line makes the front read as a single arcade
   * with an oversized middle rather than as an opening with flanking bays.
   */
  wingSpringHeight?: number;
  /**
   * Top of the wall, under the cornice. Defaults to `10.4`.
   *
   * **Must clear the crown**, and the builder clamps the rise if it does not — which is a silent
   * flattening. At `8.2` the main arch wanted a 3.87 m rise off a 5.4 m springing and got 2.68, so the
   * semicircle asked for was quietly built as a segmental. {@link ProsceniumMetrics.archRise} reports what
   * was actually cut, and {@link ProsceniumMetrics.clamped} says whether it had to be.
   */
  height?: number;
  /** Panel thickness. Defaults to `0.8`. */
  thickness?: number;

  /** Column radius. Defaults to `0.46`. */
  columnRadius?: number;
  /** Facets around a column. Defaults to `12`. */
  columnSides?: number;

  /** Build the cornice band along the top. Defaults to `true`. */
  cornice?: boolean;
  /** How far the cornice drops down the wall. Defaults to `0.5`. */
  corniceDrop?: number;
  /** How far it stands proud. Defaults to `0.42`. */
  corniceProjection?: number;

  /** Fill the wing bays with a diamond grille. Defaults to `true`. */
  lattice?: boolean;
  /** Came spacing in the grille. Defaults to `0.34`. */
  latticeSpacing?: number;

  /** Arch style, for every arch in the front. Defaults to `"semicircle"`. */
  archStyle?: ArchStyle;
  /** Samples along a curve. Defaults to `24`. */
  curveSegments?: number;
}

/** One bay, placed on the arc. */
interface BaySlot {
  /** `0` is the centre bay; negative runs stage right, positive stage left. */
  index: number;
  centre: boolean;
  chord: number;
  /** Angle subtended at the arc's centre, in radians. */
  angle: number;
  position: Vector3;
  /** Rotation about Y that turns the panel to face the audience. */
  rotation: number;
}

/** What a proscenium measures out to. */
interface ProsceniumMetrics {
  bays: BaySlot[];
  /** Wall to wall across the whole front, straight-line. */
  span: number;
  /** How far the wings come forward of the centre bay. */
  reach: number;
  /** Clear width of the stage mouth, and the crown height ACTUALLY built. */
  openingWidth: number;
  openingHeight: number;
  /** Rise the main arch was cut with, after clamping to the wall head. */
  archRise: number;
  /** Whether the wall head forced the rise down — a semicircle quietly become a segmental. */
  clamped: boolean;
  springHeight: number;
  height: number;
  /** Where the columns stand, at the joints between bays. */
  columns: Vector3[];
}

/** Every default in one object, and the only place any of them is written down. */
const PROSCENIUM_DEFAULTS: Required<ProsceniumGeometryOptions> = {
  openingChord: 9,
  openingFraction: 0.86,
  archRise: 0,
  wingBays: 2,
  wingChord: 3.2,
  wingFraction: 0.72,
  radius: 18,
  springHeight: 5.4,
  wingSpringHeight: 3.6,
  height: 10.4,
  thickness: 0.8,
  columnRadius: 0.46,
  columnSides: 12,
  cornice: true,
  corniceDrop: 0.5,
  corniceProjection: 0.42,
  lattice: true,
  latticeSpacing: 0.34,
  archStyle: "semicircle",
  curveSegments: 24,
};

/** Resolve options to the bay and column placements the builder and a caller both need. */
function resolveProscenium(options: ProsceniumGeometryOptions = {}): ProsceniumMetrics {
  const d = PROSCENIUM_DEFAULTS;
  const openingChord = Math.max(1, options.openingChord ?? d.openingChord);
  const wingChord = Math.max(0.4, options.wingChord ?? d.wingChord);
  const wings = Math.max(0, Math.floor(options.wingBays ?? d.wingBays));
  const radius = Math.max(0, options.radius ?? d.radius);
  const springHeight = Math.max(0.5, options.springHeight ?? d.springHeight);
  const height = Math.max(springHeight + 0.3, options.height ?? d.height);
  const openingWidth = openingChord * Math.min(Math.max(options.openingFraction ?? d.openingFraction, 0.05), 1);
  //  The rise the caller asked for, and the rise the wall head allows. Reported as two numbers because a
  //  clamp that is invisible is a geometry that disagrees with its own metrics.
  const wanted = options.archRise || openingWidth / 2;
  const archRise = Math.min(wanted, height - springHeight - 0.12);

  //  A chord subtends `2·asin(c / 2r)` at the centre. With no radius the front is straight and every bay
  //  simply sits at its own x — the same loop, with the angle collapsed to zero.
  const subtend = (chord: number) => (radius > 0 ? 2 * Math.asin(Math.min(1, chord / (2 * radius))) : 0);

  //  A JOINT — a point on the arc itself, where two panels meet and a column stands.
  const joint = (angle: number, offset: number): Vector3 =>
    radius > 0
      ? new Vector3(Math.sin(angle) * radius, 0, radius * (1 - Math.cos(angle)))
      : new Vector3(offset, 0, 0);

  /**
   * A BAY — centred on the CHORD between its two joints, not on the arc point between them.
   *
   * This is the bug that made the stage mouth look like a separate piece pushed back. A flat panel placed
   * at the arc point is TANGENT there, so its ends fall short of the arc by the sagitta and the columns —
   * which do sit on the arc — stand proud of it. On the 9 m centre bay that was 0.57 m of daylight.
   *
   * The chord midpoint is the arc point pulled in by `cos(θ/2)`, which is exactly the sagitta.
   */
  const place = (angle: number, offset: number, subtended: number): { position: Vector3; rotation: number } => {
    if (radius <= 0) return { position: new Vector3(offset, 0, 0), rotation: 0 };
    const inset = radius * Math.cos(subtended / 2);
    return {
      position: new Vector3(Math.sin(angle) * inset, 0, radius - Math.cos(angle) * inset),
      //  Negative, so the panel's own `+z` turns to point back at the arc's centre — the audience.
      rotation: -angle,
    };
  };

  const bays: BaySlot[] = [];
  const centreAngle = subtend(openingChord);
  bays.push({ index: 0, centre: true, chord: openingChord, angle: centreAngle, ...place(0, 0, centreAngle) });

  const wingAngle = subtend(wingChord);
  for (let i = 1; i <= wings; i++) {
    //  Cumulative: half the centre bay, then whole wings, then half of this one to reach its middle.
    const along = centreAngle / 2 + wingAngle * (i - 0.5);
    const offset = openingChord / 2 + wingChord * (i - 0.5);
    for (const side of [1, -1]) {
      bays.push({
        index: side * i,
        centre: false,
        chord: wingChord,
        angle: wingAngle,
        ...place(side * along, side * offset, wingAngle),
      });
    }
  }

  //  Joints: every boundary between two bays, plus the two outer ends.
  const columns: Vector3[] = [];
  for (let i = 0; i <= wings; i++) {
    const along = centreAngle / 2 + wingAngle * i;
    const offset = openingChord / 2 + wingChord * i;
    for (const side of [1, -1]) columns.push(joint(side * along, side * offset));
  }

  const outer = columns.reduce((far, c) => Math.max(far, Math.abs(c.x)), 0);
  return {
    bays,
    span: outer * 2,
    reach: columns.reduce((far, c) => Math.max(far, c.z), 0),
    openingWidth,
    openingHeight: springHeight + archRise,
    archRise,
    clamped: archRise < wanted - 1e-9,
    springHeight,
    height,
    columns,
  };
}

//------------------------------
//  Build
//------------------------------

/**
 * One bay's spandrel: a panel from the springing to the wall head, with the arch cut from its underside.
 *
 * **The curve comes from {@link traceArch}, not from a hand-rolled half-ellipse.** It was hand-rolled at
 * first, which quietly made `archStyle` a dead option — every style drew the same ellipse. Handing the arch
 * to the library that owns arches means all seven work, and means a pointed one here is the same curve as
 * a pointed window elsewhere.
 */
function spandrel(
  chord: number,
  openFraction: number,
  springHeight: number,
  height: number,
  rise: number,
  thickness: number,
  segments: number,
  style: ArchStyle,
): BufferGeometry {
  const halfChord = chord / 2;
  const openHalf = halfChord * openFraction;
  //  Never let the crown reach the wall head — a taller rise pushes the arch through the top edge and the
  //  outline self-intersects.
  const crown = Math.min(rise, height - springHeight - 0.12);

  const shape = new Shape();
  shape.moveTo(-halfChord, springHeight);
  shape.lineTo(-openHalf, springHeight);
  //  Left springing to right, over the crown. `traceArch` continues from wherever the path already is.
  traceArch(shape, { style, x: 0, y: springHeight, halfSpan: openHalf, rise: crown, from: "left", to: "right" });
  shape.lineTo(halfChord, springHeight);
  shape.lineTo(halfChord, height);
  shape.lineTo(-halfChord, height);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: segments });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

/**
 * A concert-hall front, baked into one geometry.
 *
 * Material groups: `0` wall, `1` columns, `2` cornice, `3` lattice. Four because a hall is painted that
 * way — pale plaster, stone shafts, a gilded band, and dark metal in the grilles.
 */
function createProsceniumGeometry(
  options: ProsceniumGeometryOptions = {},
): BufferGeometry {
  const o = resolveProscenium(options);
  const d = PROSCENIUM_DEFAULTS;
  const thickness = Math.max(0.05, options.thickness ?? d.thickness);
  const segments = Math.max(6, Math.floor(options.curveSegments ?? d.curveSegments));
  const wingFraction = Math.min(Math.max(options.wingFraction ?? d.wingFraction, 0.05), 1);
  const openingFraction = Math.min(Math.max(options.openingFraction ?? d.openingFraction, 0.05), 1);

  const walls: BufferGeometry[] = [];
  const columns: BufferGeometry[] = [];
  const trim: BufferGeometry[] = [];
  const grilles: BufferGeometry[] = [];

  const wingSpring = Math.max(0.5, options.wingSpringHeight ?? d.wingSpringHeight);
  for (const bay of o.bays) {
    const fraction = bay.centre ? openingFraction : wingFraction;
    const spring = bay.centre ? o.springHeight : wingSpring;
    const rise = bay.centre ? o.archRise : (bay.chord * wingFraction) / 2;
    const panel = spandrel(bay.chord, fraction, spring, o.height, rise, thickness, segments, options.archStyle ?? d.archStyle);
    panel.applyMatrix4(new Matrix4().makeRotationY(bay.rotation));
    panel.applyMatrix4(new Matrix4().makeTranslation(bay.position.x, 0, bay.position.z));
    walls.push(panel);

    //  Grilles fill the WINGS only. The centre bay is the stage mouth and must stay open.
    if (bay.centre || !(options.lattice ?? d.lattice)) continue;
    const lattice = new DiamondLatticeGeometry({
      opening: {
        width: bay.chord * fraction,
        height: wingSpring,
        arch: options.archStyle ?? d.archStyle,
        //   calls the rise `archHeight` — the ellipse's vertical radius. A semicircle is
        //  the value where it equals half the span, not a separate mode.
        archHeight: rise,
      },
      spacing: Math.max(0.06, options.latticeSpacing ?? d.latticeSpacing),
    });
    //  `ArchedOutline` measures from its own base, so the grille is already sitting on `y = 0`.
    lattice.applyMatrix4(new Matrix4().makeRotationY(bay.rotation));
    lattice.applyMatrix4(new Matrix4().makeTranslation(bay.position.x, 0, bay.position.z));
    grilles.push(lattice);
  }

  //  A column over every joint, standing from the floor to the springing where the arches land on it.
  const columnRadius = Math.max(0.05, options.columnRadius ?? d.columnRadius);
  const columnSides = Math.max(3, Math.floor(options.columnSides ?? d.columnSides));
  //  Columns rise to whichever springing lands on them. The two flanking the stage mouth carry the main
  //  arch; the rest carry the wings, and stopping them all at the tall line would leave the wing arches
  //  floating with a stub of shaft above.
  const inner = o.columns.reduce((near, c) => Math.min(near, Math.abs(c.x)), Infinity);
  for (const at of o.columns) {
    const tall = Math.abs(Math.abs(at.x) - inner) < 1e-6;
    const top = tall ? o.springHeight : wingSpring;
    const column = new CylinderGeometry(columnRadius, columnRadius * 1.08, top, columnSides, 1, false);
    column.applyMatrix4(new Matrix4().makeTranslation(at.x, top / 2, at.z));
    columns.push(column);
  }

  //  The cornice, swept along the wall head. `MoldingGeometry` takes the corner LINE — here the polygon of
  //  bay centres lifted to the wall head — and reverses itself if the run came out facing the wrong way,
  //  so the winding of the bay list does not have to be remembered.
  if (options.cornice ?? d.cornice) {
    //  **The joints, not the bay centres.** A cornice follows the wall, and the wall's polygon has its
    //  vertices where the panels meet — running it through the middles builds a different polygon that
    //  crosses the wall twice per bay.
    const run = [...o.columns]
      .sort((a, b) => a.x - b.x)
      .map((at) => new Vector3(at.x, o.height, at.z));
    if (run.length >= 2) {
      trim.push(
        new MoldingGeometry({
          points: run,
          run: "crown",
          facing: "inward",
          drop: Math.max(0.02, options.corniceDrop ?? d.corniceDrop),
          projection: Math.max(0.02, options.corniceProjection ?? d.corniceProjection),
        }),
      );
    }
  }

  const byMaterial: BufferGeometry[] = [];
  for (const bucket of [walls, columns, trim, grilles]) {
    if (bucket.length === 0) continue;
    const flat = bucket.map((part) => (part.getIndex() ? part.toNonIndexed() : part));
    const merged = mergeGeometries(flat, false);
    flat.forEach((part) => part.dispose());
    if (!merged) throw new Error("createProsceniumGeometry: per-material merge failed");
    byMaterial.push(merged);
  }

  const front = mergeGeometries(byMaterial, true);
  byMaterial.forEach((part) => part.dispose());
  if (!front) throw new Error("createProsceniumGeometry: merge failed");
  return front;
}

/** {@link createProsceniumGeometry} as a class. */
class ProsceniumGeometry extends BufferGeometry {
  readonly type = "ProsceniumGeometry";

  constructor(options: ProsceniumGeometryOptions = {}) {
    super();
    const geometry = createProsceniumGeometry(options);
    this.copy(geometry);
    geometry.dispose();
    this.userData.parameters = { ...options };
  }
}

export const meta: ExampleMeta = {
  title: "Proscenium",
  description:
    "STUDY — a concert-hall front — a bowed proscenium on columns with latticed wing bays — and THE BOW IS A POLYGON, NOT A CURVE. Each bay is a flat panel placed tangent to a circle, with a column standing over every joint where two panels meet at their angle, so the columns hide the seams and no panel needs a wedge taper to close against its neighbour. The orrery's rotunda is that trick at a full 360°; a theatre front is a shallow arc of the same thing, and `radius: 0` collapses it to a dead-straight wall through the identical code path. A BAY IS A SPANDREL, NOT A WALL WITH A HOLE: the arch is the panel's lower edge, cut out of its underside, and the panel runs from the springing up to the cornice with nothing below it but the columns. No boolean, no hole, and an arch of any rise is simply a different lower outline. Almost none of this is new geometry — DiamondLatticeGeometry fills the wings, MoldingGeometry sweeps the cornice along the polygon of bay heads, and ArchProfile supplies the styles; what is written here is placement. THE WINGS SPRING LOWER THAN THE STAGE MOUTH, which matters more than it sounds: a hall's side bays are a storey of their own under a much taller opening, and springing them all off one line makes the front read as a single arcade with an oversized middle rather than as an opening with flanking bays. Watch the Measured readout for CLAMPED — a wall head below the crown silently flattens the arch, so a semicircle you asked for gets built as a segmental and nothing says so.74 m mouth.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, { background: 0x0e1015, cameraPosition: [6, 6, 18] });
  const { scene } = handle;

  const params: Required<ProsceniumGeometryOptions> = { ...PROSCENIUM_DEFAULTS };
  const readout = { span: "", mouth: "", rise: "", bays: "", geometry: "", options: "" };

  const palette = {
    wall: new MeshStandardMaterial({ color: new Color("#c8b493"), roughness: 0.9, flatShading: true }),
    column: new MeshStandardMaterial({ color: new Color("#b7a184"), roughness: 0.82, flatShading: true }),
    cornice: new MeshStandardMaterial({ color: new Color("#c8973f"), roughness: 0.45, metalness: 0.35, flatShading: true }),
    lattice: new MeshStandardMaterial({ color: new Color("#3a2c1c"), roughness: 0.6, flatShading: true }),
  };

  const stage = new Group();
  scene.add(stage);
  let floor: GroundGrid | undefined;
  let framed = false;

  function clear(): void {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) child.geometry.dispose();
      stage.remove(child);
    }
  }

  function rebuild(): void {
    clear();
    const front = new Mesh(new ProsceniumGeometry(params), [
      palette.wall,
      palette.column,
      ...(params.cornice ? [palette.cornice] : []),
      ...(params.lattice && params.wingBays > 0 ? [palette.lattice] : []),
    ]);
    front.castShadow = front.receiveShadow = true;
    stage.add(front);

    const o = resolveProscenium(params);


    const m = (v: number) => v.toFixed(2);
    readout.span = `${m(o.span)} m wall to wall · wings reach ${m(o.reach)} m forward`;
    readout.mouth = `${m(o.openingWidth)} × ${m(o.openingHeight)} m`;
    readout.rise = o.clamped
      ? `⚠ CLAMPED to ${m(o.archRise)} — raise the wall head above ${m(o.openingHeight + 0.12)}`
      : `${m(o.archRise)} m, as asked · ${m(o.height - o.openingHeight)} m of spandrel above the crown`;
    readout.bays = `${o.bays.length} bays · ${o.columns.length} columns · outermost turned ${(Math.max(...o.bays.map((b) => Math.abs(b.rotation))) * 180 / Math.PI).toFixed(0)}°`;
    let tris = 0;
    stage.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const index = child.geometry.getIndex();
      tris += (index ? index.count : child.geometry.getAttribute("position").count) / 3;
    });
    readout.geometry = `${tris} tris · ${front.geometry.groups.length} groups`;

    fit();
    controllers.forEach((c) => c.updateDisplay());
  }

  function fit(): void {
    const box = new Box3().setFromObject(stage);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.z);
    const cell = [0.25, 0.5, 1, 2].find((c) => (extent * 1.2) / c <= 32) ?? 5;
    const span = Math.ceil((extent * 1.2) / cell) * cell;
    if (floor) {
      scene.remove(floor);
      floor.dispose();
    }
    floor = new GroundGrid({ size: span, divisions: Math.round(span / cell) });
    floor.position.set((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);
    scene.add(floor);
    if (framed) return;
    frameObject(handle, stage, { fit: 1.15 });
    framed = true;
  }

  const gui = new GUI({ title: "Proscenium" });
  const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const add = (folder: GUI, key: keyof typeof params, min?: number | string[], max?: number, step?: number) =>
    folder.add(params, key, min as never, max, step).name(label(key)).onChange(rebuild);

  const mouth = gui.addFolder("Stage Mouth");
  add(mouth, "openingChord", 3, 20, 0.1);
  // How much of the chord is opening; the rest is haunch resting on the columns.
  add(mouth, "openingFraction", 0.3, 1, 0.01);
  // 0 takes half the opening — a semicircle. Anything taller than the wall head allows gets clamped.
  add(mouth, "archRise", 0, 8, 0.05);
  add(mouth, "archStyle", ["semicircle", "elliptical", "segmental", "pointed", "ogee", "horseshoe", "square"]);
  mouth.open();

  const wings = gui.addFolder("Wings");
  add(wings, "wingBays", 0, 5, 1);
  add(wings, "wingChord", 1, 8, 0.1);
  add(wings, "wingFraction", 0.3, 1, 0.01);
  // Lower than the stage mouth's on purpose — see the geometry's note.
  add(wings, "wingSpringHeight", 1, 9, 0.1);
  add(wings, "lattice");
  add(wings, "latticeSpacing", 0.1, 1, 0.02);
  wings.open();

  const shell = gui.addFolder("Wall");
  // 0 builds it dead straight, through the same code path.
  add(shell, "radius", 0, 60, 0.5);
  add(shell, "springHeight", 2, 12, 0.1);
  add(shell, "height", 3, 18, 0.1);
  add(shell, "thickness", 0.1, 3, 0.05);
  add(shell, "columnRadius", 0.1, 1.5, 0.02);
  add(shell, "columnSides", 3, 24, 1);
  add(shell, "cornice");
  add(shell, "corniceDrop", 0.05, 2, 0.02);
  add(shell, "corniceProjection", 0.05, 2, 0.02);
  shell.open();

  const lod = gui.addFolder("LOD");
  add(lod, "curveSegments", 6, 64, 1);


  const info = gui.addFolder("Measured");
  const controllers = [
    info.add(readout, "span").name("Span").disable(),
    info.add(readout, "mouth").name("Mouth").disable(),
    info.add(readout, "rise").name("Arch Rise").disable(),
    info.add(readout, "bays").name("Bays").disable(),
    info.add(readout, "geometry").name("Geometry").disable(),
    info.add(readout, "options").name("Options").disable(),
  ];
  info.open();

  const wired = gui.controllersRecursive().filter((c) => c.object === params);
  const missing = Object.keys(params).filter((key) => !wired.some((c) => c.property === key));
  const misnamed = wired.filter((c) => (c as { _name: string })._name !== label(c.property));
  readout.options = missing.length || misnamed.length
    ? `⚠ ${missing.length} unexposed: ${missing.join(" ")} · ${misnamed.length} misnamed`
    : `${wired.length}/${Object.keys(params).length} exposed · labels match ✓`;

  rebuild();

  return () => {
    gui.destroy();
    clear();
    floor?.dispose();
    Object.values(palette).forEach((material) => material.dispose());
    scene.clear();
    handle.dispose();
  };
};

export default mount;

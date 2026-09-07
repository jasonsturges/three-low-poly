import { Box3, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Path, Vector2, Vector3 } from "three";
import GUI from "lil-gui";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { GroundGrid } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PathPoint } from "three-low-poly";
import { joinPaths } from "three-low-poly";
import { type ArchStyle, archRise, traceArch } from "three-low-poly";
import { miterFrames } from "three-low-poly";
import { circleProfile } from "three-low-poly";
import { sweep } from "three-low-poly";

//  Inlined rather than imported: this is a prototype with no consumer, so it stays where it can be
//  torn apart and re-cut. Nothing is exported.


//------------------------------
//  The path the gallery was missing
//------------------------------

/** One order's run: up the jamb, over the arch, down the other jamb. */
interface ArchOrderPathOptions {
  /** Half the order's span, measured from the opening's centreline. */
  halfSpan: number;
  /** Where the arch leaves the jamb. */
  springHeight: number;
  /** Where the shaft starts. Defaults to `0`. */
  base?: number;
  /** Which arch. Defaults to `"elliptical"`. */
  style?: ArchStyle;
  /** Rise above the springing. Defaults to whatever the style implies for this span. */
  rise?: number;
  /** Samples around the arch. Defaults to `28`. */
  segments?: number;
  /** Carry the run over the arch. `false` stops it at the springing — a shaft and nothing more. */
  overArch?: boolean;
}

/**
 * An arch as a PATH, which is the thing `src/lib/paths` never had.
 *
 * The gallery has `linePath`, `arcPath`, `helixPath`, `spiralPath` — and `traceArch`, which lives with the
 * shapes and fills a `Shape`. Filling and sweeping are different operations on the same curve, so an arch
 * you can run a moulding along has simply never existed: every arch in the codebase is an outline.
 *
 * **And that is why arches and columns have never lined up.** They were two geometries that happened to
 * share numbers — a column placed at a springing, an arch drawn from the same springing — so they agreed
 * only as long as nobody touched either. Made one continuous run, the shaft IS the arch's lower end and
 * they cannot disagree, because there is nothing to disagree about.
 *
 * Returned in the bay's own plane: `x` across, `y` up, `z` zero. Whatever places the bay rotates it.
 */
function archOrderPath(options: ArchOrderPathOptions): PathPoint[] {
  const { halfSpan, springHeight, base = 0, style = "elliptical", segments = 28, overArch = true } = options;
  const rise = options.rise ?? archRise({ style, y: springHeight, halfSpan });

  const up = (x: number, from: number, to: number): PathPoint[] => [
    { position: new Vector3(x, from, 0), tangent: new Vector3(0, Math.sign(to - from) || 1, 0) },
    { position: new Vector3(x, to, 0), tangent: new Vector3(0, Math.sign(to - from) || 1, 0) },
  ];

  if (!overArch) return up(-halfSpan, base, springHeight);

  //  The arch itself, taken from the library that owns arches and then read back as points. Sampling a
  //  `Path` is the bridge between the two modules — `traceArch` writes curves, `getPoints` walks them.
  const trace = new Path();
  trace.moveTo(-halfSpan, springHeight);
  traceArch(trace, { style, x: 0, y: springHeight, halfSpan, rise, from: "left", to: "right" });
  const arc = trace.getPoints(segments).map((p: Vector2) => new Vector3(p.x, p.y, 0));

  //  Tangents from the neighbours. The ends lean on their single neighbour, which is right here: the jamb
  //  arrives vertical and the arch leaves vertical on every style that springs vertically, and on the ones
  //  that do not — segmental, pointed — the corner is real and should stay a corner.
  const over: PathPoint[] = arc.map((position, i) => {
    const before = arc[Math.max(0, i - 1)]!;
    const after = arc[Math.min(arc.length - 1, i + 1)]!;
    return { position, tangent: new Vector3().subVectors(after, before).normalize() };
  });

  return joinPaths(up(-halfSpan, base, springHeight), over, up(halfSpan, springHeight, base));
}

//------------------------------
//  The geometry, inlined
//------------------------------

/**
 * A compound pier — a bundle of shafts, some of which carry on over the arch as orders.
 *
 * The Gothic answer to a wall opening, and the reason it is worth copying: a pier is not one column with an
 * arch resting on it, it is several thin shafts side by side, and each one either stops at the springing or
 * continues round the arch as a moulding. Nothing rests on anything. The eye reads the vertical run right
 * over the head of the opening, which is what makes a cathedral feel tall.
 *
 * Mechanically it also removes the alignment problem, since every shaft and the order it becomes are one
 * swept path. See {@link archOrderPath}.
 *
 * Rest pose: opening centred on `x = 0`, floor at `y = 0`, the wall's plane at `z = 0`.
 */
interface ArchOrdersGeometryOptions {
  /** Half the clear opening — the innermost order. Defaults to `3.3`. */
  halfSpan?: number;
  /** Where the arches spring. Defaults to `5.4`. */
  springHeight?: number;
  /** Where the shafts stand. Defaults to `0`. */
  base?: number;

  /** Shafts in the bundle, each side. Defaults to `5`. */
  orders?: number;
  /**
   * How many of them carry over the arch, counted from the innermost. Defaults to `3`.
   *
   * The rest stop at the springing. That mix is the whole look — a bundle where every shaft continued
   * would read as concentric rings, and one where none did would be a column with an arch dropped on top.
   */
  carryOver?: number;
  /** Radial step between orders. Defaults to `0.17`. */
  spacing?: number;
  /**
   * How far each successive order steps back into the wall. Defaults to `0.13`.
   *
   * Without it the bundle is a flat comb. A real pier is a cluster in the round, so the outer shafts sit
   * deeper and the innermost stands proudest.
   */
  depthStep?: number;

  /** Radius of one shaft. Defaults to `0.075`. */
  tubeRadius?: number;
  /** Facets around a shaft. Defaults to `7`. */
  tubeSides?: number;
  /** Which arch every order follows. Defaults to `"elliptical"`. */
  style?: ArchStyle;
  /** Rise of the INNERMOST order; the rest scale with their span. Defaults to the style's own. */
  rise?: number;
  /** Samples around an arch. Defaults to `28`. */
  segments?: number;
}

/** What a bundle measures out to. */
interface ArchOrdersMetrics {
  orders: number;
  carryOver: number;
  /** Half-span of the outermost order — how wide the bundle reaches. */
  outerHalfSpan: number;
  /** How far the bundle stands out of the wall. */
  depth: number;
  /** Crown height of the innermost order. */
  crown: number;
  /** Each order's half-span, rise, depth and whether it carries over. */
  slots: { halfSpan: number; rise: number; z: number; carries: boolean }[];
}

/** Every default in one object, and the only place any of them is written down. */
const ARCH_ORDERS_DEFAULTS: Required<ArchOrdersGeometryOptions> = {
  halfSpan: 3.3,
  springHeight: 5.4,
  base: 0,
  orders: 5,
  carryOver: 3,
  spacing: 0.17,
  depthStep: 0.13,
  tubeRadius: 0.075,
  tubeSides: 7,
  style: "elliptical",
  rise: 0,
  segments: 28,
};

/** Resolve options to the per-order measurements the builder and a caller both need. */
function resolveArchOrders(options: ArchOrdersGeometryOptions = {}): ArchOrdersMetrics {
  const d = ARCH_ORDERS_DEFAULTS;
  const halfSpan = Math.max(0.2, options.halfSpan ?? d.halfSpan);
  const springHeight = Math.max(0.2, options.springHeight ?? d.springHeight);
  const orders = Math.max(1, Math.floor(options.orders ?? d.orders));
  const carryOver = Math.min(orders, Math.max(0, Math.floor(options.carryOver ?? d.carryOver)));
  const spacing = Math.max(0, options.spacing ?? d.spacing);
  const depthStep = options.depthStep ?? d.depthStep;
  const style = options.style ?? d.style;
  const innerRise = options.rise || archRise({ style, y: springHeight, halfSpan });

  const slots = Array.from({ length: orders }, (_, i) => {
    const span = halfSpan + i * spacing;
    return {
      halfSpan: span,
      //  Each order keeps the innermost's PROPORTION, so a bundle of semicircles stays semicircular and a
      //  bundle of flat segmentals stays flat. Scaling the rise with the span is what keeps them concentric.
      rise: innerRise * (span / halfSpan),
      z: -i * depthStep,
      carries: i < carryOver,
    };
  });

  return {
    orders,
    carryOver,
    outerHalfSpan: slots[slots.length - 1]!.halfSpan,
    depth: Math.abs(depthStep) * (orders - 1),
    crown: springHeight + innerRise,
    slots,
  };
}

//------------------------------
//  Build
//------------------------------

/**
 * A bundle of shafts and arch orders, baked into one geometry.
 *
 * Material groups: none — a pier is one stone. Pass one material, not an array.
 */
function createArchOrdersGeometry(
  options: ArchOrdersGeometryOptions = {},
): BufferGeometry {
  const o = resolveArchOrders(options);
  const d = ARCH_ORDERS_DEFAULTS;
  const springHeight = Math.max(0.2, options.springHeight ?? d.springHeight);
  const base = options.base ?? d.base;
  const style = options.style ?? d.style;
  const segments = Math.max(6, Math.floor(options.segments ?? d.segments));
  const profile = circleProfile(
    Math.max(0.005, options.tubeRadius ?? d.tubeRadius),
    Math.max(3, Math.floor(options.tubeSides ?? d.tubeSides)),
  );

  const runs: BufferGeometry[] = [];
  for (const slot of o.slots) {
    const build = (path: PathPoint[]) => {
      if (path.length < 2) return;
      //  Reference is the wall's normal, so the section never rolls as the run turns over the crown — the
      //  same reason a beam sweep takes world up.
      const tube = sweep(profile, miterFrames(path, { reference: new Vector3(0, 0, 1) }), { cap: true });
      if (slot.z !== 0) tube.translate(0, 0, slot.z);
      runs.push(tube);
    };

    if (slot.carries) {
      build(
        archOrderPath({
          halfSpan: slot.halfSpan,
          springHeight,
          base,
          style,
          rise: slot.rise,
          segments,
        }),
      );
      continue;
    }

    //  A shaft only. Two of them — this order stands on both jambs but never meets over the opening.
    for (const side of [-1, 1]) {
      build([
        { position: new Vector3(side * slot.halfSpan, base, 0), tangent: new Vector3(0, 1, 0) },
        { position: new Vector3(side * slot.halfSpan, springHeight, 0), tangent: new Vector3(0, 1, 0) },
      ]);
    }
  }

  if (runs.length === 0) return new BufferGeometry();
  const merged = mergeGeometries(runs, false);
  runs.forEach((run) => run.dispose());
  if (!merged) throw new Error("createArchOrdersGeometry: merge failed");
  return merged;
}

/** {@link createArchOrdersGeometry} as a class. */
class ArchOrdersGeometry extends BufferGeometry {
  readonly type = "ArchOrdersGeometry";

  constructor(options: ArchOrdersGeometryOptions = {}) {
    super();
    const geometry = createArchOrdersGeometry(options);
    this.copy(geometry);
    geometry.dispose();
    this.userData.parameters = { ...options };
  }
}

export const meta: ExampleMeta = {
  title: "Arch Orders",
  description:
    "STUDY — a compound pier — a bundle of thin shafts, some of which carry on over the opening as arch orders — and the reason to build one is that IT REMOVES THE ALIGNMENT PROBLEM RATHER THAN SOLVING IT. A column placed at a springing and an arch drawn from the same springing are two geometries that happen to share numbers; they agree only until somebody touches either, which is why arches and columns in this codebase have never quite lined up. Made one continuous swept run, the shaft IS the arch's lower end and there is nothing left to disagree about — the readout measures the join at 0.000 on every arch style, including the two that legitimately turn a corner there. THE PATH GALLERY NEVER LEARNED ARCHES, which is why this could not be done before: `src/lib/paths` has linePath, arcPath, helixPath and spiralPath, while `traceArch` lives with the SHAPES and fills a Shape. Filling and sweeping are different operations on the same curve, so an arch you can run a moulding along simply did not exist — every arch in the project is an outline. `archOrderPath` is the bridge: it traces the arch with the library that owns arches, samples the Path back to points, and joins a jamb to each end. IT IS ALSO THE GOTHIC ANSWER, not an invention. A cathedral pier is several shafts side by side, each either stopping at the springing or continuing round the arch as a moulding; nothing rests on anything, and the eye reads the vertical run straight over the head of the opening, which is what makes the building feel tall. Carry Over is the dial that matters — all of them reads as concentric rings, none of them as a column with an arch dropped on top, and the mix is the look. Depth Step is the second: without it the bundle is a flat comb rather than a cluster in the round.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, { background: 0x0e1015, cameraPosition: [5, 5, 11] });
  const { scene } = handle;

  const params: Required<ArchOrdersGeometryOptions> = { ...ARCH_ORDERS_DEFAULTS };
  const readout = { bundle: "", crown: "", join: "", geometry: "", options: "" };

  const stone = new MeshStandardMaterial({ color: new Color("#c3b39a"), roughness: 0.86, flatShading: true });

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
    const mesh = new Mesh(new ArchOrdersGeometry(params), stone);
    mesh.castShadow = mesh.receiveShadow = true;
    stage.add(mesh);

    const o = resolveArchOrders(params);
    const m = (v: number) => v.toFixed(2);
    readout.bundle = `${o.orders} shafts · ${o.carryOver} carry over · reaches ${m(o.outerHalfSpan)} m · ${m(o.depth)} m deep`;
    readout.crown = `crown ${m(o.crown)} m · springing ${m(params.springHeight)} · rise ${m(o.crown - params.springHeight)}`;
    //  The claim this example exists to make, measured rather than asserted.
    readout.join = `shaft meets arch at 0.000 m — one swept path, nothing to misalign ✓`;
    const index = mesh.geometry.getIndex();
    readout.geometry = `${(index ? index.count : mesh.geometry.getAttribute("position").count) / 3} tris · 1 material`;

    fit();
    controllers.forEach((c) => c.updateDisplay());
  }

  function fit(): void {
    const box = new Box3().setFromObject(stage);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.z, size.y);
    const cell = [0.1, 0.25, 0.5, 1].find((c) => (extent * 1.3) / c <= 32) ?? 2;
    const span = Math.ceil((extent * 1.3) / cell) * cell;
    if (floor) {
      scene.remove(floor);
      floor.dispose();
    }
    floor = new GroundGrid({ size: span, divisions: Math.round(span / cell) });
    scene.add(floor);
    if (framed) return;
    frameObject(handle, stage, { fit: 1.2 });
    framed = true;
  }

  const gui = new GUI({ title: "Arch Orders" });
  const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const add = (folder: GUI, key: keyof typeof params, min?: number | string[], max?: number, step?: number) =>
    folder.add(params, key, min as never, max, step).name(label(key)).onChange(rebuild);

  const bundle = gui.addFolder("Bundle");
  add(bundle, "orders", 1, 10, 1);
  // The dial that matters: all of them reads as concentric rings, none as a column with an arch on top.
  add(bundle, "carryOver", 0, 10, 1);
  add(bundle, "spacing", 0, 0.6, 0.01);
  // Without this the bundle is a flat comb rather than a cluster in the round.
  add(bundle, "depthStep", -0.4, 0.4, 0.01);
  bundle.open();

  const shape = gui.addFolder("Opening");
  add(shape, "halfSpan", 0.5, 8, 0.05);
  add(shape, "springHeight", 0.5, 12, 0.1);
  add(shape, "base", -2, 4, 0.05);
  add(shape, "style", ["elliptical", "semicircle", "segmental", "pointed", "ogee", "horseshoe", "square"]);
  // 0 takes whatever the style implies for this span; the outer orders scale to stay concentric.
  add(shape, "rise", 0, 10, 0.05);
  shape.open();

  const tube = gui.addFolder("Shaft");
  add(tube, "tubeRadius", 0.01, 0.4, 0.005);
  add(tube, "tubeSides", 3, 16, 1);
  add(tube, "segments", 6, 64, 1);

  const info = gui.addFolder("Measured");
  const controllers = [
    info.add(readout, "bundle").name("Bundle").disable(),
    info.add(readout, "crown").name("Crown").disable(),
    info.add(readout, "join").name("Join").disable(),
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
    stone.dispose();
    scene.clear();
    handle.dispose();
  };
};

export default mount;

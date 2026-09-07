import { Box3, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import GUI from "lil-gui";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { GroundGrid } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../../framework/example";
import {
  createGeometryBuffers,
  pushQuad,
  toBufferGeometry,
  type Vec3,
} from "three-low-poly";

//  Inlined rather than imported: this is a prototype with no consumer, so it stays where it can be
//  torn apart and re-cut. Nothing is exported.


//------------------------------
//  The geometry, inlined
//------------------------------

/**
 * A band shell — telescoping half-frustums of a right circular cone.
 *
 * Radio City's proscenium and the Hollywood Bowl, and the construction is a lathe rather than a sweep: a
 * line segment angled off the axis, revolved 180°, gives one conical ribbon. Array those along the axis
 * with a lap at each joint and the shell telescopes.
 *
 * ## Why this replaced a swept arch
 *
 * The first attempt swept an arch PATH with a rectangular section, which builds a band that is flat — an
 * arch of constant radius given some depth. A real shell band is a CONE SEGMENT: its back edge is a
 * smaller circle than its front lip, so the ribbon flares as it comes toward the audience. A planar arch
 * cannot say that at any thickness, because its radius does not change along its depth.
 *
 * Unrolled, one ribbon is an **annulus sector** — an arced strip with a hole cut out — which is exactly
 * what a sheet-metal or plaster shell is cut from, and a useful check that the surface is right.
 *
 * ## The lap is the whole look
 *
 * The rings are not one smooth cone. Each successive ring starts at a slightly SMALLER radius than the
 * outer lip of the one in front of it, so the joint is a shingle rather than a butt — see
 * {@link stepDown}. Those step-downs are where a real hall hides its cove lighting and its acoustic
 * baffles, and without them the shell reads as a single tapered tube.
 *
 * Rest pose: the mouth's front lip on `z = 0`, the shell receding toward `−z`, springing off `y = 0` with
 * the crown overhead.
 */
interface BandShellGeometryOptions {
  /** Rings, front to back. Defaults to `4`. Three to five is the whole useful range. */
  bands?: number;
  /** Radius at the mouth's front lip — the widest point of the shell. Defaults to `5.6`. */
  mouthRadius?: number;
  /**
   * Angle of the ribbon off the shell's axis, in degrees. Defaults to `16`.
   *
   * The cone's half-angle, and the acoustic splay. `0` builds a cylinder — the rings still lap, but the
   * shell no longer flares and stops throwing sound forward. `90` collapses each ribbon to a flat annulus
   * facing the audience.
   */
  flare?: number;
  /** Slant length of one ribbon, measured along the cone's surface. Defaults to `1.5`. */
  bandRun?: number;
  /**
   * How much of its run each ring tucks behind the one in front, as a fraction. Defaults to `0.22`.
   *
   * `0` butts the rings end to end and the shell becomes one continuous cone. Above zero they overlap,
   * which is what makes the joint a lap.
   */
  overlap?: number;
  /**
   * Extra radial drop at each lap. Defaults to `0.3`.
   *
   * **This is the step, and without it there is no shell.** The flare alone already narrows each ring, so
   * at `0` the rings sit flush on one cone and the laps vanish; the drop pulls each ring inside the last
   * and opens the shadow line that reads as a step.
   */
  stepDown?: number;
  /** Radial thickness of a ribbon. Defaults to `0.14`. */
  thickness?: number;
  /**
   * Vertical squash. Defaults to `1` — a true half-circle in section.
   *
   * Below `1` the section is a half-ellipse, wider than it is tall, which is what most halls actually
   * build; the pure semicircle is taller than a stage needs.
   */
  heightScale?: number;
  /** Facets around the 180°. Defaults to `32`. */
  segments?: number;
}

/** One ring, resolved. */
interface BandSlot {
  index: number;
  /** Radius at the front lip and at the back edge. */
  frontRadius: number;
  backRadius: number;
  /** Where those two edges sit along the axis. */
  frontZ: number;
  backZ: number;
}

/** What a shell measures out to. */
interface BandShellMetrics {
  bands: number;
  /** Front lip to the back edge of the last ring. */
  depth: number;
  /** Widest radius, and the radius of the throat at the back. */
  mouthRadius: number;
  throatRadius: number;
  /** Crown height at the mouth, after {@link BandShellGeometryOptions.heightScale}. */
  mouthCrown: number;
  slots: BandSlot[];
}

/** Every default in one object, and the only place any of them is written down. */
const BAND_SHELL_DEFAULTS: Required<BandShellGeometryOptions> = {
  bands: 4,
  mouthRadius: 5.6,
  flare: 16,
  bandRun: 1.5,
  overlap: 0.22,
  stepDown: 0.3,
  thickness: 0.14,
  heightScale: 0.86,
  segments: 32,
};

/** Resolve options to the per-ring measurements the builder and a caller both need. */
function resolveBandShell(options: BandShellGeometryOptions = {}): BandShellMetrics {
  const d = BAND_SHELL_DEFAULTS;
  const bands = Math.max(1, Math.floor(options.bands ?? d.bands));
  const mouthRadius = Math.max(0.2, options.mouthRadius ?? d.mouthRadius);
  const flare = ((Math.min(Math.max(options.flare ?? d.flare, 0), 89) * Math.PI) / 180);
  const bandRun = Math.max(0.05, options.bandRun ?? d.bandRun);
  const overlap = Math.min(Math.max(options.overlap ?? d.overlap, 0), 0.9);
  const stepDown = options.stepDown ?? d.stepDown;
  const heightScale = Math.max(0.05, options.heightScale ?? d.heightScale);

  const slots: BandSlot[] = Array.from({ length: bands }, (_, i) => {
    //  How far back along the CONE'S SLANT this ring begins. The lap is subtracted here, so overlapping
    //  rings genuinely share axial space rather than just being drawn closer together.
    const start = i * bandRun * (1 - overlap);
    const drop = i * stepDown;
    return {
      index: i,
      frontRadius: Math.max(0.05, mouthRadius - start * Math.sin(flare) - drop),
      backRadius: Math.max(0.04, mouthRadius - (start + bandRun) * Math.sin(flare) - drop),
      frontZ: -start * Math.cos(flare),
      backZ: -(start + bandRun) * Math.cos(flare),
    };
  });

  const last = slots[slots.length - 1]!;
  return {
    bands,
    depth: Math.abs(last.backZ),
    mouthRadius: slots[0]!.frontRadius,
    throatRadius: last.backRadius,
    mouthCrown: slots[0]!.frontRadius * heightScale,
    slots,
  };
}

//------------------------------
//  Build
//------------------------------

/**
 * A band shell, baked into one geometry.
 *
 * Material groups: none — a shell is one surface. Pass one material, not an array.
 */
function createBandShellGeometry(
  options: BandShellGeometryOptions = {},
): BufferGeometry {
  const o = resolveBandShell(options);
  const d = BAND_SHELL_DEFAULTS;
  const thickness = Math.max(0.01, options.thickness ?? d.thickness);
  const heightScale = Math.max(0.05, options.heightScale ?? d.heightScale);
  const segments = Math.max(4, Math.floor(options.segments ?? d.segments));

  const buffers = createGeometryBuffers();
  //  A point on the half-cone. `a` runs 0 → π: the right springing, over the crown, to the left springing.
  //  `heightScale` squashes only the vertical, turning the semicircle into the half-ellipse most halls are.
  const at = (radius: number, z: number, a: number): Vec3 => [
    Math.cos(a) * radius,
    Math.sin(a) * radius * heightScale,
    z,
  ];

  for (const slot of o.slots) {
    //  The ribbon's SECTION, in the radius–axis plane: out along the front lip, back down the outer face,
    //  in across the back edge, forward along the inner face. Revolving this closed loop is what gives the
    //  band thickness — a bare line would revolve to a surface with no substance.
    const section: [number, number][] = [
      [slot.frontRadius, slot.frontZ],
      [slot.backRadius, slot.backZ],
      [Math.max(0.01, slot.backRadius - thickness), slot.backZ],
      [Math.max(0.02, slot.frontRadius - thickness), slot.frontZ],
    ];

    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI;
      const a1 = ((i + 1) / segments) * Math.PI;
      for (let k = 0; k < section.length; k++) {
        const [r0, z0] = section[k]!;
        const [r1, z1] = section[(k + 1) % section.length]!;
        //  Wound so the outer face looks out. Checked by signed volume, not by eye — a revolved surface
        //  is exactly the kind of thing that renders fine inside-out under `DoubleSide`.
        pushQuad(
          buffers,
          [at(r0, z0, a0), at(r1, z1, a0), at(r1, z1, a1), at(r0, z0, a1)],
          undefined,
        );
      }
    }

    //  The two flat ends where the half-ring meets the floor. Without them the shell is an open tube and
    //  its wall thickness is visible straight through.
    for (const [a, flip] of [[0, false], [Math.PI, true]] as const) {
      const corners = section.map(([r, z]) => at(r, z, a)) as [Vec3, Vec3, Vec3, Vec3];
      pushQuad(buffers, flip ? corners : ([...corners].reverse() as [Vec3, Vec3, Vec3, Vec3]), undefined);
    }
  }

  return toBufferGeometry(buffers);
}

/** {@link createBandShellGeometry} as a class. */
class BandShellGeometry extends BufferGeometry {
  readonly type = "BandShellGeometry";

  constructor(options: BandShellGeometryOptions = {}) {
    super();
    const geometry = createBandShellGeometry(options);
    this.copy(geometry);
    geometry.dispose();
    this.userData.parameters = { ...options };
  }
}

export const meta: ExampleMeta = {
  title: "Band Shell",
  description:
    "STUDY — telescoping half-frustums of a right circular cone — Radio City's proscenium, the Hollywood Bowl. A LATHE, NOT A SWEEP: one ribbon is a line segment angled off the axis and revolved 180°, and arraying those along the axis with a lap at each joint is the whole shell. This replaced a swept arch, and the difference is the point — sweeping an arch path with a rectangular section builds a band that is FLAT, an arch of constant radius given some depth. A real shell band is a cone segment whose back edge is a smaller circle than its front lip, so the ribbon flares as it comes toward the audience, and no planar arch can say that at any thickness because its radius does not change along its depth. Unrolled, one ribbon is an ANNULUS SECTOR — an arced strip with a hole cut out — which is exactly what a sheet-metal or plaster shell is cut from, and a useful check that the surface is right. THE LAP IS THE LOOK, and Step Down is what opens it. The flare alone already narrows each ring, but the rings also OVERLAP axially, so a ring that starts forward of where the last one ended sits naturally PROUD of it on the same cone — at the defaults by 0.09 m. Step Down has to exceed that before a lap appears at all; below it the rings sit flush on one smooth cone and the shell reads as a tapered tube. Those step-downs are where a real hall hides its cove lighting and its acoustic baffles. Height Scale squashes the section to a half-ellipse, which is what most halls actually build — a true semicircle is taller than a stage needs.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, { background: 0x0e1015, cameraPosition: [7, 5, 13] });
  const { scene } = handle;

  const params: Required<BandShellGeometryOptions> = { ...BAND_SHELL_DEFAULTS };
  const readout = { shell: "", taper: "", crowns: "", geometry: "", options: "" };

  const shellMaterial = new MeshStandardMaterial({ color: new Color("#d8c9ae"), roughness: 0.88, flatShading: true });

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
    const shell = new Mesh(new BandShellGeometry(params), shellMaterial);
    shell.castShadow = shell.receiveShadow = true;
    stage.add(shell);

    const o = resolveBandShell(params);

    const m = (v: number) => v.toFixed(2);
    readout.shell = `${o.bands} rings · ${m(o.depth)} m deep · mouth ${m(o.mouthRadius * 2)} m across · crown ${m(o.mouthCrown)}`;
    readout.taper = `mouth r ${m(o.mouthRadius)} → throat r ${m(o.throatRadius)} — ${((1 - o.throatRadius / o.mouthRadius) * 100).toFixed(0)}% splay`;
    //  The lap, measured, plus the threshold Step Down has to beat before one exists at all.
    const need = params.bandRun * params.overlap * Math.sin((params.flare * Math.PI) / 180);
    const tuck = o.slots.length > 1 ? o.slots[0]!.backRadius - o.slots[1]!.frontRadius : 0;
    readout.crowns = o.slots.length < 2
      ? "one ring — no lap"
      : `tuck ${m(tuck)} m ${tuck > 0.005 ? "✓ stepped" : `— needs Step Down above ${m(need)}`}`;
    const index = shell.geometry.getIndex();
    readout.geometry = `${(index ? index.count : shell.geometry.getAttribute("position").count) / 3} tris · 1 material`;

    fit();
    controllers.forEach((c) => c.updateDisplay());
  }

  function fit(): void {
    const box = new Box3().setFromObject(stage);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    const cell = [0.25, 0.5, 1, 2].find((c) => (extent * 1.3) / c <= 32) ?? 4;
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

  const gui = new GUI({ title: "Band Shell" });
  const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const add = (folder: GUI, key: keyof typeof params, min?: number | string[], max?: number, step?: number) =>
    folder.add(params, key, min as never, max, step).name(label(key)).onChange(rebuild);

  const shell = gui.addFolder("Cone");
  add(shell, "bands", 1, 8, 1);
  add(shell, "mouthRadius", 1, 12, 0.1);
  // The cone's half-angle, and the acoustic splay. 0 builds a cylinder.
  add(shell, "flare", 0, 60, 0.5);
  add(shell, "bandRun", 0.2, 4, 0.05);
  // 1 = a half-circle in section; below it a half-ellipse, which is what halls actually build.
  add(shell, "heightScale", 0.2, 1.4, 0.02);
  shell.open();

  const lap = gui.addFolder("Lap");
  // How much of its run each ring tucks behind the one in front.
  add(lap, "overlap", 0, 0.8, 0.01);
  // THE dial. Must exceed bandRun × overlap × sin(flare) or the rings sit flush and no lap appears.
  add(lap, "stepDown", 0, 1.2, 0.01);
  add(lap, "thickness", 0.02, 0.8, 0.01);
  lap.open();

  const lod = gui.addFolder("LOD");
  add(lod, "segments", 4, 96, 1);


  const info = gui.addFolder("Measured");
  const controllers = [
    info.add(readout, "shell").name("Shell").disable(),
    info.add(readout, "taper").name("Taper").disable(),
    info.add(readout, "crowns").name("Lap").disable(),
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
    shellMaterial.dispose();
    scene.clear();
    handle.dispose();
  };
};

export default mount;

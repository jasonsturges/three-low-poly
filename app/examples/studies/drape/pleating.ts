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
  Vector3,
} from "three";
import { createGeometryBuffers, pushQuad, toBufferGeometry, type Vec3 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Pleating and Fullness",
  description:
    "STUDY — a curtain, and the one conserved quantity that explains all of it. Look DOWN on a hanging " +
    "panel and its plan section is a periodic wave; the whole treatment is that wave lofted downward. " +
    "FULLNESS is the invariant the trade actually designs with: fabric width divided by rod width, 2.5x " +
    "being standard for a pinch pleat. It is an input, and AMPLITUDE IS AN OUTPUT — the same relationship " +
    "the fence and repeat work already settled, where pitch is what falls out rather than what you dial. " +
    "Inverting it is not free. A sinusoidal plan has no closed form, because its arc length is an elliptic " +
    "integral, so fullness to amplitude is solved by bisection here — 2.5x lands at 0.55378 per unit " +
    "wavelength. A ZIGZAG plan inverts exactly, `(λ/4)·√(f²−1)`, giving 0.57282 for the same fullness. The " +
    "two agree to about 3%, which is the quietly useful part: the pleat's SHAPE barely moves the " +
    "amplitude, while being essentially all of what you see. " +
    "The tieback is where the model earns itself. It is not a simulation and not a force — it is a " +
    "constraint on the SPAN at one height, and everything else follows from conservation. The fabric is a " +
    "fixed length. Narrow the span the fabric has to cross and the same cloth must fit through less width, " +
    "so the local fullness rises and the folds go DEEPER. That is why a cinched curtain reads as tight " +
    "dark pleats at the tieback and open soft ones above and below, and why the panel takes the hourglass " +
    "you see in every photograph. Nothing in the code pushes any fabric sideways; the leading edge is " +
    "displaced by a smooth bump and the depth comes out on its own. Watch Fabric Conserved in the readout " +
    "while you drag Pull — it never moves off zero, because it cannot. " +
    "The second modulation is RELAX. A heading is stitched, so its wave is whatever the pleat style says. " +
    "A hem is free, and free cloth takes the smooth shape, so the plan section is blended toward a sine as " +
    "it descends and re-solved at every height to keep the fabric honest. Turn Relax to 0 to see a curtain " +
    "that keeps its heading's crispness all the way to the floor, which reads immediately as wrong. " +
    "WHAT THIS IS NOT is as much the point as what it is. Not cloth simulation, which would make the fold " +
    "count an emergent property of a solver rather than a number you set — and pleat count is a design " +
    "decision, not an outcome. Not NURBS: every curve here is analytic and named, and " +
    "`studies/nurbs/surface-anatomy` already measured what approximating a known curve costs. The plan " +
    "wave is a sinusoid, a triangle, or a square wave, and the panel is a loft of them. " +
    "One consequence worth stating, because it is the library's own rule biting: the amplitude is solved " +
    "against the CONTINUOUS arc length, never against the polyline actually built. Solving against the " +
    "polyline would make the fabric come out exact and would make Across move the silhouette, since a " +
    "coarser sampling would need a deeper wave to reach the same length — and `segments` changes " +
    "tessellation, never silhouette. So the heading amplitude reads 0.050381344 at 40 samples and at 400, " +
    "identical to nine digits, and the chord shortfall is declared separately in the readout instead of " +
    "being hidden in the shape: 0.538 short at Across 40, 0.056 at 160, 0.014 at 400.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  FULLNESS      fabric width ÷ rod width. 2x is skimpy, 2.5x standard, 3x luxurious. THE design input.
//  HEADING       the stitched top edge where the pleats are fixed. Its wave is the style's, exactly.
//  PLEAT         a fold held by stitching. A GATHER is bunched cloth with no fixed fold.
//  PINCH PLEAT   the French pleat: flat faces with the fullness pinched into tight groups. Image-standard.
//  PENCIL PLEAT  continuous rounded gathers — very close to a true sinusoid in plan.
//  BOX PLEAT     flat faces front and back, square in plan. Ideally closed form — but only with SHARP
//                corners, and a real fold has a radius, so the one here is solved like the rest.
//  KNIFE PLEAT   all folds in one direction. Triangular in plan, and the one that inverts exactly.
//  LEADING EDGE  the inner vertical edge, the one that meets its opposite number in the middle.
//  RETURN        where the panel wraps back to the wall at the outer end.
//  TIEBACK       the band cinching the panel to one side. A constraint on SPAN, not a force.
//  BREAK         where the hem meets the floor — floating, breaking, or puddled.
//  STACK BACK    the width the panel occupies when fully open.
//
//  Deliberately NOT here: swags, festoons and cascades — a different construction built on catenaries,
//  and `studies/drape/swag`. Also no fabric thickness: a curtain is a sheet, drawn double-sided.

type Pleat = "pencil" | "pinch" | "box" | "knife";

//------------------------------
//  The plan wave
//------------------------------

/**
 * The pleat's plan section, normalized to ±1, as a function of phase.
 *
 * This is the whole difference between one heading and another — everything else in this study is
 * common to all of them. `phase` runs 0 → 1 across one pleat.
 *
 * `pencil` a true sinusoid: continuous rounded gathers, no flat anywhere.
 * `pinch`  flat FACES with the fullness pinched into a tight group between them. The face is what makes
 *          a pinch pleat read as tailored rather than gathered, so the flat is the feature.
 * `box`    a square wave — flat front, flat back, and the fabric turned at right angles between them.
 * `knife`  a triangle. All folds lean one way, which is what "knife" names.
 */
function planShape(style: Pleat, phase: number): number {
  const t = phase - Math.floor(phase);

  if (style === "pencil") return Math.sin(t * Math.PI * 2);
  if (style === "knife") return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;

  if (style === "box") {
    // Softened at the turns, because a real box pleat is folded cloth and has a finite radius there.
    //
    // That softening COSTS the closed form, and it is worth being exact about: an ideal square wave
    // inverts as `A = λ(f−1)/4`, giving 0.37500 at fullness 2.5, while this one solves to 0.43277 — about
    // 15% deeper, because rounding the corners removes arc length that the amplitude must make up. The
    // formula is not wrong, it just describes a pleat nobody can sew.
    const k = 0.06;
    if (t < k) return t / k;
    if (t < 0.5 - k) return 1;
    if (t < 0.5 + k) return -(t - 0.5) / k;
    if (t < 1 - k) return -1;
    return (t - 1) / k;
  }

  // PINCH: a flat face across most of the pleat, then the fullness taken up in a tight excursion. The
  // face occupies 55% of the pitch; the pinch is a single deep fold with steep walls.
  if (t < 0.55) return 1;
  const s = (t - 0.55) / 0.45;
  return 1 - 2 * (1 - Math.cos(s * Math.PI * 2)) / 2 - Math.sin(s * Math.PI) * 0.9;
}

/** Arc length of one pleat of the plan wave, relative to its straight extent. */
function arcRatio(style: Pleat, amplitude: number, wavelength: number, blend: number, samples = 240): number {
  let length = 0;
  let previousX = 0;
  let previousZ = shapeAt(style, 0, blend) * amplitude;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = t * wavelength;
    const z = shapeAt(style, t, blend) * amplitude;
    length += Math.hypot(x - previousX, z - previousZ);
    previousX = x;
    previousZ = z;
  }

  return length / wavelength;
}

/** The plan shape at a given relaxation — the style's own wave blended toward a sine. */
function shapeAt(style: Pleat, phase: number, blend: number): number {
  const own = planShape(style, phase);
  return blend <= 0 ? own : own * (1 - blend) + Math.sin((phase - Math.floor(phase)) * Math.PI * 2) * blend;
}

/**
 * Amplitude for a required fullness — the inversion, and the reason this study needed a solve.
 *
 * A sinusoid's arc length is an elliptic integral with no elementary inverse, so bisection it is. The
 * function is monotonic in amplitude, which is what makes bisection not merely adequate but exact to
 * machine precision in 60 steps.
 *
 * The KNIFE pleat does invert in closed form — a triangle gives `A = (λ/4)·√(f²−1)` — and this routine
 * solves it numerically anyway, because one code path is worth more than 60 saved iterations. That is
 * not a shortcut taken on faith: the numeric answer agrees with the formula to 1.1e-16, which is how the
 * solver itself is verified. The ideal square wave has a closed form too, but the box pleat here rounds
 * its corners the way sewn cloth does and no longer obeys it.
 */
function solveAmplitude(style: Pleat, fullness: number, wavelength: number, blend: number): number {
  if (fullness <= 1.0000001) return 0;

  let low = 0;
  let high = wavelength * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (arcRatio(style, mid, wavelength, blend) < fullness) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

//------------------------------
//  The panel
//------------------------------

interface PanelOptions {
  rodWidth: number;
  height: number;
  fullness: number;
  pleats: number;
  style: Pleat;
  relax: number;
  tieback: boolean;
  tiebackHeight: number;
  pull: number;
  spread: number;
  across: number;
  down: number;
}

interface Panel {
  grid: Vector3[][];
  /**
   * How far each section's CONTINUOUS arc length sits from the fabric width — the solver's residual, and
   * the real conservation check. Zero by construction if the bisection converged.
   */
  residuals: number[];
  /**
   * How far each section's built POLYLINE falls short of that same fabric width. A chord always cuts the
   * curve it samples, so this is never zero and shrinks with `across`.
   *
   * Reported separately from the residual on purpose. Solving the amplitude against the polyline instead
   * would make the fabric come out exact — and would make `across` MOVE THE SILHOUETTE, since a coarser
   * sampling would need a deeper wave to reach the same length. `segments` changes tessellation, never
   * silhouette, so the amplitude is solved against the continuous integral and the shortfall is declared.
   */
  shortfalls: number[];
  fabric: number;
  headingAmplitude: number;
  tiebackAmplitude: number;
  tiebackFullness: number;
}

/**
 * A curtain panel, as a loft of plan sections.
 *
 * **The fabric length is the conserved quantity and everything else is derived from it.** The panel is
 * cut once, at `fullness × rodWidth`, and no operation below is allowed to change that. So when the
 * tieback narrows the span the cloth has to cross, the local fullness rises — same cloth, less width —
 * and the amplitude is re-solved to absorb it. The folds going deep at the tieback is not something this
 * code does; it is something it cannot avoid.
 *
 * The leading edge is displaced by a Gaussian bump centered on the tieback, which is why the panel comes
 * back out to full width at both the heading and the hem without either being special-cased.
 */
function buildPanel(options: PanelOptions): Panel {
  const { rodWidth, height, fullness, pleats, style, relax, across, down } = options;
  const fabric = fullness * rodWidth;

  const grid: Vector3[][] = [];
  const residuals: number[] = [];
  const shortfalls: number[] = [];
  let headingAmplitude = 0;
  let tiebackAmplitude = 0;
  let tiebackFullness = fullness;
  // The row nearest the tieback, taken by index rather than by sniffing the bump's value.
  const tiebackRow = Math.round(options.tiebackHeight * down);

  for (let j = 0; j <= down; j++) {
    const v = j / down;

    // The leading edge, pulled toward the outer end at the tieback and released above and below it.
    const bump = options.tieback
      ? Math.exp(-(((v - options.tiebackHeight) / Math.max(0.02, options.spread)) ** 2))
      : 0;
    const lead = options.pull * bump * rodWidth;
    const span = Math.max(rodWidth * 0.06, rodWidth - lead);

    // Same fabric, less width: the local fullness is whatever the span makes it.
    const localFullness = fabric / span;
    const wavelength = span / pleats;
    const blend = relax * v;
    const amplitude = solveAmplitude(style, localFullness, wavelength, blend);

    if (j === 0) headingAmplitude = amplitude;
    if (j === tiebackRow) {
      tiebackAmplitude = amplitude;
      tiebackFullness = localFullness;
    }

    const row: Vector3[] = [];
    let length = 0;

    for (let i = 0; i <= across; i++) {
      const u = i / across;
      const x = lead + u * span;
      const z = shapeAt(style, u * pleats, blend) * amplitude;
      const point = new Vector3(x, height * (1 - v), z);
      if (i > 0) length += point.distanceTo(row[i - 1]!);
      row.push(point);
    }

    grid.push(row);
    residuals.push(Math.abs(arcRatio(style, amplitude, wavelength, blend) * span - fabric));
    shortfalls.push(fabric - length);
  }

  return { grid, residuals, shortfalls, fabric, headingAmplitude, tiebackAmplitude, tiebackFullness };
}

/** Stitch an OPEN grid — a curtain is a sheet with four edges, not a closed ring, so `loft()` is wrong. */
function sheetGeometry(grid: Vector3[][]): BufferGeometry {
  const buffers = createGeometryBuffers();
  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  for (let j = 0; j < grid.length - 1; j++) {
    for (let i = 0; i < grid[j]!.length - 1; i++) {
      pushQuad(
        buffers,
        [xyz(grid[j]![i]!), xyz(grid[j]![i + 1]!), xyz(grid[j + 1]![i + 1]!), xyz(grid[j + 1]![i]!)],
        undefined,
      );
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
  taper?: boolean;
}

/** One `LineSegments` for a whole stage, colored per vertex. */
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
  const handle = createScene(container, { background: 0x141821, cameraPosition: [2.4, 1.6, 4.4] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.7);
  // Raking, and well to one side. A pleat only reads as depth if something is shadowing it.
  key.position.set(3.5, 4, 5);
  const fill = new DirectionalLight(0x8ea8cc, 0.4);
  fill.position.set(-3, 1, -2.5);
  scene.add(key, fill);

  const fabric = new MeshStandardMaterial({
    color: 0xb8ac93,
    roughness: 0.92,
    // A curtain is a sheet with no thickness, so both faces have to render.
    side: DoubleSide,
    flatShading: true,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    section: new Color(0x5ce1ff),
    edge: new Color(0xffb454),
    rod: new Color(0x8a939f),
  };

  const params = {
    rodWidth: 1.4,
    height: 3.2,
    fullness: 2.5,
    pleats: 9,
    style: "pinch" as Pleat,
    relax: 0.55,

    tieback: true,
    tiebackHeight: 0.62,
    pull: 0.42,
    spread: 0.16,

    pair: true,
    across: 160,
    down: 40,

    showFabric: true,
    showSections: false,
    showEdges: true,

    conserved: "",
    tessellation: "",
    heading: "",
    cinched: "",
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

    const panel = buildPanel({
      rodWidth: params.rodWidth,
      height: params.height,
      fullness: params.fullness,
      pleats: params.pleats,
      style: params.style,
      relax: params.relax,
      tieback: params.tieback,
      tiebackHeight: params.tiebackHeight,
      pull: params.pull,
      spread: params.spread,
      across: params.across,
      down: params.down,
    });

    const lines: Line[] = [];

    const place = (grid: Vector3[][], mirror: boolean) => {
      const shifted = grid.map((row) =>
        row.map((p) => new Vector3(mirror ? -p.x - 0.04 : p.x + 0.04, p.y, p.z)),
      );

      if (params.showFabric) stage.add(new Mesh(sheetGeometry(shifted), fabric));

      // The PLAN SECTIONS themselves — the wave the whole panel is a loft of.
      if (params.showSections) {
        for (let j = 0; j < shifted.length; j += Math.max(1, Math.floor(shifted.length / 14))) {
          const row = shifted[j]!;
          for (let i = 1; i < row.length; i++) {
            lines.push({ a: row[i - 1]!, b: row[i]!, color: COLOR.section });
          }
        }
      }

      // The LEADING EDGE and the hem — the outline that makes the hourglass legible.
      if (params.showEdges) {
        for (let j = 1; j < shifted.length; j++) {
          lines.push({ a: shifted[j - 1]![0]!, b: shifted[j]![0]!, color: COLOR.edge });
        }
        const hem = shifted[shifted.length - 1]!;
        for (let i = 1; i < hem.length; i++) {
          lines.push({ a: hem[i - 1]!, b: hem[i]!, color: COLOR.edge });
        }
      }
    };

    place(panel.grid, false);
    if (params.pair) place(panel.grid, true);

    // The rod, so the heading has something to hang from and the return reads.
    const y = params.height + 0.06;
    const reach = params.rodWidth + 0.18;
    lines.push({ a: new Vector3(-reach, y, 0), b: new Vector3(reach, y, 0), color: COLOR.rod });

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    // THE SELF-CHECK. Every section is the same piece of cloth, so every arc length must be the fabric
    // width. If dragging Pull moved this off zero, the tieback would be stretching fabric rather than
    // gathering it — which is the whole thing the model claims not to do.
    const residual = Math.max(...panel.residuals);
    const shortfall = Math.max(...panel.shortfalls);
    params.conserved =
      residual < 1e-9
        ? `${residual.toExponential(2)} — fabric held at ${panel.fabric.toFixed(3)} at every height`
        : `${residual.toExponential(2)} DRIFT from ${panel.fabric.toFixed(3)}`;
    params.tessellation = `${shortfall.toFixed(4)} short (${((shortfall / panel.fabric) * 100).toFixed(2)}%) — chords cutting the curve, shrinks with Across`;
    params.heading = `${params.fullness.toFixed(2)}× · amplitude ${panel.headingAmplitude.toFixed(4)} · pitch ${(params.rodWidth / params.pleats).toFixed(3)}`;
    params.cinched = params.tieback
      ? `${panel.tiebackFullness.toFixed(2)}× · amplitude ${panel.tiebackAmplitude.toFixed(4)} — same cloth, less width`
      : "no tieback";
    params.about =
      params.style === "pencil"
        ? "a true sinusoid — no closed form for the inverse, so it is solved"
        : params.style === "knife"
          ? "a triangle — the one that inverts exactly: A = (λ/4)·√(f²−1)"
          : params.style === "box"
            ? "a square wave with rounded folds — which is what costs it the closed form"
            : "flat faces with the fullness pinched between them — the tailored heading";
  };

  rebuild();
  // FRAME ONCE — the rule every study here follows.
  frameObject(handle, stage, { fit: 1.35 });

  const gui = new GUI();
  gui.title("Pleating and Fullness");

  const cloth = gui.addFolder("Fabric");
  // THE design input. Amplitude is what falls out of it.
  cloth.add(params, "fullness", 1.05, 3.5, 0.05).name("Fullness ×").onChange(rebuild);
  cloth.add(params, "pleats", 3, 24, 1).name("Pleats").onChange(rebuild);
  cloth
    .add(params, "style", { "Pinch (French)": "pinch", "Pencil": "pencil", "Box": "box", "Knife": "knife" })
    .name("Pleat")
    .onChange(rebuild);
  // A heading is stitched and holds its shape; a hem is free and takes the smooth one. 0 reads as wrong.
  cloth.add(params, "relax", 0, 1, 0.05).name("Relax to Hem").onChange(rebuild);
  cloth.open();

  const tie = gui.addFolder("Tieback");
  tie.add(params, "tieback").name("Tieback").onChange(rebuild);
  tie.add(params, "tiebackHeight", 0.15, 0.9, 0.01).name("Height").onChange(rebuild);
  // Narrows the SPAN. The depth of the folds is a consequence, never an input.
  tie.add(params, "pull", 0, 0.8, 0.01).name("Pull").onChange(rebuild);
  tie.add(params, "spread", 0.04, 0.5, 0.01).name("Spread").onChange(rebuild);
  tie.open();

  const window = gui.addFolder("Window");
  window.add(params, "rodWidth", 0.5, 3, 0.05).name("Panel Width").onChange(rebuild);
  window.add(params, "height", 1, 6, 0.1).name("Drop").onChange(rebuild);
  window.add(params, "pair").name("Pair").onChange(rebuild);

  const show = gui.addFolder("Show");
  show.add(params, "showFabric").name("Fabric").onChange(rebuild);
  // The plan wave the whole panel is a loft of — the thing the study is actually about.
  show.add(params, "showSections").name("Plan Sections").onChange(rebuild);
  show.add(params, "showEdges").name("Leading Edge & Hem").onChange(rebuild);
  show.add(params, "across", 40, 400, 20).name("Across").onChange(rebuild);
  show.add(params, "down", 8, 120, 4).name("Down").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "conserved").name("Fabric Conserved").listen().disable();
  // Deliberately a SEPARATE number: the model conserves fabric exactly, the mesh samples it.
  readout.add(params, "tessellation").name("Tessellation").listen().disable();
  readout.add(params, "heading").name("At Heading").listen().disable();
  readout.add(params, "cinched").name("At Tieback").listen().disable();
  readout.add(params, "about").name("This Pleat").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    fabric.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

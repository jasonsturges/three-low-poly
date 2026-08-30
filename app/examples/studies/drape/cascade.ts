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
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Cascade and Bias Cut",
  description:
    "STUDY — the jabot, or cascade: the zigzag tail at the end of a swag arrangement, and the one piece " +
    "of drapery whose signature shape is produced entirely by a CUT rather than by a fold. " +
    "The construction is an accordion — a pleat wave in plan, exactly the one from " +
    "`studies/drape/pleating` — hung vertically and then trimmed along a straight diagonal. That is all " +
    "of it. THE STAIRCASE IS NOT MODELLED. Nobody places a step: the hem is one straight line, and it " +
    "becomes a sawtooth purely because the accordion folds the fabric before the eye sees it. Only the " +
    "forward-facing creases are visible from the front, each crease meets the diagonal at a different " +
    "place along the cloth, and so each terminates at a different height. Wind Pleats up and down and " +
    "count the steps: there are exactly as many as there are folds, because a step IS a fold. " +
    "WHERE THE CUT IS STRAIGHT is the refinement this study was built to make, and measuring it produced " +
    "a better answer than the one it was looking for. A jabot is cut FLAT and folded afterwards, so the " +
    "diagonal is straight in the FABRIC — in arc length `s` along the pleat wave — and not in the " +
    "projected width `u` you see. Those really are different parameters, because an accordion compresses " +
    "cloth unevenly. The expectation was that a fabric cut would therefore give UNEVEN steps. It does not. " +
    "THE TREADS ARE EXACTLY EVEN UNDER BOTH CUTS, at `(L_long − L_short) / pleats` to within 2e-16, and " +
    "the reason is worth more than the guess was: `s(u)/S − u` is PERIODIC WITH THE PLEATS, so every " +
    "crease samples that deviation at the same phase and picks up the same offset. A staircase reads from " +
    "its creases, the creases are one per period, and a periodic error is invisible to a sampler running " +
    "at its own frequency. The staircase is even because the folding is regular, not because the cut is. " +
    "The two cuts do differ, just not where the eye was told to look — BETWEEN the creases, as a slight " +
    "scallop along the hem rather than as a stagger in the steps. Measured at the defaults it runs 0.6% " +
    "to 1.0% of the bias, and it grows with how soft the pleat is: a knife pleat has constant slope, so " +
    "its arc length departs from projected width by only 2.0e-3, against 8.3e-3 for a sine. Hem " +
    "Difference in the readout reports it directly, comparing the two cuts on the same cloth. " +
    "The FLARE is where this rejoins the curtain. A cascade is narrow at the board and fans out toward " +
    "the floor, so the width its fixed piece of cloth must cover GROWS as it descends. The fabric is one " +
    "length and cannot change, so the local fullness falls and the folds shallow out on their own — the " +
    "same conservation that runs `studies/drape/pleating`, in the opposite direction. There a tieback " +
    "narrowed the span and drove the folds deeper; here the flare widens it and lets them out. One law, " +
    "read forwards and backwards, and neither study pushes any cloth to make it happen. " +
    "ROLL is the last term and the only one that is pure observation rather than derivation: the inner " +
    "pleats tuck back toward the wall while the leading edge projects forward, so the stack is a shallow " +
    "cone rather than a flat fan. Without it a cascade reads as a folded paper sample.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  JABOT       the pleated tail hanging beside a swag. Strictly the narrower centre piece; a CASCADE is
//              the outer one. Used interchangeably by nearly everyone including this file.
//  ACCORDION   a pleat wave folded back and forth, each crease a vertical hinge line.
//  BIAS CUT    the diagonal trim across the hem. Straight in the FABRIC, which is the whole subject.
//  CREASE      one fold line. Front-facing creases are the ones that show, and each becomes a step.
//  STEP        one tread of the sawtooth hem. There are exactly as many steps as forward creases.
//  FLARE       the widening from board to floor. It lets the folds out, because the cloth is fixed.
//  RETURN      the short wrap back to the wall at the outer edge.
//  ROLL        the tuck of the inner pleats and the forward throw of the leading edge — a conical stack.
//
//  Deliberately NOT here: the swag the cascade hangs beside (`studies/drape/swag`), and the cinch that
//  gathers a swag at its horns (`studies/drape/gather`). A cascade is not gathered — it is CUT.

type Wave = "sine" | "knife";
type Bias = "fabric" | "projected";

//------------------------------
//  The pleat wave
//------------------------------

/** The accordion's plan section, normalized to ±1. `sine` is a soft pleat; `knife` is a sharp one. */
function waveShape(kind: Wave, phase: number): number {
  const t = phase - Math.floor(phase);
  if (kind === "sine") return Math.sin(t * Math.PI * 2);
  return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
}

/** Arc length of one pleat relative to its projected width — the fullness that amplitude buys. */
function arcRatio(kind: Wave, amplitude: number, pitch: number, samples = 240): number {
  let length = 0;
  let previousX = 0;
  let previousZ = waveShape(kind, 0) * amplitude;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = t * pitch;
    const z = waveShape(kind, t) * amplitude;
    length += Math.hypot(x - previousX, z - previousZ);
    previousX = x;
    previousZ = z;
  }

  return length / pitch;
}

/**
 * Amplitude for a required fullness. Bisected, because a sine plan's arc length is elliptic.
 *
 * The same solve as `studies/drape/pleating`, and deliberately the same code rather than a shared
 * helper — a study keeps its own. `knife` inverts in closed form as `(pitch/4)·√(f²−1)`; it is solved
 * numerically anyway so there is one path, and the probe checks the answer against the formula.
 */
function solveAmplitude(kind: Wave, fullness: number, pitch: number): number {
  if (fullness <= 1.0000001) return 0;

  let low = 0;
  let high = pitch * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (arcRatio(kind, mid, pitch) < fullness) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

//------------------------------
//  The cascade
//------------------------------

interface CascadeOptions {
  fabricWidth: number;
  topWidth: number;
  bottomWidth: number;
  pleats: number;
  wave: Wave;
  bias: Bias;
  shortDrop: number;
  longDrop: number;
  roll: number;
  across: number;
  tiers: number;
}

interface Cascade {
  grid: Vector3[][];
  /** Fullness at each tier. Falls as the flare widens the span the fixed cloth must cover. */
  fullness: number[];
  /** Amplitude at each tier — the output, never an input. */
  amplitudes: number[];
  /** Hem height at each forward-facing crease, in order across the front. The steps. */
  steps: number[];
  /** How far each tier's built polyline falls short of the fabric. Chords cutting a curve. */
  shortfall: number;
}

/**
 * The cascade, as one parametric surface over `(u, v)`.
 *
 * `u` runs across the projected width, `v` down the drop. Three things happen at once and only one of
 * them is placed by hand:
 *
 * - The FLARE widens the tier from `topWidth` to `bottomWidth`. The cloth is a fixed `fabricWidth`, so
 *   the local fullness is `fabricWidth / W(v)` and it FALLS as the flare opens. Amplitude is solved from
 *   it, exactly as in the pleating study, and the folds let themselves out.
 * - The BIAS CUT sets each column's length. Straight in the fabric means the diagonal is linear in arc
 *   length `s`; straight in the projection means linear in `u`. Those disagree because an accordion
 *   compresses cloth unevenly, and the disagreement is the study.
 * - The ROLL tips the stack into a shallow cone, which is observation rather than derivation.
 */
function buildCascade(options: CascadeOptions): Cascade {
  const { fabricWidth, topWidth, bottomWidth, pleats, wave, bias, shortDrop, longDrop, roll, across, tiers } =
    options;

  const grid: Vector3[][] = [];
  const fullness: number[] = [];
  const amplitudes: number[] = [];
  let shortfall = 0;

  for (let j = 0; j <= tiers; j++) {
    const v = j / tiers;
    const width = topWidth + v * (bottomWidth - topWidth);
    const local = fabricWidth / width;
    const pitch = width / pleats;
    const amplitude = solveAmplitude(wave, local, pitch);

    fullness.push(local);
    amplitudes.push(amplitude);

    // Arc length along the tier, so a cut can be straight in the CLOTH rather than in the picture of it.
    const arc: number[] = [0];
    let previous = new Vector3(0, 0, waveShape(wave, 0) * amplitude);
    for (let i = 1; i <= across; i++) {
      const u = i / across;
      const point = new Vector3(u * width, 0, waveShape(wave, u * pleats) * amplitude);
      arc.push(arc[i - 1]! + point.distanceTo(previous));
      previous = point;
    }
    const total = arc[across]!;
    shortfall = Math.max(shortfall, fabricWidth - total);

    const row: Vector3[] = [];
    for (let i = 0; i <= across; i++) {
      const u = i / across;
      // WHERE ALONG THE CUT this column sits. In the fabric, that is its arc length; in the projection,
      // it is simply `u`. Everything visible about the staircase follows from which one is chosen.
      const along = bias === "fabric" ? (total < 1e-12 ? u : arc[i]! / total) : u;
      const drop = shortDrop + along * (longDrop - shortDrop);

      row.push(
        new Vector3(
          u * width - width / 2,
          -v * drop,
          waveShape(wave, u * pleats) * amplitude + roll * (u - 0.5),
        ),
      );
    }

    grid.push(row);
  }

  // The STEPS: the hem height at each forward-facing crease. A crease shows from the front where the
  // wave is at its maximum, so those are the columns the eye actually reads as tips.
  const hem = grid[grid.length - 1]!;
  const steps: number[] = [];
  for (let k = 0; k < pleats; k++) {
    // The wave peaks a quarter of the way through each pleat.
    const u = (k + 0.25) / pleats;
    const i = Math.min(across, Math.max(0, Math.round(u * across)));
    steps.push(hem[i]!.y);
  }

  return { grid, fullness, amplitudes, steps, shortfall };
}

/**
 * Stitch the open (u, v) grid.
 *
 * The normal comes from the quad's DIAGONALS, `(c − a) × (d − b)`, and not from three of its corners.
 * Where the flare pinches the tiers together three consecutive corners go very nearly collinear, and the
 * three-corner form then divides by a vanishing cross product and returns a zero normal that shades
 * black. The lesson came from `studies/drape/gather`, where it put four black facets exactly at the
 * corner the eye goes to.
 */
function surfaceGeometry(grid: Vector3[][]): BufferGeometry {
  const buffers = createGeometryBuffers();
  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  for (let j = 0; j < grid.length - 1; j++) {
    for (let i = 0; i < grid[j]!.length - 1; i++) {
      const a = grid[j]![i]!;
      const b = grid[j]![i + 1]!;
      const c = grid[j + 1]![i + 1]!;
      const d = grid[j + 1]![i]!;

      const normal = new Vector3().subVectors(c, a).cross(new Vector3().subVectors(d, b));
      if (normal.lengthSq() < 1e-20) continue;
      normal.normalize();

      const face: Vec3 = [normal.x, normal.y, normal.z];
      if (a.distanceToSquared(d) < 1e-14) pushTriangle(buffers, [xyz(a), xyz(b), xyz(c)], face);
      else if (b.distanceToSquared(c) < 1e-14) pushTriangle(buffers, [xyz(a), xyz(b), xyz(d)], face);
      else pushQuad(buffers, [xyz(a), xyz(b), xyz(c), xyz(d)], face);
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
  const handle = createScene(container, { background: 0x11151b, cameraPosition: [0.6, -0.5, 2.8] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.8);
  // Raking, so each crease shadows the flat beside it. A cascade is nothing but creases.
  key.position.set(2.6, 2.2, 3.6);
  const fill = new DirectionalLight(0x8ea8cc, 0.35);
  fill.position.set(-3, 0.4, -2);
  scene.add(key, fill);

  const velvet = new MeshStandardMaterial({
    color: 0x1f5b45,
    roughness: 0.95,
    side: DoubleSide,
    flatShading: true,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    hem: new Color(0xffb454),
    crease: new Color(0x5ce1ff),
    board: new Color(0x8a939f),
  };

  const params = {
    fabricWidth: 2.4,
    topWidth: 0.34,
    bottomWidth: 0.62,
    pleats: 6,
    wave: "knife" as Wave,
    bias: "fabric" as Bias,

    shortDrop: 0.55,
    longDrop: 1.8,
    roll: 0.06,

    across: 240,
    tiers: 40,

    showFabric: true,
    showHem: true,
    showCreases: false,

    steps: "",
    even: "",
    hem: "",
    flare: "",
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

    const cascade = buildCascade({
      fabricWidth: params.fabricWidth,
      topWidth: params.topWidth,
      bottomWidth: params.bottomWidth,
      pleats: params.pleats,
      wave: params.wave,
      bias: params.bias,
      shortDrop: params.shortDrop,
      longDrop: params.longDrop,
      roll: params.roll,
      across: params.across,
      tiers: params.tiers,
    });

    const { grid } = cascade;
    if (params.showFabric) stage.add(new Mesh(surfaceGeometry(grid), velvet));

    const lines: Line[] = [];

    // THE HEM — one straight cut in the cloth, and a staircase once it is folded.
    if (params.showHem) {
      const hem = grid[grid.length - 1]!;
      for (let i = 1; i < hem.length; i++) lines.push({ a: hem[i - 1]!, b: hem[i]!, color: COLOR.hem });
    }

    // THE CREASES — the vertical hinge lines. Each forward-facing one becomes a step.
    if (params.showCreases) {
      for (let k = 0; k < params.pleats; k++) {
        const i = Math.round(((k + 0.25) / params.pleats) * params.across);
        for (let j = 1; j < grid.length; j++) {
          lines.push({ a: grid[j - 1]![i]!, b: grid[j]![i]!, color: COLOR.crease });
        }
      }
    }

    lines.push({
      a: new Vector3(-params.bottomWidth / 2 - 0.12, 0.02, 0),
      b: new Vector3(params.bottomWidth / 2 + 0.12, 0.02, 0),
      color: COLOR.board,
    });

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    // How even the staircase is. A projected cut steps by exactly (long − short) / pleats; a fabric cut
    // does not, because equal spacing along the cloth is not equal spacing across the front.
    const gaps: number[] = [];
    for (let k = 1; k < cascade.steps.length; k++) gaps.push(cascade.steps[k - 1]! - cascade.steps[k]!);
    const ideal = (params.longDrop - params.shortDrop) / params.pleats;
    const spread = gaps.length > 0 ? Math.max(...gaps) - Math.min(...gaps) : 0;

    // The SAME cloth cut the other way, so the two can be compared directly rather than described.
    const rival = buildCascade({
      fabricWidth: params.fabricWidth,
      topWidth: params.topWidth,
      bottomWidth: params.bottomWidth,
      pleats: params.pleats,
      wave: params.wave,
      bias: params.bias === "fabric" ? "projected" : "fabric",
      shortDrop: params.shortDrop,
      longDrop: params.longDrop,
      roll: params.roll,
      across: params.across,
      tiers: params.tiers,
    });
    const mine = grid[grid.length - 1]!;
    const theirs = rival.grid[rival.grid.length - 1]!;
    let hemGap = 0;
    for (let i = 0; i < mine.length; i++) hemGap = Math.max(hemGap, Math.abs(mine[i]!.y - theirs[i]!.y));

    params.steps = `${cascade.steps.length} steps · ${gaps.length > 0 ? gaps.map((g) => g.toFixed(3)).slice(0, 4).join(" ") : "—"}${gaps.length > 4 ? " …" : ""}`;
    params.even =
      spread < 1e-6
        ? `EVEN — ${ideal.toFixed(4)} each, = (long − short) / pleats, under either cut`
        : `uneven by ${spread.toFixed(4)} (${((spread / Math.max(1e-9, ideal)) * 100).toFixed(1)}% of a tread)`;
    params.hem =
      hemGap < 1e-9
        ? `${hemGap.toExponential(2)} — the two cuts agree exactly`
        : `${hemGap.toFixed(5)} between the cuts (${((hemGap / Math.max(1e-9, params.longDrop - params.shortDrop)) * 100).toFixed(2)}% of the bias) — between the creases, not at them`;
    params.flare = `fullness ${cascade.fullness[0]!.toFixed(2)}× at the board → ${cascade.fullness[cascade.fullness.length - 1]!.toFixed(2)}× at the hem · amplitude ${cascade.amplitudes[0]!.toFixed(3)} → ${cascade.amplitudes[cascade.amplitudes.length - 1]!.toFixed(3)}`;
    params.about =
      params.bias === "fabric"
        ? "straight in the CLOTH — how a jabot is actually cut"
        : "straight in the PROJECTION — no cutting table works this way, and the steps are identical anyway";
  };

  rebuild();
  // FRAME ONCE — the rule every study here follows.
  frameObject(handle, stage, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Cascade and Bias Cut");

  const cut = gui.addFolder("The Cut");
  // THE subject. Where the diagonal is straight decides whether the staircase is even.
  cut.add(params, "bias", { "Straight in the fabric": "fabric", "Straight in the projection": "projected" })
    .name("Bias Cut")
    .onChange(rebuild);
  cut.add(params, "shortDrop", 0.1, 2, 0.05).name("Short Drop").onChange(rebuild);
  cut.add(params, "longDrop", 0.2, 3.5, 0.05).name("Long Drop").onChange(rebuild);
  cut.open();

  const fold = gui.addFolder("Accordion");
  // A step IS a fold, so this dial sets both at once.
  fold.add(params, "pleats", 2, 16, 1).name("Pleats").onChange(rebuild);
  fold.add(params, "wave", { "Knife (sharp)": "knife", "Sine (soft)": "sine" }).name("Pleat").onChange(rebuild);
  // The cloth is one fixed piece. Everything else is derived from it.
  fold.add(params, "fabricWidth", 0.6, 5, 0.05).name("Fabric Width").onChange(rebuild);
  fold.open();

  const shape = gui.addFolder("Flare");
  shape.add(params, "topWidth", 0.08, 2, 0.02).name("Width at Board").onChange(rebuild);
  // Widen this and the folds shallow out on their own — the pleating study's law, run backwards.
  shape.add(params, "bottomWidth", 0.08, 2, 0.02).name("Width at Hem").onChange(rebuild);
  // Observation, not derivation: the inner pleats tuck and the leading edge throws forward.
  shape.add(params, "roll", -0.3, 0.3, 0.01).name("Roll").onChange(rebuild);
  shape.open();

  const show = gui.addFolder("Show");
  show.add(params, "showFabric").name("Fabric").onChange(rebuild);
  show.add(params, "showHem").name("Hem").onChange(rebuild);
  show.add(params, "showCreases").name("Creases").onChange(rebuild);
  show.add(params, "across", 60, 480, 20).name("Across (u)").onChange(rebuild);
  show.add(params, "tiers", 8, 120, 4).name("Tiers (v)").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "steps").name("Steps").listen().disable();
  readout.add(params, "even").name("Tread").listen().disable();
  // Where the two cuts ACTUALLY differ — between the creases, not at them.
  readout.add(params, "hem").name("Hem Difference").listen().disable();
  readout.add(params, "flare").name("Flare").listen().disable();
  readout.add(params, "about").name("This Cut").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    velvet.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

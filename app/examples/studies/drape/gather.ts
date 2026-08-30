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
  SphereGeometry,
  Vector3,
} from "three";
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Cinched Swag Surface",
  description:
    "STUDY — a swag as ONE continuous surface, and the modulation that cinches it at the corners. " +
    "The first attempt at this built a stack of separate ribbons, which is wrong and looks wrong: bands " +
    "of cloth floating past each other with nothing joining them, edge loops rather than fabric. A swag " +
    "is a single sheet, and its folds are a RIPPLE ACROSS it rather than a set of pieces. " +
    "Two parameters and three equations. `u` runs across the span, −1 to 1; `v` runs down the fold tiers, " +
    "0 at the board to 1 at the hem. The MACRO SAG is the envelope — each tier hangs with its own sag, " +
    "deeper as it descends, following a catenary or the parabola that approximates it. The MICRO PROFILE " +
    "is the folds: a sinusoid running down `v`, so a vertical cut through the middle of the swag is a " +
    "stack of waves, the S you see edge-on in any velvet valance. " +
    "THE CINCH IS THE THIRD TERM AND IT IS THE WHOLE STUDY. Both the sag and the fold amplitude are " +
    "multiplied by `(1 − u²)`, worth 1 at the centre and exactly 0 at `u = ±1`. So the folds run at full " +
    "depth through the middle and compress smoothly to nothing at the horns, where every tier arrives at " +
    "the same point and the cloth gathers into a knot. Nothing is cut, nothing is stitched, and no fold " +
    "is placed by hand — one factor does all of it. Turn Cinch off and the folds run at full amplitude " +
    "straight into the corners, which reads instantly as corrugated sheet rather than as cloth. That one " +
    "term is the difference between fabric and metal roofing. " +
    "The other two are smaller and both physical. TAPER narrows the upper tiers, because the span a fold " +
    "crosses shortens as it climbs toward the board. BULGE pushes the lower tiers forward along +Z, " +
    "because cloth has mass and the deeper folds hang out over the ones above them — which is what turns " +
    "a flat scallop into the nested crescent a real swag makes. " +
    "It is worth naming which primitive this is, since the whole thread has been sorting that out. The " +
    "fold profile does NOT keep its shape across the span: its amplitude is scaled at every station, so " +
    "this is a LOFT of changing sections and not a sweep of one. It would be exactly a sweep with Cinch " +
    "off and Taper at zero — which is precisely the setting that stops looking like a swag. That is the " +
    "cleanest statement of the difference the sweep and loft studies were circling, arrived at from the " +
    "other direction: the thing that makes it cloth is the thing that makes it a loft. " +
    "Sag Curve switches the tier envelope between the true catenary and the parabola procedural code " +
    "usually reaches for. `studies/drape/swag` measured that difference as a curve; here you can see what " +
    "it costs on a surface, and at the sags a tier actually uses the honest answer is nearly nothing.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  ENVELOPE     the macro sag — the silhouette the tiers hang within. One catenary per tier.
//  MICRO FOLD   the ripple running down the tiers. A sinusoid in `v`, and what makes the S in section.
//  CINCH        the `(1 − u²)` factor taking sag AND fold amplitude to zero at the horns. THE subject.
//  HORN         the top corner where the swag is fixed and the cloth gathers to a knot.
//  TIER         one ring of the fold stack, at constant `v`.
//  TAPER        the narrowing of the upper tiers, because a higher fold crosses a shorter span.
//  BULGE        the forward push of the lower tiers, because cloth has mass and hangs out over what is
//               above it. What makes the nested crescent rather than a flat scallop.
//  ROSETTE      the knot of cloth at the horn. Here it is simply where the cinch takes everything to 0.
//
//  Deliberately NOT here: the cascade tails and the festoon repeat, both in `studies/drape/swag`, and
//  the heading gather along a rod, which is `studies/drape/pleating`.

type SagCurve = "catenary" | "parabola";

//------------------------------
//  The envelope
//------------------------------

/** The catenary parameter `a` for a half-span and sag. No closed form; monotonic, so it bisects. */
function catenaryParameter(halfSpan: number, sag: number): number {
  let low = 1e-9;
  let high = 1e5;

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (mid * (Math.cosh(halfSpan / mid) - 1) > sag) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

/**
 * The tier's hanging shape, NORMALIZED: 1 at the centre, 0 at both horns.
 *
 * Normalizing both curves the same way is what makes the comparison mean anything. They are then two
 * different shapes across the same three points, and the sag dial scales whichever you choose, rather
 * than one of them being systematically deeper than the other and the difference reading as shape.
 *
 * The parabola is the form procedural code reaches for, and that is not laziness — at the sags a swag
 * tier actually uses it is a genuinely good approximation. `studies/drape/swag` has the measurement.
 */
function envelope(kind: SagCurve, u: number): number {
  if (kind === "parabola") return 1 - u * u;

  // Shape only; the caller scales it. `a` is solved once against a unit half-span and unit sag so the
  // profile keeps its character as the sag dial moves, instead of re-solving into a different curve.
  const a = catenaryParameter(1, 1);
  const top = Math.cosh(1 / a);
  return (top - Math.cosh(u / a)) / (top - 1);
}

//------------------------------
//  The surface
//------------------------------

interface SwagOptions {
  span: number;
  sag: number;
  sagPower: number;
  folds: number;
  amplitude: number;
  bulge: number;
  taper: number;
  cinch: boolean;
  curve: SagCurve;
  across: number;
  tiers: number;
}

/**
 * The swag, as one parametric surface over `(u, v)`.
 *
 * ```
 *   x(u,v) = u · (W/2 − taper·(1 − v))
 *   y(u,v) = −sag · v^p · E(u)
 *   z(u,v) = (bulge·v + A·v·sin(2πN·v)) · E(u)
 * ```
 *
 * `E(u)` is the cinch — the envelope, `(1 − u²)` or its catenary equivalent, worth 1 at the centre and 0
 * at both horns. It multiplies BOTH the sag and the fold displacement, and that is the entire trick:
 * every tier converges on the same point at `u = ±1`, and the folds flatten to nothing as they arrive.
 *
 * `v^p` with `p` a little above 1 stops the tiers stacking evenly, which is what keeps a swag from
 * reading as a set of concentric arcs at equal spacing. Cloth does not distribute itself linearly.
 *
 * The fold term carries its own `v` factor, so the ripple grows as it descends: at the board the fabric
 * is held flat against the mounting, and it has only reached full depth by the hem.
 */
function buildSwag(options: SwagOptions): Vector3[][] {
  const { span, sag, sagPower, folds, amplitude, bulge, taper, cinch, curve, across, tiers } = options;

  return Array.from({ length: tiers + 1 }, (_, j) => {
    const v = j / tiers;
    const drop = sag * Math.pow(v, sagPower);
    const ripple = bulge * v + amplitude * v * Math.sin(Math.PI * 2 * folds * v);

    return Array.from({ length: across + 1 }, (_, i) => {
      const u = -1 + (2 * i) / across;
      const e = cinch ? envelope(curve, u) : 1;
      // Taper narrows the UPPER tiers. It is the one term the cinch does not multiply, because it moves
      // the horns themselves rather than what happens between them.
      const halfWidth = span / 2 - taper * (1 - v);
      return new Vector3(u * halfWidth, -drop * e, ripple * e);
    });
  });
}

/** Stitch the open (u, v) grid. Not `loft()` — its sections are closed rings and would wrap the sheet. */
function surfaceGeometry(grid: Vector3[][]): BufferGeometry {
  const buffers = createGeometryBuffers();
  const xyz = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  for (let j = 0; j < grid.length - 1; j++) {
    for (let i = 0; i < grid[j]!.length - 1; i++) {
      const a = grid[j]![i]!;
      const b = grid[j]![i + 1]!;
      const c = grid[j + 1]![i + 1]!;
      const d = grid[j + 1]![i]!;

      // The normal comes from the quad's DIAGONALS, not from three of its corners.
      //
      // Near the horns the cinch squeezes the tiers together until three consecutive corners are very
      // nearly collinear, and `faceNormal(a, b, c)` — which is what `pushQuad` falls back on — then
      // divides by a vanishing cross product and hands back a zero normal that shades black. The quad
      // still has area; it is the sampling of it that was degenerate. `(c − a) × (d − b)` uses both
      // diagonals and survives any three corners lining up, which is exactly the case here.
      const normal = new Vector3().subVectors(c, a).cross(new Vector3().subVectors(d, b));

      // Genuinely no area — the very tip of the horn, where every tier has arrived at one point.
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

/** How much sag and fold still reach the horns. The cinch is doing its job when this is zero. */
function hornSpread(grid: Vector3[][]): number {
  let worst = 0;

  for (const edge of [0, grid[0]!.length - 1]) {
    for (const row of grid) worst = Math.max(worst, Math.abs(row[edge]!.z), Math.abs(row[edge]!.y));
  }

  return worst;
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
  const handle = createScene(container, { background: 0x11151b, cameraPosition: [0.2, -0.4, 3.2] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.8);
  // Raking and to one side, because a fold only reads as depth if it shadows the one beside it.
  key.position.set(2.8, 2.2, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.35);
  fill.position.set(-3, 0.4, -2);
  scene.add(key, fill);

  const velvet = new MeshStandardMaterial({
    color: 0x1f5b45,
    roughness: 0.95,
    side: DoubleSide,
    flatShading: true,
  });
  const pinMaterial = new MeshStandardMaterial({
    color: 0xffb454,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });
  const pinGeometry = new SphereGeometry(1, 14, 10);

  const COLOR = {
    tier: new Color(0xffb454),
    section: new Color(0x5ce1ff),
    board: new Color(0x8a939f),
  };

  const params = {
    span: 2.0,
    sag: 0.85,
    sagPower: 1.2,
    folds: 3.5,
    amplitude: 0.12,
    bulge: 0.1,
    taper: 0.16,
    cinch: true,
    curve: "catenary" as SagCurve,

    across: 90,
    tiers: 110,

    showFabric: true,
    showTiers: false,
    showSection: false,
    showPins: true,

    horn: "",
    section: "",
    primitive: "",
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

    const grid = buildSwag({
      span: params.span,
      sag: params.sag,
      sagPower: params.sagPower,
      folds: params.folds,
      amplitude: params.amplitude,
      bulge: params.bulge,
      taper: params.taper,
      cinch: params.cinch,
      curve: params.curve,
      across: params.across,
      tiers: params.tiers,
    });

    if (params.showFabric) stage.add(new Mesh(surfaceGeometry(grid), velvet));

    const lines: Line[] = [];

    // THE TIERS — constant `v`. Every one of them arrives at the same two points, which IS the cinch.
    if (params.showTiers) {
      const step = Math.max(1, Math.floor(grid.length / 26));
      for (let j = 0; j < grid.length; j += step) {
        const row = grid[j]!;
        for (let i = 1; i < row.length; i++) lines.push({ a: row[i - 1]!, b: row[i]!, color: COLOR.tier });
      }
    }

    // THE CENTRE SECTION — a vertical cut at u = 0. This is the S: the fold stack seen edge-on, and the
    // profile the whole surface is a loft of.
    if (params.showSection) {
      const middle = Math.floor(grid[0]!.length / 2);
      for (let j = 1; j < grid.length; j++) {
        lines.push({ a: grid[j - 1]![middle]!, b: grid[j]![middle]!, color: COLOR.section });
      }
    }

    lines.push({
      a: new Vector3(-params.span / 2 - 0.2, 0.02, 0),
      b: new Vector3(params.span / 2 + 0.2, 0.02, 0),
      color: COLOR.board,
    });

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    if (params.showPins) {
      for (const x of [-1, 1]) {
        const dot = new Mesh(pinGeometry, pinMaterial);
        dot.position.set((x * params.span) / 2, 0, 0);
        dot.scale.setScalar(0.035);
        stage.add(dot);
      }
    }

    const spread = hornSpread(grid);

    // The centre cut, measured: how many times the surface reverses in z going down the stack. That is
    // the S, counted — a fold cycle turns twice, so the count should track 2 × Fold Cycles.
    const middle = Math.floor(grid[0]!.length / 2);
    let reversals = 0;
    let previous = 0;
    for (let j = 1; j < grid.length; j++) {
      const slope = Math.sign(grid[j]![middle]!.z - grid[j - 1]![middle]!.z);
      if (slope !== 0 && previous !== 0 && slope !== previous) reversals++;
      if (slope !== 0) previous = slope;
    }

    params.horn =
      spread < 1e-12
        ? `${spread.toExponential(2)} — every tier arrives at one point`
        : `${spread.toFixed(4)} of sag and fold still running into the corner`;
    params.section = `${reversals} reversals down the centre cut · ${params.folds.toFixed(1)} fold cycles`;
    params.primitive = params.cinch
      ? "a LOFT — the section's amplitude changes across the span"
      : "a SWEEP — the section is carried unchanged, and it stops being a swag";
    params.about = params.cinch
      ? "(1 − u²) takes sag AND folds to zero at the horns"
      : "no cinch: full-depth folds run into the corners, like corrugated sheet";
  };

  rebuild();
  // FRAME ONCE — the rule every study here follows.
  frameObject(handle, stage, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Cinched Swag Surface");

  const cinch = gui.addFolder("The Cinch");
  // THE subject. Off, the folds run at full depth into the corners and it reads as metal, not cloth.
  cinch.add(params, "cinch").name("Cinch (1 − u²)").onChange(rebuild);
  cinch
    .add(params, "curve", { Catenary: "catenary", "Parabola (1 − u²)": "parabola" })
    .name("Sag Curve")
    .onChange(rebuild);
  // Narrows the upper tiers — the one term the cinch does not multiply, since it moves the horns.
  cinch.add(params, "taper", 0, 0.6, 0.01).name("Taper").onChange(rebuild);
  cinch.open();

  const shape = gui.addFolder("Swag");
  shape.add(params, "span", 0.6, 4, 0.05).name("Span").onChange(rebuild);
  shape.add(params, "sag", 0.1, 2, 0.02).name("Sag").onChange(rebuild);
  // Above 1 the tiers bunch toward the hem instead of stacking evenly. Cloth is not linear.
  shape.add(params, "sagPower", 0.6, 2.5, 0.05).name("Sag Power").onChange(rebuild);
  shape.open();

  const fold = gui.addFolder("Folds");
  fold.add(params, "folds", 0, 9, 0.1).name("Fold Cycles").onChange(rebuild);
  fold.add(params, "amplitude", 0, 0.4, 0.005).name("Fold Depth").onChange(rebuild);
  // Cloth has mass, so the lower tiers hang out over the ones above. This is the nested crescent.
  fold.add(params, "bulge", 0, 0.5, 0.01).name("Bulge").onChange(rebuild);
  fold.open();

  const show = gui.addFolder("Show");
  show.add(params, "showFabric").name("Fabric").onChange(rebuild);
  show.add(params, "showTiers").name("Tiers (constant v)").onChange(rebuild);
  // The S. A vertical cut at the centre — the profile the whole surface is a loft of.
  show.add(params, "showSection").name("Centre Section").onChange(rebuild);
  show.add(params, "showPins").name("Pins").onChange(rebuild);
  show.add(params, "across", 20, 200, 5).name("Across (u)").onChange(rebuild);
  show.add(params, "tiers", 20, 300, 10).name("Tiers (v)").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "horn").name("At the Horn").listen().disable();
  readout.add(params, "section").name("Centre Section").listen().disable();
  readout.add(params, "primitive").name("Primitive").listen().disable();
  readout.add(params, "about").name("Reading").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    pinGeometry.dispose();
    pinMaterial.dispose();
    velvet.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

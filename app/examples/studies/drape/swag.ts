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
  title: "Swag and Festoon",
  description:
    "STUDY — the other half of drapery, and a completely different construction from " +
    "`studies/drape/pleating`. A curtain panel is a periodic wave lofted downward; a SWAG is cloth hung " +
    "between two points, and cloth hung between two points is a CATENARY. Not a parabola, not an arc — " +
    "the curve `a·cosh(x/a)`, which is what a uniform chain settles into and what Robert Hooke described " +
    "in 1675 as the shape an arch should be, inverted. " +
    "A swag's folds are a FAMILY of catenaries: same two pins, increasing sag, each hanging a little " +
    "further forward than the last. That single idea produces the nested half-moons in every valance " +
    "photograph, and the surface between consecutive folds is an ordinary loft. Repeat the swag across a " +
    "window and it is a FESTOON; hang the zigzag tails at the ends and those are CASCADES, or JABOTS — " +
    "cloth folded back and forth and cut on a rake, which is why they read as a staircase of tips rather " +
    "than as a curve. " +
    "THE MEASURED QUESTION is whether the catenary is worth it, because a circular arc is easier and every " +
    "eye says they look the same. At shallow sag they genuinely are: pinned at span 1 with sag 0.10 the " +
    "two curves differ by 7.78e-4, which is 0.78% of the sag and invisible at any resolution. It grows " +
    "steadily — 3.63% at sag 0.25, 7.75% at 0.40, 13.25% at 0.60 — so a shallow valance swag can be a " +
    "circular arc and nobody will ever know, while a deep festoon cannot. The catenary carries more of " +
    "its length near the ends and hangs flatter through the middle. " +
    "There is a harder limit underneath that, and it arrives at exactly `sag = halfSpan`. Past it the " +
    "circle through the pins and the low point has its CENTRE below the pins, so the arc is more than a " +
    "semicircle and BULGES OUTSIDE the two points that defined it — max |x| runs 0.50000 at sag 0.5, " +
    "0.50833 at 0.6, and 0.58889 at 0.9 on a half-span of 0.5. A swag whose cloth swings wider than its " +
    "own pins is not a swag. The catenary is monotonic in x and cannot do this at any sag, which is the " +
    "real reason to prefer it rather than the percentages: past a quarter-span the arc is approximate, " +
    "and past a half-span it is not even the right kind of curve. " +
    "That limit is also a trap in the writing of it, and this study fell in. The obvious formula " +
    "`y = centre − √(R² − x²)` silently describes only the lower semicircle, so a deep arc built that way " +
    "does not pass through its own pins — missing them by 0.19 at sag 0.9 — and every deviation figure " +
    "measured against it is inflated by that error rather than by any difference in shape. Sweeping the " +
    "arc by ANGLE instead is correct at every sag, and the deviation here is a nearest-point distance " +
    "because past the half-span limit there is no longer a single y at each x to subtract. " +
    "The catenary parameter itself has no closed form either. Given a span and a sag you must solve " +
    "`a·(cosh(h/a) − 1) = sag` for `a`, which is monotonic and therefore bisects cleanly — the same " +
    "situation as inverting fullness in the pleating study, and the second time in two studies that the " +
    "honest answer to a drapery question was a solve rather than a formula. " +
    "As before: not simulation and not NURBS. The catenary is the exact analytic answer to a physical " +
    "question, and approximating an exact curve with a control net is what " +
    "`studies/nurbs/surface-anatomy` measured the cost of.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  SWAG        a section of cloth hung in a curve between two points. One scallop.
//  FESTOON     swags repeated across a width. Also called a festoon valance.
//  CASCADE     the zigzag tail falling at the end of a swag arrangement. JABOT is the same thing, though
//              a jabot is usually the narrower centre piece and a cascade the outer one.
//  VALANCE     any short soft treatment across the top of a window. A PELMET or CORNICE is the rigid one.
//  BOARD       the mounting board the whole treatment is stapled to. The pins live on it.
//  SAG         how far the swag's lowest point falls below its pins. The one shape dial that matters.
//  RAKE        the diagonal a cascade is cut on, which is what staggers its tips.
//  CATENARY    `a·cosh(x/a)` — the curve a uniform hanging chain takes. Cloth is close enough to uniform.
//  RETURN      the short wrap back to the wall at each end of the board.
//
//  Deliberately NOT here: trim, fringe, tassels and rosettes — all applied decoration, and all of them
//  repeats along a path, which the repeat studies already cover.

type CurveKind = "catenary" | "arc";

//------------------------------
//  The hanging curve
//------------------------------

/**
 * The catenary parameter `a` for a given half-span and sag.
 *
 * `sag = a·(cosh(h/a) − 1)` cannot be inverted for `a` in elementary terms, so it is bisected. Sag falls
 * monotonically as `a` grows — a large `a` is a taut, nearly straight chain, a small one is slack — which
 * is what makes bisection not just workable but exact to machine precision in 200 steps.
 */
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
 * One hanging curve, pinned at `±halfSpan` and dropping `sag` at its centre.
 *
 * Both kinds pass through exactly the same three points — the two pins and the low point — so any
 * difference between them is genuinely about SHAPE and not about fit. A catenary carries more of its
 * length near the ends and runs flatter through the middle; a circular arc distributes it evenly.
 */
function hangingCurve(kind: CurveKind, halfSpan: number, sag: number, samples: number): Vector3[] {
  if (sag < 1e-9) {
    return Array.from({ length: samples + 1 }, (_, i) =>
      new Vector3(-halfSpan + (i / samples) * halfSpan * 2, 0, 0),
    );
  }

  if (kind === "arc") {
    // Radius through the pins and the low point. Not an approximation of the catenary — a different
    // curve through the same three points, which is what makes the comparison fair.
    const radius = (halfSpan * halfSpan + sag * sag) / (2 * sag);
    const centre = radius - sag;

    // Swept by ANGLE, not by x, and that is not a stylistic choice. The obvious form
    // `y = centre − √(R² − x²)` describes only the LOWER SEMICIRCLE, and it is silently wrong the moment
    // `sag > halfSpan`: the centre drops below the pins, the arc becomes more than a semicircle, and it
    // BULGES OUTSIDE its own pins — so it stops being a function of x altogether. Written the x way, a
    // deep arc does not even pass through the points that defined it, missing them by 0.19 at sag 0.9.
    // The catenary never does this, which is a real difference between the two curves and not a
    // numerical detail.
    const bottom = -Math.PI / 2;
    const wrap = (angle: number) => {
      let d = angle - bottom;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d <= -Math.PI) d += Math.PI * 2;
      return d;
    };
    // Both pins measured relative to the bottom of the circle, so the sweep always passes through it.
    const left = wrap(Math.atan2(-centre, -halfSpan));
    const right = wrap(Math.atan2(-centre, halfSpan));

    return Array.from({ length: samples + 1 }, (_, i) => {
      const theta = bottom + left + (i / samples) * (right - left);
      return new Vector3(radius * Math.cos(theta), centre + radius * Math.sin(theta), 0);
    });
  }

  const a = catenaryParameter(halfSpan, sag);
  const lift = a * Math.cosh(halfSpan / a);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = -halfSpan + (i / samples) * halfSpan * 2;
    return new Vector3(x, a * Math.cosh(x / a) - lift, 0);
  });
}

/** Arc length of a sampled curve — for a swag this is the fabric it consumes. */
function curveLength(points: Vector3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += points[i]!.distanceTo(points[i - 1]!);
  return length;
}

/**
 * The largest gap between the two curve kinds at the same span and sag. THE measured question.
 *
 * Measured as a NEAREST-POINT distance rather than a vertical one, because past `sag = halfSpan` the arc
 * is no longer a function of x and there is no "the y at this x" to subtract. Nearest point is defined in
 * every regime, is what the eye actually judges, and agrees with the vertical measure to three figures
 * wherever the vertical measure is meaningful at all.
 */
function deviation(halfSpan: number, sag: number, samples = 1200): number {
  const cat = hangingCurve("catenary", halfSpan, sag, samples);
  const arc = hangingCurve("arc", halfSpan, sag, samples);

  let worst = 0;
  for (const p of cat) {
    let nearest = Infinity;
    for (const q of arc) nearest = Math.min(nearest, p.distanceToSquared(q));
    worst = Math.max(worst, Math.sqrt(nearest));
  }

  return worst;
}

//------------------------------
//  Building
//------------------------------

/** Stitch an OPEN grid — a swag is a sheet with four edges, so `loft()`'s ring wrap would be wrong. */
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

interface SwagOptions {
  halfSpan: number;
  sag: number;
  folds: number;
  foldStep: number;
  depth: number;
  kind: CurveKind;
  samples: number;
}

/**
 * One swag, as a family of hanging curves.
 *
 * Fold 0 is pinned tight to the board and barely sags; each fold below hangs further and stands a little
 * further forward, so the stack reads as nested half-moons with the lowest one frontmost. That ordering
 * is the whole trick — reverse the depth and the swag turns inside out, with the shallow folds hiding
 * the deep ones.
 */
function buildSwag({ halfSpan, sag, folds, foldStep, depth, kind, samples }: SwagOptions): Vector3[][] {
  return Array.from({ length: folds }, (_, k) => {
    const t = folds === 1 ? 1 : k / (folds - 1);
    const foldSag = sag * (1 - foldStep + foldStep * (0.25 + 0.75 * t)) * (0.35 + 0.65 * t);
    const z = depth * t;
    return hangingCurve(kind, halfSpan, foldSag, samples).map((p) => new Vector3(p.x, p.y, z));
  });
}

/**
 * A cascade — the zigzag tail.
 *
 * Cloth folded back and forth and cut on a RAKE, so each successive fold is longer than the last and the
 * hem staggers down and outward. It is not a curve at all, which is exactly why it belongs in this study:
 * a swag and a cascade sit side by side in every window treatment and share no geometry whatsoever.
 */
function buildCascade(
  x: number,
  outward: number,
  pleats: number,
  width: number,
  drop: number,
  rake: number,
  depth: number,
): Vector3[][] {
  const rows: Vector3[][] = [];

  for (let k = 0; k <= pleats; k++) {
    const t = k / pleats;
    // Each fold steps outward and forward, and hangs longer — the rake.
    const px = x + outward * t * width;
    const pz = depth * (k % 2 === 0 ? 0.15 : 1);
    const length = drop * (1 - rake * t);
    rows.push([new Vector3(px, 0, pz), new Vector3(px, -length, pz)]);
  }

  return rows;
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
  const handle = createScene(container, { background: 0x11151b, cameraPosition: [0.4, -0.2, 3.6] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff2e0, 1.7);
  key.position.set(2.5, 3, 4.5);
  const fill = new DirectionalLight(0x8ea8cc, 0.4);
  fill.position.set(-3, 0.5, -2);
  scene.add(key, fill);

  const velvet = new MeshStandardMaterial({
    color: 0x1f5b45,
    roughness: 0.95,
    side: DoubleSide,
    flatShading: true,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    fold: new Color(0xffb454),
    rival: new Color(0x5ce1ff),
    board: new Color(0x8a939f),
  };

  const params = {
    span: 1.6,
    sag: 0.42,
    folds: 7,
    foldStep: 0.75,
    depth: 0.16,
    kind: "catenary" as CurveKind,

    swags: 3,
    overlap: 0.34,

    cascades: true,
    cascadePleats: 6,
    cascadeWidth: 0.34,
    cascadeDrop: 1.5,
    cascadeRake: 0.55,

    samples: 72,
    showFabric: true,
    showFolds: false,
    showRival: false,

    parameter: "",
    deviate: "",
    fabric: "",
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

    const halfSpan = params.span / 2;
    const lines: Line[] = [];
    let fabric = 0;

    // The board the whole treatment hangs from. Its width is an OUTPUT of the festoon, not an input:
    // swags overlap, so the run is `swags` pitches wide plus the one swag that has no neighbor.
    const pitch = params.span * (1 - params.overlap);
    const boardHalf = ((params.swags - 1) * pitch + params.span) / 2;

    for (let s = 0; s < params.swags; s++) {
      const offset = -boardHalf + halfSpan + s * pitch;

      const swag = buildSwag({
        halfSpan,
        sag: params.sag,
        folds: params.folds,
        foldStep: params.foldStep,
        depth: params.depth,
        kind: params.kind,
        samples: params.samples,
      }).map((row) => row.map((p) => new Vector3(p.x + offset, p.y, p.z)));

      if (params.showFabric) stage.add(new Mesh(sheetGeometry(swag), velvet));

      if (params.showFolds) {
        for (const row of swag) {
          for (let i = 1; i < row.length; i++) lines.push({ a: row[i - 1]!, b: row[i]!, color: COLOR.fold });
        }
      }

      // The other curve through the same three points, for direct comparison.
      if (params.showRival) {
        const rival = hangingCurve(
          params.kind === "catenary" ? "arc" : "catenary",
          halfSpan,
          params.sag,
          params.samples,
        );
        for (let i = 1; i < rival.length; i++) {
          lines.push({
            a: new Vector3(rival[i - 1]!.x + offset, rival[i - 1]!.y, params.depth),
            b: new Vector3(rival[i]!.x + offset, rival[i]!.y, params.depth),
            color: COLOR.rival,
          });
        }
      }

      if (s === 0) fabric = curveLength(swag[swag.length - 1]!);
    }

    if (params.cascades) {
      for (const side of [-1, 1]) {
        const cascade = buildCascade(
          side * boardHalf,
          side,
          params.cascadePleats,
          params.cascadeWidth,
          params.cascadeDrop,
          params.cascadeRake,
          params.depth * 1.6,
        );
        if (params.showFabric) stage.add(new Mesh(sheetGeometry(cascade), velvet));
      }
    }

    lines.push({
      a: new Vector3(-boardHalf - params.cascadeWidth, 0.02, 0),
      b: new Vector3(boardHalf + params.cascadeWidth, 0.02, 0),
      color: COLOR.board,
    });

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    const a = catenaryParameter(halfSpan, params.sag);
    const gap = deviation(halfSpan, params.sag);
    const ratio = params.sag / params.span;

    // How far the chosen curve swings beyond its own pins. Zero for a catenary at any sag; nonzero for a
    // circular arc the moment the sag passes the half-span.
    const reach = Math.max(...hangingCurve(params.kind, halfSpan, params.sag, 400).map((p) => Math.abs(p.x)));
    const bulge = Math.max(0, reach - halfSpan);

    params.parameter =
      `a = ${a.toFixed(4)} · sag/span ${ratio.toFixed(3)} · ` +
      (bulge > 1e-6 ? `BULGES ${bulge.toFixed(4)} past its pins` : "inside its pins");
    params.deviate =
      `${gap.toExponential(3)} = ${((gap / params.sag) * 100).toFixed(2)}% of sag — ` +
      (gap / params.sag < 0.02
        ? "an arc would do"
        : gap / params.sag < 0.08
          ? "starting to show"
          : "genuinely different shapes") +
      (params.sag > halfSpan ? " · past the half-span limit" : "");
    params.fabric = `deepest fold ${fabric.toFixed(4)} across a ${params.span.toFixed(2)} span (${(fabric / params.span).toFixed(3)}×)`;
    params.about =
      params.kind === "catenary"
        ? "a·cosh(x/a) — what a hanging chain actually does"
        : "a circular arc through the same three points — easier, and wrong past a point";
  };

  rebuild();
  // FRAME ONCE — the rule every study here follows.
  frameObject(handle, stage, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Swag and Festoon");

  const shape = gui.addFolder("Swag");
  // The one shape dial that matters, and the one the catenary-vs-arc question turns on.
  shape.add(params, "sag", 0.02, 1.2, 0.01).name("Sag").onChange(rebuild);
  shape.add(params, "span", 0.4, 4, 0.05).name("Span").onChange(rebuild);
  shape.add(params, "kind", { Catenary: "catenary", "Circular Arc": "arc" }).name("Curve").onChange(rebuild);
  shape.add(params, "folds", 2, 16, 1).name("Folds").onChange(rebuild);
  shape.add(params, "foldStep", 0, 1, 0.05).name("Fold Spread").onChange(rebuild);
  shape.add(params, "depth", 0, 0.6, 0.01).name("Fold Depth").onChange(rebuild);
  shape.open();

  const run = gui.addFolder("Festoon");
  run.add(params, "swags", 1, 8, 1).name("Swags").onChange(rebuild);
  // Swags overlap; the board width is what falls out of the pitch, never an input.
  run.add(params, "overlap", 0, 0.7, 0.01).name("Overlap").onChange(rebuild);
  run.open();

  const tails = gui.addFolder("Cascade");
  tails.add(params, "cascades").name("Cascades").onChange(rebuild);
  tails.add(params, "cascadePleats", 2, 14, 1).name("Pleats").onChange(rebuild);
  tails.add(params, "cascadeWidth", 0.1, 1, 0.02).name("Width").onChange(rebuild);
  tails.add(params, "cascadeDrop", 0.3, 3, 0.05).name("Drop").onChange(rebuild);
  // The diagonal the tail is cut on. Zero gives a square tail, which reads as a curtain, not a cascade.
  tails.add(params, "cascadeRake", 0, 0.9, 0.02).name("Rake").onChange(rebuild);

  const show = gui.addFolder("Show");
  show.add(params, "showFabric").name("Fabric").onChange(rebuild);
  show.add(params, "showFolds").name("Fold Curves").onChange(rebuild);
  // Draws the OTHER curve through the same three points, so the difference is visible and not just a number.
  show.add(params, "showRival").name("Compare Curves").onChange(rebuild);
  show.add(params, "samples", 12, 200, 4).name("Samples").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "parameter").name("Catenary").listen().disable();
  readout.add(params, "deviate").name("Deviation").listen().disable();
  readout.add(params, "fabric").name("Fabric").listen().disable();
  readout.add(params, "about").name("This Curve").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    velvet.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

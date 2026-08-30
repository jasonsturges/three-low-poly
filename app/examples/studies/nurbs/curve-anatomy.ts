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
  Vector4,
} from "three";
import { NURBSCurve } from "three/examples/jsm/curves/NURBSCurve.js";
import { circleProfile, curvePath, sweep, transportFrames } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "NURBS Curve Anatomy",
  description:
    "STUDY — NURBS, taken apart. Nothing in this library implements NURBS and nothing here proposes that " +
    "it should; this is `three/examples/jsm/curves/NURBSCurve` on the bench, because sweeping and lofting " +
    "are taught almost entirely through NURBS software and it is worth knowing exactly what that " +
    "representation is buying. " +
    "The first thing to be clear about: a sweep and a loft are OPERATIONS, NURBS is a REPRESENTATION, and " +
    "the two are orthogonal. You can sweep a polyline along a polyline, which is what this library does, " +
    "or sweep a NURBS curve along a NURBS curve, which is what Rhino does. The construction problems are " +
    "identical — and they surface in that software as user-facing controls. Rhino's sweep offers FREEFORM " +
    "against ROADLIKE, which is precisely parallel transport against a fixed world reference from " +
    "`studies/sweep/anatomy`. Rhino's loft twists when section seams disagree and draws draggable seam " +
    "arrows to fix it, which is precisely Seam Offset from `studies/loft/anatomy`. " +
    "The name unpacks backwards. B-SPLINE: the curve is a blend of CONTROL POINTS, which it does not pass " +
    "through — turn on the control polygon and watch the curve hold well inside it, touching only at the " +
    "clamped ends. Each point on the curve is influenced by exactly `degree + 1` control points, so " +
    "control is LOCAL: at degree 1 the curve IS the polygon, and raising the degree pulls it smoother and " +
    "slacker. NON-UNIFORM: the knot vector's spacing is arbitrary, and repeating a knot is what buys a " +
    "corner — at multiplicity `m` the curve is C^(degree−m) there, so multiplicity equal to the degree " +
    "gives a genuine kink in an otherwise smooth curve. A low-poly library gets corners by simply " +
    "authoring a corner, which is the whole reason it can skip this. " +
    "RATIONAL is the one that earns its keep, and the Circle preset is the proof. Nine control points on " +
    "a SQUARE, degree 2, weights alternating 1 and cos 45° — and the result is a circle to 2.22e-16, " +
    "which is machine epsilon. Set every weight to 1 instead, changing nothing else, and the same control " +
    "points give a curve 6.07e-2 off. A Catmull-Rom through eight points that genuinely LIE on the circle " +
    "still wanders 8.47e-3 between them. No polynomial curve can ever be exactly a circle; a rational one " +
    "can, and that single fact is why CAD is built on NURBS and why a manufactured fillet is not an " +
    "approximation. Drive the Weight dial on the Conic preset to see the mechanism bare: one slider walks " +
    "a rational quadratic through the entire family of conic sections — ellipse below 1, parabola exactly " +
    "at 1, hyperbola above — with the circular arc sitting at cos 45°. " +
    "Sweep It confirms the compatibility claim rather than asserting it. `curvePath` asks a curve only for " +
    "its position and tangent, `NURBSCurve` extends Three's `Curve` and overrides `getTangent`, so it " +
    "hands over an ANALYTIC tangent and feeds `transportFrames` and `sweep` today with no changes " +
    "anywhere. The path layer is already NURBS-compatible as an INPUT. What the library does not do, and " +
    "should not, is represent its SURFACES that way: faceting is the aesthetic, `segments` is a feature, " +
    "and a NURBS surface would be tessellated to triangles at the end regardless.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CONTROL POINT   a point the curve is pulled toward but does not generally pass through. Only the
//                  clamped first and last are actually touched.
//  CONTROL POLYGON the control points joined in order. The curve's convex hull, and its silhouette at
//                  degree 1.
//  DEGREE          how many control points blend at once — `degree + 1` of them. Higher is smoother and
//                  less local; degree 1 is the polygon itself.
//  KNOT VECTOR     the parameter values where one polynomial span hands over to the next. Length is
//                  always `points + degree + 1`.
//  CLAMPED         end knots repeated `degree + 1` times, which forces the curve to touch its first and
//                  last control points. Every curve here is clamped.
//  MULTIPLICITY    a knot repeated. At `m` the curve is C^(degree−m) there; at `m = degree`, a KINK.
//  WEIGHT          how hard a control point pulls. All weights equal is a plain polynomial B-spline; it
//                  is unequal weights that make a curve RATIONAL, and only a rational curve can be a
//                  conic exactly.
//  SPAN            the stretch of curve between two distinct knots — one polynomial piece.
//
//  Deliberately NOT here: NURBS SURFACES, trimming, and knot insertion/refinement. The surface question
//  is real and separate — it is what CAD's loft actually produces, and it is where fairing and G2
//  continuity live.

type Preset = "circle" | "conic" | "freeform";

/** A control point and how hard it pulls. Three takes these as `Vector4`, with the weight in `w`. */
interface ControlPoint {
  position: Vector3;
  weight: number;
}

/**
 * A clamped knot vector, with an optional repeated interior knot.
 *
 * Length is always `points + degree + 1` — that is not a convention but an identity, and getting it wrong
 * is the single most common way to fail to construct a NURBS curve. The ends are repeated `degree + 1`
 * times, which is what CLAMPS the curve to its first and last control points; leave that off and the
 * curve starts somewhere in the middle of its own control polygon.
 *
 * `multiplicity` repeats one interior knot. The distinct interior values are spaced evenly and the
 * middle one is repeated, with the others thinned so the total length still comes out right.
 */
function clampedKnots(points: number, degree: number, multiplicity = 1): number[] {
  const interior = points - degree - 1;
  const ends = Array.from({ length: degree + 1 }, () => 0);

  if (interior <= 0) return [...ends, ...ends.map(() => 1)];

  const m = Math.max(1, Math.min(multiplicity, interior, degree));
  const distinct = interior - m + 1;
  const values = Array.from({ length: distinct }, (_, i) => (i + 1) / (distinct + 1));
  const middle = Math.floor((distinct - 1) / 2);

  const inner: number[] = [];
  values.forEach((value, i) => {
    for (let k = 0; k < (i === middle ? m : 1); k++) inner.push(value);
  });

  return [...ends, ...inner, ...ends.map(() => 1)];
}

/**
 * Three presets, each isolating one letter of the acronym.
 *
 * `circle`    RATIONAL. Nine control points on a SQUARE and a degree of 2 — the curve is a circle only
 *             because of the weights, which is the cleanest demonstration available that rationality is
 *             not a detail. The corner points sit at radius √2 and pull with weight cos 45°.
 * `conic`     RATIONAL again, reduced to its smallest form: one rational quadratic with three control
 *             points, where the middle weight alone selects which conic section you get.
 * `freeform`  B-SPLINE and NON-UNIFORM. Eight control points for the degree and knot dials to work on,
 *             with a weight on the middle point so its pull can be seen against neighbors that have none.
 */
function buildCurve(
  preset: Preset,
  degree: number,
  weight: number,
  multiplicity: number,
): { points: ControlPoint[]; knots: number[]; degree: number; label: string } {
  const s = Math.SQRT1_2; // cos 45° — the weight a 90° rational arc requires.

  if (preset === "circle") {
    // Axis points at radius 1 with weight 1; corner points at radius √2 with weight cos 45°. The `weight`
    // dial scales only the corners, so moving it off cos 45° is exactly what breaks the circle.
    const corner = weight;
    const points: ControlPoint[] = [
      { position: new Vector3(1, 0, 0), weight: 1 },
      { position: new Vector3(1, 1, 0), weight: corner },
      { position: new Vector3(0, 1, 0), weight: 1 },
      { position: new Vector3(-1, 1, 0), weight: corner },
      { position: new Vector3(-1, 0, 0), weight: 1 },
      { position: new Vector3(-1, -1, 0), weight: corner },
      { position: new Vector3(0, -1, 0), weight: 1 },
      { position: new Vector3(1, -1, 0), weight: corner },
      { position: new Vector3(1, 0, 0), weight: 1 },
    ];
    return {
      points,
      knots: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1],
      degree: 2,
      label: `9 points on a SQUARE — a circle only because of the weights (exact at ${s.toFixed(4)})`,
    };
  }

  if (preset === "conic") {
    return {
      points: [
        { position: new Vector3(1.2, 0, 0), weight: 1 },
        { position: new Vector3(1.2, 1.2, 0), weight },
        { position: new Vector3(0, 1.2, 0), weight: 1 },
      ],
      knots: [0, 0, 0, 1, 1, 1],
      degree: 2,
      label: "one rational quadratic — the middle weight alone picks the conic section",
    };
  }

  // An open curve with enough points for degree and knots to have somewhere to work.
  const positions = [
    new Vector3(-2.2, -0.4, 0),
    new Vector3(-1.6, 1.2, 0.5),
    new Vector3(-0.8, -1.0, -0.5),
    new Vector3(0, 1.4, 0.6),
    new Vector3(0.8, -1.0, -0.6),
    new Vector3(1.6, 1.2, 0.4),
    new Vector3(2.2, -0.4, 0),
    new Vector3(2.6, 0.8, 0),
  ];
  const middle = Math.floor(positions.length / 2);
  const capped = Math.min(degree, positions.length - 1);

  return {
    points: positions.map((position, i) => ({ position, weight: i === middle ? weight : 1 })),
    knots: clampedKnots(positions.length, capped, multiplicity),
    degree: capped,
    label: "degree, knots and one weighted point — the curve holds INSIDE its own polygon",
  };
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
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [0, 0.6, 5.2] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(3, 4.5, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.5);
  fill.position.set(-3, 1, -3);
  scene.add(key, fill);

  const lineMaterial = new LineBasicMaterial({ vertexColors: true });
  const tubeMaterial = new MeshStandardMaterial({
    color: 0x9aa4b2,
    metalness: 0.5,
    roughness: 0.45,
    flatShading: true,
    side: DoubleSide,
  });
  // Small, smooth and semi-transparent. These are ANNOTATIONS, not handles — nothing here is
  // selectable, so a big bold marker would only claim an interactivity the study does not have, and
  // would hide the curve it is meant to explain. Faceting them would read as low-poly geometry under
  // test rather than as diagram furniture, so they alone are smooth-shaded.
  const knotMaterial = new MeshStandardMaterial({
    color: 0xffb454,
    roughness: 0.5,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const pointGeometry = new SphereGeometry(1, 16, 12);

  const COLOR = {
    polygon: new Color(0x59657a),
    curve: new Color(0x5ce1ff),
    reference: new Color(0x4a5568),
  };

  const params = {
    preset: "circle" as Preset,
    degree: 3,
    weight: Math.SQRT1_2,
    multiplicity: 1,
    samples: 200,

    showPolygon: true,
    showPoints: true,
    showCurve: true,
    showReference: true,
    sweepIt: false,

    knots: "",
    exactness: "",
    continuity: "",
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

    const { points, knots, degree, label } = buildCurve(
      params.preset,
      params.degree,
      params.weight,
      params.multiplicity,
    );

    const curve = new NURBSCurve(
      degree,
      knots,
      points.map((p) => new Vector4(p.position.x, p.position.y, p.position.z, p.weight)),
    );

    const lines: Line[] = [];

    // THE CONTROL POLYGON. The curve is a blend of these and does not pass through them — only the
    // clamped ends are touched. At degree 1 the curve and this polygon are the same thing.
    if (params.showPolygon) {
      for (let i = 1; i < points.length; i++) {
        lines.push({ a: points[i - 1]!.position, b: points[i]!.position, color: COLOR.polygon });
      }
    }

    // THE CURVE, sampled uniformly in its parameter.
    const sampled = Array.from({ length: params.samples + 1 }, (_, i) =>
      curve.getPoint(i / params.samples, new Vector3()),
    );
    if (params.showCurve) {
      for (let i = 1; i < sampled.length; i++) {
        lines.push({ a: sampled[i - 1]!, b: sampled[i]!, color: COLOR.curve });
      }
    }

    // A true circle to measure against, drawn only where a circle is what the curve claims to be.
    if (params.showReference && params.preset !== "freeform") {
      const radius = params.preset === "circle" ? 1 : 1.2;
      const steps = 256;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const b = ((i + 1) / steps) * Math.PI * 2;
        lines.push({
          a: new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0),
          b: new Vector3(Math.cos(b) * radius, Math.sin(b) * radius, 0),
          color: COLOR.reference,
        });
      }
    }

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    // CONTROL POINTS, sized by WEIGHT — so "how hard this point pulls" is a property you can see rather
    // than a number in a panel. An unweighted point and a heavy one are the same dot otherwise.
    if (params.showPoints) {
      for (const { position, weight } of points) {
        const dot = new Mesh(pointGeometry, knotMaterial);
        dot.position.copy(position);
        dot.scale.setScalar(0.016 + 0.020 * Math.min(2, Math.max(0, weight)));
        stage.add(dot);
      }
    }

    // The compatibility claim, run rather than asserted: `curvePath` asks only for position and tangent,
    // and `NURBSCurve` answers for both — it overrides `getTangent`, so the tangent is ANALYTIC and not
    // estimated from chords, which is exactly what `PathPoint` exists to carry.
    if (params.sweepIt) {
      const geometry = sweep(circleProfile(0.06, 8), transportFrames(curvePath(curve, params.samples)));
      stage.add(new Mesh(geometry, tubeMaterial));
    }

    // Distinct knots and their multiplicities, which is the readable form of the vector.
    const tally = new Map<string, number>();
    for (const k of knots) {
      const key = k.toFixed(4);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    params.knots = [...tally.entries()].map(([k, n]) => (n > 1 ? `${k}×${n}` : k)).join("  ");

    if (params.preset === "freeform") {
      const m = Math.max(1, Math.min(params.multiplicity, degree));
      const order = degree - m;
      params.exactness = `${tally.size - 1} spans · ${points.length} points · degree ${degree}`;
      params.continuity =
        order <= 0
          ? `C0 at the repeated knot — a KINK in a smooth curve`
          : `C${order} at the repeated knot (degree ${degree} − multiplicity ${m})`;
    } else {
      const radius = params.preset === "circle" ? 1 : 1.2;
      // Measured against the true circle, not against a finer sampling of itself.
      let worst = 0;
      for (const p of sampled) worst = Math.max(worst, Math.abs(Math.hypot(p.x, p.y) - radius));
      params.exactness =
        worst < 1e-12
          ? `${worst.toExponential(3)} — EXACT to machine epsilon`
          : `${worst.toExponential(3)} off a true circle`;

      const w = params.weight;
      params.continuity =
        params.preset === "conic"
          ? Math.abs(w - Math.SQRT1_2) < 5e-4
            ? "circular arc — the ellipse that closes"
            : w < 1
              ? `ellipse (w = ${w.toFixed(3)} < 1)`
              : Math.abs(w - 1) < 5e-4
                ? "parabola — exactly w = 1"
                : `hyperbola (w = ${w.toFixed(3)} > 1)`
          : Math.abs(w - Math.SQRT1_2) < 5e-4
            ? "weights at cos 45° — rational, and a true circle"
            : `weights at ${w.toFixed(3)} — no longer a circle`;
    }

    params.about = label;
  };

  rebuild();
  // FRAME ONCE — the same rule as the sweep and loft studies.
  frameObject(handle, stage, { fit: 1.5 });

  const gui = new GUI();
  gui.title("NURBS Curve Anatomy");

  const form = gui.addFolder("Curve");
  form
    .add(params, "preset", {
      "Circle (rational)": "circle",
      "Conic (one weight)": "conic",
      "Freeform (degree + knots)": "freeform",
    })
    .name("Preset")
    .onChange(rebuild);
  // On Circle this scales the CORNER weights, and cos 45° is the only value that gives a true circle.
  // On Conic it is the single middle weight, and it walks the whole family of conic sections.
  form.add(params, "weight", 0.1, 2, 0.001).name("Weight").onChange(rebuild);
  form.add(params, "degree", 1, 5, 1).name("Degree (freeform)").onChange(rebuild);
  // Repeating a knot is how a smooth curve gets a corner. At multiplicity = degree it is C0.
  form.add(params, "multiplicity", 1, 5, 1).name("Knot Multiplicity").onChange(rebuild);
  form.open();

  const show = gui.addFolder("Show");
  show.add(params, "showPolygon").name("Control Polygon").onChange(rebuild);
  show.add(params, "showPoints").name("Control Points").onChange(rebuild);
  show.add(params, "showCurve").name("Curve").onChange(rebuild);
  show.add(params, "showReference").name("True Circle").onChange(rebuild);
  // Proof, not assertion: straight into `transportFrames` and `sweep` with nothing adapted.
  show.add(params, "sweepIt").name("Sweep It").onChange(rebuild);
  show.add(params, "samples", 16, 512, 8).name("Samples").onChange(rebuild);
  show.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "knots").name("Knots").listen().disable();
  readout.add(params, "exactness").name("Exactness").listen().disable();
  readout.add(params, "continuity").name("Reading").listen().disable();
  readout.add(params, "about").name("This Preset").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    pointGeometry.dispose();
    knotMaterial.dispose();
    tubeMaterial.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

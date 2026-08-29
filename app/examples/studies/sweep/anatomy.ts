import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import {
  arcPath,
  circleProfile,
  curvePath,
  joinPaths,
  linePath,
  rectProfile,
  sweep,
  transformPath,
  transportFrames,
  type PathPoint,
  type Station,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Anatomy of a Sweep",
  description:
    "STUDY — what a sweep actually IS, taken apart into the five things it does: a PATH, a FRAME at every " +
    "station, the profile PLACED in each frame as a ring, the rings STITCHED into quads, and the ends " +
    "CAPPED. Every stage draws on its own, and each is derived from the same stations the mesh is built " +
    "from, so the diagram cannot disagree with the geometry. " +
    "The profile and the path are the easy halves and they are genuinely independent — that is " +
    "`studies/sweep/path-and-profile`. The half that does the work is the FRAME. A section is 2D; it has " +
    "to be told which way is up at every step, and every way a sweep goes wrong is that answer going " +
    "wrong. Set the Profile to Angle (deliberately asymmetric, and deliberately off-center so you can see " +
    "that the path runs through the profile's ORIGIN, not its centroid) and twist becomes unmissable. On a " +
    "round tube it is invisible, which is exactly why it ships. " +
    "Four constructions answer the question, and the readout measures them the same way: INTRINSIC TWIST, " +
    "the rotation of the section about its own tangent BEYOND what the path forces, summed step by step. " +
    "Parallel transport scores 0 by construction. Read it next to OFFSET, which is the largest angle " +
    "between a construction's frame and transport's: the pair separates a section that is merely ROTATED " +
    "from one that is TWISTING, and without that second number every difference looks like a defect. " +
    "TRUE FRENET — the normal taken from the path's CURVATURE — is what everybody believes " +
    "`TubeGeometry` uses. On the plain arc it is perfectly sound: 0.00° of twist, sitting a constant 90° " +
    "off transport because it points at the center of curvature rather than out of the plane. Give it " +
    "anything harder and it breaks. 180° across an archway's straight legs, where zero curvature leaves " +
    "the normal undefined and some arbitrary axis has to answer. 180° across the reverse curve's " +
    "inflection — arriving as TWO 90° steps rather than one snap, because a central difference straddles " +
    "the inflection and smears the flip over the two stations either side of it. And 539° on the " +
    "Catmull-Rom curve, with a 180° step in it, where the failures stop being incidents and simply " +
    "accumulate. FIXED REFERENCE projects one constant world axis and is EXACT on any planar path — 0.00° " +
    "on the arc, the archway and the reverse curve, matching transport to the digit, which is why it " +
    "survives in so much working code. It has no memory, so it re-derives the section from the world at " +
    "every step instead of carrying it, and the moment the path leaves its plane the world stops " +
    "agreeing: 570° on the helix, worse than Frenet manages anywhere. " +
    "The fourth is the finding. Three's `computeFrenetFrames` IS NOT FRENET. Its own source cites TR425, " +
    "the parallel transport tech report, and the algorithm carries the previous normal forward by the " +
    "minimum rotation — the same thing `transportFrames` does. Measured here: identical intrinsic twist " +
    "(0.0000°) on every path, and identical frames POINTWISE (0.0000°) on all but the helix, where they " +
    "differ by a constant 90° because they SEED differently — three picks its first normal from the " +
    "minimum tangent component, this library takes a caller-supplied axis. A constant offset is not twist. " +
    "Turn the Seed Axis and watch the whole section rotate without the twist reading moving off zero. " +
    "So the argument for parallel transport is right and the usual attribution is wrong, which leaves a " +
    "better question: what DOES this library's frames buy over three's? Four things, and none of them is " +
    "the algorithm — a caller-controlled seed, duplicate-point rejection (`joinPaths` produces exactly " +
    "those at every joint, and a zero-length step has no direction), a per-station `scale` three cannot " +
    "vary at all, and an honest seam on a closed loop where three smears the residual twist evenly around " +
    "the ring to hide it.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PROFILE     the cross-section, a closed 2D loop wound counter-clockwise. It lives in the station's own
//              (normal, binormal) plane and knows nothing about where it is going.
//  PATH        positions AND tangents. A list of positions is not a path: the tangent has to be carried,
//              because estimating it from the chord between neighbors is wrong at the ENDS, where it tilts
//              the cap by half a segment angle. See `PathPoint`.
//  STATION     one place along the path with a full frame: position, tangent, normal, binormal, and
//              optionally a scale. This is the unit a sweep actually consumes.
//  FRAME       the (normal, binormal) pair — the section's local axes. The subject of this study.
//  RING        the profile evaluated in one station's frame. A ring of 3D points.
//  RAIL        the line joining vertex j of one ring to vertex j of the next. Rings and rails together
//              ARE the quad grid; the stitch adds nothing the frames had not already decided.
//  TWIST       rotation of the section about its OWN tangent. Measured INTRINSICALLY here — see `twist`.
//  HOLONOMY    the twist a closed loop comes home with. A property of the loop, not of the algorithm.
//
//  Deliberately NOT here: caps beyond showing that they exist, miters, and end cuts. A cap is what a
//  sweep does at the END of a path and it has its own studies (`studies/miter/*`). This one is about the
//  middle.

type Construction = "transport" | "three" | "frenet" | "fixed";
type PathName = "arc" | "archway" | "reverse" | "helix" | "curve";
type ProfileName = "angle" | "bar" | "tube";

const DEG = 180 / Math.PI;
const clamp = (x: number) => Math.min(1, Math.max(-1, x));

//------------------------------
//  Paths
//------------------------------

/**
 * Five paths, chosen so that each construction is right somewhere and wrong somewhere. A comparison
 * where one method simply wins everywhere teaches nothing about why the others exist.
 *
 * `arc`      planar, constant curvature. Everything agrees. The control.
 * `archway`  line, arc, line — composed, so it carries duplicate points at the joints AND straight legs
 *            where curvature is zero and a Frenet normal is undefined.
 * `reverse`  two arcs of OPPOSITE curvature. An exact inflection, which is where Frenet flips 180°.
 * `helix`    genuinely leaves its plane. Fixed reference spins here; the planar paths hide that.
 * `curve`    an arbitrary Catmull-Rom, turning in every direction at once. The closest to real use, and
 *            the one where true Frenet's failures stop being isolated incidents and just accumulate.
 */
function buildPath(name: PathName, segments: number): { path: PathPoint[]; label: string } {
  switch (name) {
    case "arc":
      return {
        path: arcPath({ radius: 1.2, startAngle: 0, endAngle: Math.PI, segments }),
        label: "planar, constant curvature — every construction agrees",
      };

    case "archway": {
      const r = 1.1;
      const leg = 0.9;
      return {
        path: joinPaths(
          linePath(new Vector3(-r, 0, 0), new Vector3(-r, leg, 0), Math.max(2, segments >> 2)),
          transformPath(
            arcPath({ radius: r, startAngle: Math.PI, endAngle: 0, segments }),
            new Matrix4().makeTranslation(0, leg, 0),
          ),
          linePath(new Vector3(r, leg, 0), new Vector3(r, 0, 0), Math.max(2, segments >> 2)),
        ),
        label: "straight legs — zero curvature, so a Frenet normal has nothing to come from",
      };
    }

    // Two arcs of OPPOSITE curvature meeting tangentially. That tangency is the whole point and it is
    // easy to get wrong: translate the second arc into place and the tangents no longer agree, so the
    // sweep bridges the gap with a straight run and the inflection you meant to study is not there.
    //
    // Place it by its CENTER instead, and the placement is forced rather than guessed. The first arc
    // arrives at (0, 1) heading +X with its center at the origin — to the RIGHT of travel, so it is
    // turning right. Reversing the curvature means putting the next center the same distance to the
    // LEFT, at (0, 2). Both arcs then pass through (0, 1) with tangent +X, and the only thing that
    // changes across the joint is which way the path is turning.
    //
    // The junction is a duplicate point, exactly as `joinPaths` produces at every seam. A zero-length
    // step has no direction, so `transportFrames` drops it — see the filter at the top of `Sweep.ts`.
    case "reverse":
      return {
        path: joinPaths(
          arcPath({ radius: 1, startAngle: Math.PI, endAngle: Math.PI / 2, segments }),
          arcPath({
            radius: 1,
            startAngle: -Math.PI / 2,
            endAngle: 0,
            center: new Vector3(0, 2, 0),
            segments,
          }),
        ),
        label: "an INFLECTION — tangent continuous, curvature reversed, and Frenet snaps 180°",
      };

    // Written out rather than taken from `helixPath` so its segment count tracks the one dial, and so the
    // analytic tangent is visible next to the position it belongs to.
    case "helix": {
      const radius = 0.9;
      const height = 2.4;
      const turns = 2;
      const total = turns * Math.PI * 2;
      const count = segments * 4;
      return {
        path: Array.from({ length: count + 1 }, (_, i) => {
          const t = i / count;
          const theta = total * t;
          return {
            position: new Vector3(radius * Math.cos(theta), height * t - height / 2, radius * Math.sin(theta)),
            tangent: new Vector3(-radius * Math.sin(theta) * total, height, radius * Math.cos(theta) * total),
          };
        }),
        label: "leaves its plane — the case a fixed world reference cannot survive",
      };
    }

    // Any Three curve will do. It ANSWERS for its own tangent through `getTangentAt`, so `curvePath` never
    // has to estimate one from the chords — which is the whole reason `PathPoint` carries a tangent.
    case "curve":
      return {
        path: curvePath(
          new CatmullRomCurve3(
            [
              new Vector3(-1.6, -0.6, 0.4),
              new Vector3(-0.5, 0.8, -0.5),
              new Vector3(0.6, -0.5, 0.5),
              new Vector3(1.6, 0.7, -0.3),
            ],
            false,
            "centripetal",
          ),
          segments * 4,
        ),
        label: "turning in every direction at once — the closest of these to real use",
      };
  }
}

//------------------------------
//  Profiles
//------------------------------

/**
 * An ANGLE section — asymmetric on purpose, and anchored at its corner rather than centered.
 *
 * Both properties are the teaching. Asymmetry makes twist visible: a circular section is invariant under
 * rotation about its own axis, so a tube can be twisting badly and look perfect, which is precisely why
 * the bug ships. And the off-center anchor shows where the path actually runs — through the profile's
 * ORIGIN, not its centroid. Move the profile off the origin and the whole sweep swings wide.
 *
 * Wound counter-clockwise, which `sweep` requires for its caps to face outward.
 */
function angleProfile(size: number): [number, number][] {
  const w = size;
  const t = size * 0.32;
  return [
    [0, 0],
    [w, 0],
    [w, t],
    [t, t],
    [t, w],
    [0, w],
  ];
}

function buildProfile(name: ProfileName, size: number, sides: number): [number, number][] {
  if (name === "angle") return angleProfile(size);
  if (name === "bar") return rectProfile(size * 1.4, size * 0.5) as [number, number][];
  return circleProfile(size * 0.6, sides) as [number, number][];
}

//------------------------------
//  Frame constructions
//------------------------------

/**
 * Three's `computeFrenetFrames`, reimplemented on a tangent list so the comparison is apples to apples.
 *
 * Transcribed from `three/src/extras/core/Curve.js`. Read what it does rather than what it is called: it
 * seeds a normal, then for each step rotates the PREVIOUS normal by the minimum rotation carrying the
 * previous tangent onto the current one. Curvature is never consulted. That is parallel transport, and
 * three's own source comment points at TR425 — the parallel transport tech report — not at Frenet.
 *
 * Two things differ from `transportFrames`, and neither is the algorithm:
 *
 * - THE SEED. Three picks its first normal from whichever tangent component is smallest, so the caller
 *   has no say and two similar paths can seed 90° apart. That is the entire difference on the helix.
 * - NO RE-ORTHOGONALIZATION. The library re-projects the normal perpendicular to the tangent every step.
 *   Measured over a 4000-segment helix that keeps `|T·N|` at 2e-15 against three's 9e-14 — 40× tighter,
 *   and both so far below anything visible that it is a matter of hygiene, not of appearance.
 */
function threeFrames(points: Vector3[], tangents: Vector3[]): Station[] {
  const normal = new Vector3();
  let min = Number.MAX_VALUE;
  const tx = Math.abs(tangents[0]!.x);
  const ty = Math.abs(tangents[0]!.y);
  const tz = Math.abs(tangents[0]!.z);
  if (tx <= min) {
    min = tx;
    normal.set(1, 0, 0);
  }
  if (ty <= min) {
    min = ty;
    normal.set(0, 1, 0);
  }
  if (tz <= min) normal.set(0, 0, 1);

  const vec = new Vector3().crossVectors(tangents[0]!, normal).normalize();
  const normals = [new Vector3().crossVectors(tangents[0]!, vec)];

  for (let i = 1; i < tangents.length; i++) {
    const carried = normals[i - 1]!.clone();
    vec.crossVectors(tangents[i - 1]!, tangents[i]!);
    if (vec.length() > Number.EPSILON) {
      vec.normalize();
      const theta = Math.acos(clamp(tangents[i - 1]!.dot(tangents[i]!)));
      carried.applyQuaternion(new Quaternion().setFromAxisAngle(vec, theta));
    }
    normals.push(carried);
  }

  return normals.map((n, i) => ({
    position: points[i]!,
    tangent: tangents[i]!,
    normal: n,
    binormal: new Vector3().crossVectors(tangents[i]!, n),
  }));
}

/**
 * TRUE Frenet — the normal taken from the path's CURVATURE, which is what the name has always meant and
 * what everyone assumes `TubeGeometry` does.
 *
 * `dT/ds` points where the path is turning; project out the tangent and normalize and that is the Frenet
 * normal. It is a perfectly good frame on a curve that is always turning the same way. Two failures
 * finish it for modeling, and both are structural rather than numerical:
 *
 * - A STRAIGHT RUN has zero curvature, so `dT` vanishes and the normal is not merely inaccurate, it is
 *   UNDEFINED. Some arbitrary axis has to be substituted, and the arbitrary choice made below is what
 *   produces the 90° steps at the archway's legs. There is no better choice available — that is the point.
 * - AN INFLECTION reverses the curvature vector while the tangent runs on smoothly, so the normal turns
 *   through 180° and the section ends up inside out. It arrives as TWO 90° steps rather than one snap:
 *   the central difference below straddles the inflection, so the station either side of it sees a
 *   half-reversed `dT`. A one-sided difference would snap all 180° at once instead. Neither is better —
 *   the flip is in the construction, and the discretization only decides how it is spread. The reverse
 *   curve is two arcs meeting tangentially and nothing else, and it still breaks.
 */
function frenetFrames(points: Vector3[], tangents: Vector3[]): Station[] {
  return tangents.map((tangent, i) => {
    const prev = tangents[Math.max(0, i - 1)]!;
    const next = tangents[Math.min(tangents.length - 1, i + 1)]!;
    const dT = new Vector3().subVectors(next, prev);
    let n = dT.clone().sub(tangent.clone().multiplyScalar(dT.dot(tangent)));

    // Zero curvature. Nothing in the PATH can answer, so a world axis answers instead — and that
    // substitution, not the arithmetic, is the failure.
    if (n.lengthSq() < 1e-12) {
      n = new Vector3(0, 0, 1).cross(tangent).cross(tangent).negate();
      if (n.lengthSq() < 1e-12) n = new Vector3(1, 0, 0).cross(tangent).cross(tangent).negate();
    }

    n.normalize();
    return { position: points[i]!, tangent, normal: n, binormal: new Vector3().crossVectors(tangent, n) };
  });
}

/**
 * FIXED REFERENCE — one world axis, projected perpendicular to the tangent at every station.
 *
 * The construction everyone writes first, and it is not naive: on any PLANAR path whose plane contains
 * the reference it is EXACT, matching parallel transport to the last digit. That is why it survives in so
 * much working code — every arch, every scroll, every wall-plane molding is planar. It has no memory,
 * though, so the section is re-derived from the world at each step rather than carried, and the moment
 * the path leaves its plane the world's answer starts to disagree with the path's. Take it to the helix.
 *
 * Its other failure is loud: where the tangent runs PARALLEL to the reference the projection collapses to
 * nothing and there is no frame at all.
 */
function fixedFrames(points: Vector3[], tangents: Vector3[], reference: Vector3): Station[] {
  return tangents.map((tangent, i) => {
    let n = reference.clone().sub(tangent.clone().multiplyScalar(reference.dot(tangent)));
    // The tangent has run into the reference axis. Nothing to project.
    if (n.lengthSq() < 1e-8) n = new Vector3(tangent.y, tangent.z, tangent.x).cross(tangent);
    n.normalize();
    return { position: points[i]!, tangent, normal: n, binormal: new Vector3().crossVectors(tangent, n) };
  });
}

/**
 * INTRINSIC TWIST — how much the section spins about its own tangent BEYOND what the path forces.
 *
 * The measure matters as much as the number. Comparing each construction against a chosen reference frame
 * would only report how far it sits from that choice, and a constant offset would read as error. Instead:
 * carry frame `i` forward by the minimum rotation taking tangent `i` onto tangent `i+1`, then measure the
 * residual angle to the construction's OWN normal there. That asks the only fair question — did the
 * section rotate for a reason the path gave? — and it needs no reference at all.
 *
 * Parallel transport scores exactly 0 by definition, because that carrying step IS parallel transport.
 * The `worst` step is reported next to the total because they catch different failures: a 180° Frenet flip
 * at a single inflection is a small fraction of a long path's total and invisible in an average, but it is
 * the defect you actually see.
 */
function twist(stations: Station[]): { total: number; worst: number } {
  let total = 0;
  let worst = 0;
  const axis = new Vector3();
  const rotation = new Quaternion();

  for (let i = 1; i < stations.length; i++) {
    const previous = stations[i - 1]!;
    const current = stations[i]!;
    const carried = previous.normal.clone();

    axis.crossVectors(previous.tangent, current.tangent);
    if (axis.lengthSq() > 1e-12) {
      const angle = Math.acos(clamp(previous.tangent.dot(current.tangent)));
      carried.applyQuaternion(rotation.setFromAxisAngle(axis.normalize(), angle));
    }
    carried.sub(current.tangent.clone().multiplyScalar(carried.dot(current.tangent))).normalize();

    const step = Math.acos(clamp(carried.dot(current.normal))) * DEG;
    total += step;
    worst = Math.max(worst, step);
  }

  return { total, worst };
}

//------------------------------
//  Drawing
//------------------------------

interface Line {
  a: Vector3;
  b: Vector3;
  color: Color;
  /** Fades the segment toward its start, so a triad axis reads as an arrow without needing a head. */
  taper?: boolean;
}

/**
 * One `LineSegments` for a whole stage, colored per vertex.
 *
 * Built as a single object rather than one per station because a 96-station helix would otherwise be 288
 * objects to add, traverse, and dispose. Direction is carried by a brightness ramp — dark at the station,
 * bright at the tip — instead of by arrowheads, which is both cheaper and legible at any zoom. Line width
 * is 1px whatever you ask for, in WebGL and WebGPU alike, so it cannot be carried by weight.
 */
function lineSet(lines: Line[], material: LineBasicMaterial): LineSegments {
  const positions = new Float32Array(lines.length * 6);
  const colors = new Float32Array(lines.length * 6);
  const dim = new Color();

  lines.forEach(({ a, b, color, taper }, i) => {
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    dim.copy(color).multiplyScalar(taper ? 0.25 : 1);
    colors.set([dim.r, dim.g, dim.b, color.r, color.g, color.b], i * 6);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return new LineSegments(geometry, material);
}

/** The profile placed in one station's frame. The same three lines `sweep` runs to build its rings. */
function ring(station: Station, profile: [number, number][], scale: number): Vector3[] {
  return profile.map(([px, py]) =>
    station.position
      .clone()
      .addScaledVector(station.normal, px * scale)
      .addScaledVector(station.binormal, py * scale),
  );
}

//------------------------------
//  Scene
//------------------------------

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3.4, 2.2, 4.6] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.6);
  key.position.set(3.5, 5, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.5);
  fill.position.set(-3.5, 1, -3);
  scene.add(key, fill);

  const solidMaterial = new MeshStandardMaterial({
    color: 0x9aa4b2,
    metalness: 0.55,
    roughness: 0.45,
    flatShading: true,
    // The section is open at both ends when caps are off, and the frames are drawn INSIDE the solid.
    side: DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    path: new Color(0x7d8798),
    tangent: new Color(0xffb454),
    normal: new Color(0xff5c7a),
    binormal: new Color(0x5ce1ff),
    ring: new Color(0xe4ebf5),
    rail: new Color(0x59657a),
  };

  const params = {
    path: "archway" as PathName,
    segments: 16,

    construction: "transport" as Construction,
    seed: "+Z",

    profile: "angle" as ProfileName,
    size: 0.26,
    sides: 8,

    showPath: true,
    showStations: true,
    showRings: true,
    showRails: true,
    showSolid: true,
    opacity: 0.35,
    triadLength: 0.3,
    cap: true,

    twist: "",
    worst: "",
    offset: "",
    counts: "",
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

  const seedAxis = (): Vector3 =>
    params.seed === "+X"
      ? new Vector3(1, 0, 0)
      : params.seed === "+Y"
        ? new Vector3(0, 1, 0)
        : new Vector3(0, 0, 1);

  const rebuild = () => {
    clear();

    const { path, label } = buildPath(params.path, params.segments);
    const profile = buildProfile(params.profile, params.size, params.sides);
    const reference = seedAxis();

    // Every construction is handed the SAME stations to start from, so nothing below can differ because
    // of how the path was sampled or where its duplicate points were dropped. `transportFrames` is what
    // does that cleaning, which is why even the rival constructions are built on top of its output.
    const base = transportFrames(path, reference);
    const points = base.map((s) => s.position);
    const tangents = base.map((s) => s.tangent);

    const stations =
      params.construction === "transport"
        ? base
        : params.construction === "three"
          ? threeFrames(points, tangents)
          : params.construction === "frenet"
            ? frenetFrames(points, tangents)
            : fixedFrames(points, tangents, reference);

    const rings = stations.map((s) => ring(s, profile, 1));
    const lines: Line[] = [];

    // STAGE 1 — the path. Positions joined in order. On its own it is not enough to sweep anything.
    if (params.showPath) {
      for (let i = 1; i < points.length; i++) {
        lines.push({ a: points[i - 1]!, b: points[i]!, color: COLOR.path });
      }
    }

    // STAGE 2 — the stations. The tangent is GIVEN by the path; the normal and binormal are what the
    // construction had to invent. Watch only the rose and cyan axes: those are the study.
    if (params.showStations) {
      const length = params.triadLength;
      for (const s of stations) {
        lines.push(
          { a: s.position, b: s.position.clone().addScaledVector(s.tangent, length), color: COLOR.tangent, taper: true },
          { a: s.position, b: s.position.clone().addScaledVector(s.normal, length), color: COLOR.normal, taper: true },
          { a: s.position, b: s.position.clone().addScaledVector(s.binormal, length), color: COLOR.binormal, taper: true },
        );
      }
    }

    // STAGE 3 — the rings. The profile, placed in each frame. Still no surface.
    if (params.showRings) {
      for (const r of rings) {
        for (let j = 0; j < r.length; j++) {
          lines.push({ a: r[j]!, b: r[(j + 1) % r.length]!, color: COLOR.ring });
        }
      }
    }

    // STAGE 4 — the rails. Vertex j of one ring to vertex j of the next. With stage 3 this IS the quad
    // grid: the stitch decides nothing, it only joins what the frames already placed. A twisted frame
    // shows here as rails that spiral instead of running straight.
    if (params.showRails) {
      for (let i = 1; i < rings.length; i++) {
        const a = rings[i - 1]!;
        const b = rings[i]!;
        for (let j = 0; j < a.length; j++) lines.push({ a: a[j]!, b: b[j]!, color: COLOR.rail });
      }
    }

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    // STAGE 5 — the surface, from the library, from the same stations. The diagram and the mesh cannot
    // disagree, because there is only one set of frames and both are reading it.
    let triangles = 0;
    if (params.showSolid) {
      const geometry = sweep(profile, stations, { cap: params.cap });
      // `toBufferGeometry` returns INDEXED geometry, so the triangle count is in the index, not the
      // position attribute — `position.count / 3` counts shared vertices and is not even an integer.
      triangles = geometry.getIndex()!.count / 3;
      stage.add(new Mesh(geometry, solidMaterial));
    }

    const { total, worst } = twist(stations);
    // The largest angle between this construction's frame and parallel transport's. Reported NEXT TO the
    // twist because the two answer different questions and neither is enough alone: true Frenet on the
    // plain arc twists by 0.00° yet sits a constant 90° away, which is a section pointing somewhere else,
    // not a section spinning. Offset without twist is a choice of seed; twist is the defect.
    const offset = Math.max(...stations.map((s, i) => Math.acos(clamp(Math.abs(s.normal.dot(base[i]!.normal)))) * DEG));
    params.twist = total < 5e-4 ? "0.00° — carried, never spun" : `${total.toFixed(2)}° accumulated`;
    params.worst =
      worst < 5e-4
        ? "0.00° — no step rotates the section"
        : `${worst.toFixed(2)}° in a single step${worst > 90 ? " — the section turns over" : ""}`;
    params.offset =
      offset < 5e-4
        ? "0.00° — the same frames transport builds"
        : `${offset.toFixed(2)}° from transport${total < 5e-4 ? " — rotated, not twisted" : ""}`;
    params.counts = `${stations.length} stations · ${profile.length}-sided profile · ${triangles} triangles`;
    params.about = label;
  };

  rebuild();
  // FRAME ONCE. Re-framing on a dial change throws away the viewer's zoom and pan, and this study is one
  // you lean into — the twist at an inflection is two stations wide.
  frameObject(handle, stage, { fit: 1.5 });

  const gui = new GUI();
  gui.title("Anatomy of a Sweep");

  const frames = gui.addFolder("Frame");
  // The subject. Transport and three's agree exactly; the other two are the failures they avoid.
  frames
    .add(params, "construction", {
      "Parallel Transport (this library)": "transport",
      "three's computeFrenetFrames": "three",
      "TRUE Frenet (from curvature)": "frenet",
      "Fixed World Reference": "fixed",
    })
    .name("Construction")
    .onChange(rebuild);
  // Seeds parallel transport, and IS the reference for the fixed construction. Turning it rotates the
  // whole section without the twist reading leaving zero — a constant offset is not twist, which is the
  // entire difference between this library's frames and three's on the helix.
  frames.add(params, "seed", ["+X", "+Y", "+Z"]).name("Seed Axis").onChange(rebuild);
  frames.open();

  const route = gui.addFolder("Path");
  route.add(params, "path", ["arc", "archway", "reverse", "helix", "curve"]).name("Path").onChange(rebuild);
  route.add(params, "segments", 4, 48, 1).name("Segments").onChange(rebuild);
  route.open();

  const section = gui.addFolder("Profile");
  // Angle is asymmetric and off-center, so twist and the origin are both visible. Tube hides them — and
  // that is the honest reason twisted tubes ship.
  section.add(params, "profile", { "Angle (asymmetric)": "angle", "Bar (rectangular)": "bar", "Tube (round)": "tube" })
    .name("Profile")
    .onChange(rebuild);
  section.add(params, "size", 0.06, 0.6, 0.01).name("Size").onChange(rebuild);
  section.add(params, "sides", 3, 20, 1).name("Tube Sides").onChange(rebuild);
  section.open();

  const stages = gui.addFolder("Stages");
  stages.add(params, "showPath").name("1 · Path").onChange(rebuild);
  stages.add(params, "showStations").name("2 · Stations").onChange(rebuild);
  stages.add(params, "showRings").name("3 · Rings").onChange(rebuild);
  stages.add(params, "showRails").name("4 · Rails").onChange(rebuild);
  stages.add(params, "showSolid").name("5 · Surface").onChange(rebuild);
  stages.add(params, "cap").name("Cap Ends").onChange(rebuild);
  stages.add(params, "triadLength", 0.08, 0.8, 0.02).name("Triad Length").onChange(rebuild);
  // The frames are drawn INSIDE the solid, so seeing the subject at all means seeing through the surface.
  stages
    .add(params, "opacity", 0.05, 1, 0.05)
    .name("Surface Opacity")
    .onChange((value: number) => {
      solidMaterial.opacity = value;
      solidMaterial.transparent = value < 1;
      solidMaterial.depthWrite = value >= 1;
      solidMaterial.needsUpdate = true;
    });
  stages.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "twist").name("Intrinsic Twist").listen().disable();
  readout.add(params, "worst").name("Worst Step").listen().disable();
  readout.add(params, "offset").name("Offset vs Transport").listen().disable();
  readout.add(params, "counts").name("Built").listen().disable();
  readout.add(params, "about").name("This Path").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    solidMaterial.dispose();
    lineMaterial.dispose();
    dispose();
  };
}

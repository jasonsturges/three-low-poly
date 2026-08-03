import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
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
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cutEnd, cutEndGeometry, miterPlane, type CutPlane } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Hip Seams",
  description:
    "STUDY — a pyramid roof is a tent until its joints are covered. Four planes meeting at an apex leave " +
    "four HIPS, and on a real roof every one is a seam that has to be capped or the water gets in. " +
    "Modeling that cap is what turns a cone into a built object. The roof is the port; the SEAM is the " +
    "subject. " +
    "A cap is not a box you place, it is a folded sheet laid over the joint, and almost everything about " +
    "it is therefore DERIVED. It seats on the bisector of the two planes it covers — `normalize(n1 + n2)`, " +
    "taken from the roof's own face normals so it cannot disagree with the roof it sits on. Its widest " +
    "points must come to rest on those planes, and since the roof falls away from the joint at a rate the " +
    "dihedral already fixes, they have to drop exactly `(width / 2) * tan(alpha)` to make contact. So " +
    "THICKNESS IS NOT AN INPUT: it comes out as `rise + drop`, and differs from joint to joint because " +
    "each joint has its own dihedral. Two dials are left, and they are independent — Seam Width across, " +
    "Seam Rise out. " +
    "Rise is measured from the JOINT LINE, which makes the two ways of reading a seam into one dial. At " +
    "rise 0 the top is flush with the joint and you have the roof PLANED off, a lathe run down the corner; " +
    "wind it up and the sheet stands proud and folded. A solid section cannot be both, so these are not " +
    "rival interpretations, they are values. " +
    "The seating is worth the study on its own, because the wrong constructions are easy to reach for and " +
    "one is genuinely hard to catch. MINIMAL ROTATION — the shortest turn from UP onto the hip — is " +
    "underdetermined, and resolves its leftover roll against a world axis that has never heard of the " +
    "roof. CORNER OUTWARD borrows the corner's horizontal direction, and is the interesting failure: on a " +
    "SQUARE plan that direction lies in a genuine mirror plane of the roof, so it is exactly right and " +
    "looks authoritative. Take the plan off square and the two planes at each hip no longer share a pitch, " +
    "the mirror is gone, and it drifts — 1.4° at 3.4 x 3.6, 12.6° at 4.4 x 2.6, 27.7° at 6 x 1.5. Both " +
    "wrong seatings now fail VISIBLY as well as numerically, because a tipped cap stops touching the roof. " +
    "The apex is now MITERED. Each cap's end is cut against its two neighbors around the apex — the plane " +
    "through the apex with normal `normalize(a_i - a_j)`, both axes pointing away down their own hip, so " +
    "adjacent caps are handed the same surface from opposite sides and abut with no gap by construction. " +
    "Every cap ends in an arrowhead: two facets meeting at a ridge, which is a HIP END, so the cut is the " +
    "one from `studies/miter/hip-end` by way of `studies/miter/junction`. It closes to 1e-16 at every plan " +
    "aspect — square, 4.4 x 2.6, even 6.0 x 1.5 — because adjacent hips are MIRROR IMAGES across the plane " +
    "bisecting them, which is the real condition for a miter to shut. Turn Miter Apex off to see what it " +
    "replaced: four ends square across their own hips, all through the one point, slicing through each " +
    "other. " +
    "What the miter does NOT fix is the peak. A cap's top face sits `rise` out along its OWN bisector and " +
    "those bisectors SPLAY, so adjacent top faces only meet when the width reaches `2 * rise * |horizontal " +
    "part of the bisector|` — about 0.071 at the default rise. Below it a dish opens at the center; above " +
    "it they overlap. That is a COVERAGE problem rather than a cutting one, no cut can close it, and it is " +
    "what a FINIAL is for — a joint cover, not ornament, the same thing the quoin turned out to be at a " +
    "wall corner.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  HIP        the sloping joint where two roof planes meet, running from eave up to the apex or ridge.
//             Always SHALLOWER than the planes it joins, because it travels the diagonal — which is why a
//             hipped roof reads longer and lazier than its own pitch suggests. Both are in the readout.
//  EAVE       the lower edge, oversailing the wall so water is thrown clear of it rather than running
//             down the masonry. The OVERHANG is that oversail.
//  APEX       where a pyramid's hips converge. Four seams arriving at one point is a JOIN, and it is
//             unresolved here on purpose.
//  DIHEDRAL   the angle between two planes at their shared edge. A seam seats on its BISECTOR, and the
//             HALF-ANGLE from that bisector to either face is what sizes the cap.
//  PITCH      the slope. Quoted as an angle here; a roofer would quote a rise over a run.
//  HIP CAP /  the member covering a hip. In metalwork a standing seam, in tile a hip roll, in lead a
//  HIP ROLL   roll proper. All the same move: bridge the joint with something raised.
//  PAVILION   a hipped roof on a square plan — a pyramid. The strict name for what this study builds.
//
//  Deliberately NOT here: pinnacles, finials, cornice. They cap a mass and they belong to the terminators
//  question, which wants its own study. The roof had to be isolated first.

type Construction = "bisector" | "outward" | "minimal";
type Section = "cap" | "crest";

const UP = new Vector3(0, 1, 0);
/** Past this the joint has folded back on itself and the drop runs away. Nothing on a roof reaches it. */
const MAX_HALF_ANGLE = (85 * Math.PI) / 180;

/** A point in a joint's own cross-section: `across` the joint, and `out` along its bisector. */
type Profile = [across: number, out: number][];

/** One joint to cover: the edge it runs along, and the two planes that meet there. */
interface Joint {
  from: Vector3;
  to: Vector3;
  /** The two faces' outward normals. Their bisector is the seam's seating, and there is no other input. */
  planes: [Vector3, Vector3];
  /** The corner's horizontal outward direction — only for the CORNER OUTWARD construction to be wrong with. */
  outward: Vector3;
}

interface Roof {
  geometry: BufferGeometry;
  joints: Joint[];
}

/**
 * The roof planes and the joints between them, derived together.
 *
 * Four triangles from the eave rectangle up to a single apex, with each face's normal taken from the
 * triangle itself and handed to the two joints that border it. Deriving the normals from the drawn
 * geometry rather than from a formula is the point: a cap seats on what the roof ACTUALLY does, and the
 * two cannot fall out of agreement when the plan changes.
 *
 * Built by hand rather than from a four-sided `ConeGeometry`, which is what the original belfry used. A
 * cone's base is a REGULAR polygon, so it can only ever be square in plan — and a square plan is exactly
 * the case that hides the seating error below.
 */
const buildRoof = (halfWidth: number, halfDepth: number, rise: number): Roof => {
  const corners: Vector3[] = [
    new Vector3(-halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, halfDepth),
    new Vector3(-halfWidth, 0, halfDepth),
  ];
  const apex = new Vector3(0, rise, 0);

  const positions = new Float32Array(4 * 9);
  const normals: Vector3[] = [];

  for (let i = 0; i < 4; i++) {
    // (corner, apex, next corner) winds so the face normal comes out UP and OUTWARD.
    const triangle = [corners[i]!, apex, corners[(i + 1) % 4]!];
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3));
    normals.push(
      new Vector3()
        .subVectors(triangle[1]!, triangle[0]!)
        .cross(new Vector3().subVectors(triangle[2]!, triangle[0]!))
        .normalize(),
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  // Corner `i` is shared by face `i` and face `i - 1`, so those are the two planes its hip covers.
  const joints: Joint[] = corners.map((corner, i) => ({
    from: corner.clone(),
    to: apex.clone(),
    planes: [normals[(i + 3) % 4]!, normals[i]!],
    outward: new Vector3(corner.x, 0, corner.z).normalize(),
  }));

  return { geometry, joints };
};

/**
 * Where a seam should FACE — the bisector of the two planes it covers.
 *
 * `normalize(n1 + n2)` and nothing else. It is automatically perpendicular to the joint, because the joint
 * lies in both planes and is therefore perpendicular to both normals, so it can serve directly as a frame
 * axis without being re-orthogonalized against anything.
 */
const seating = (planes: [Vector3, Vector3]): Vector3 => planes[0].clone().add(planes[1]).normalize();

/** The joint's HALF-ANGLE: bisector to either face normal. This is what sizes the cap. */
const halfAngle = (planes: [Vector3, Vector3]): number =>
  Math.acos(Math.max(-1, Math.min(1, planes[0].dot(seating(planes)))));

/**
 * The frame for a seam riding one joint, by each of the three constructions.
 *
 * `bisector` seats the cap on the dihedral, from the roof's own normals. Correct at any plan.
 *
 * `outward` borrows the corner's HORIZONTAL direction and projects it perpendicular to the hip. On a
 * square plan that direction lies in a real mirror plane of the roof and the projection lands exactly on
 * the bisector — which is why it looks authoritative and why the error is easy to ship. Off square, the
 * two planes at a hip have different pitches, the mirror is gone, and the cap tips off the roof.
 *
 * `minimal` takes the shortest rotation carrying UP onto the hip. Infinitely many rotations do that, and
 * `setFromUnitVectors` resolves the ambiguity against a world axis. Nothing in that decision has heard of
 * the roof.
 */
const seamFrame = (direction: Vector3, joint: Joint, construction: Construction): Quaternion => {
  if (construction === "minimal") return new Quaternion().setFromUnitVectors(UP, direction);

  const reference = construction === "bisector" ? seating(joint.planes) : joint.outward;
  const x = new Vector3().crossVectors(direction, reference).normalize();
  const z = new Vector3().crossVectors(x, direction);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, direction, z));
};

/**
 * The section of a cap riding a joint whose half-angle is `alpha`, sized to SIT ON the roof.
 *
 * Thickness is not an input. A cap is a folded sheet laid over the joint, so its widest points have to
 * come to rest on the two planes — and the roof falls away from the joint at a rate the dihedral already
 * fixes. Put the widest points at `+/- width / 2` and they must drop exactly `(width / 2) * tan(alpha)`
 * below the joint line to make contact. Everything else follows:
 *
 * - `rise` is the only outward input, measured from the JOINT LINE to the top of the cap
 * - thickness comes out as `rise + drop`, and differs per joint, because each joint has its own dihedral
 * - `rise = 0` puts the top flush with the joint line — the roof PLANED off. A solid section cannot be
 *   both flush and proud, so those two readings are one dial at different values, not rival ideas
 *
 * The same contact rule sizes both sections, which is why they can share a `rise`: CAP is flat-topped with
 * two contact corners; CREST comes to a sharp edge over the joint, with the same two contact corners.
 */
const profile = (width: number, rise: number, alpha: number, section: Section): Profile => {
  const half = width / 2;
  const drop = half * Math.tan(Math.min(alpha, MAX_HALF_ANGLE));
  return section === "cap"
    ? [
        [-half, -drop],
        [half, -drop],
        [half, rise],
        [-half, rise],
      ]
    : [
        [-half, -drop],
        [half, -drop],
        [0, rise],
      ];
};

/**
 * Extrude a section along a joint, as a closed prism.
 *
 * Non-indexed, so every facet keeps its own normal and shades flat. The section is wound counter-clockwise
 * if it is not already, so sides come out facing away from the joint whichever way a caller wrote it.
 */
/**
 * Lay a cap's section on its hip and cut its apex end against the two bounding planes.
 *
 * The cut is `cutEnd` from the library — promoted out of these studies once six of them had written it.
 * What stays here is only what belongs to a roof: where the section sits, and which planes bound it.
 *
 * The section is wound counter-clockwise if it is not already, so the sides come out facing away from the
 * joint whichever way a caller wrote it.
 */
const extrude = (
  from: Vector3,
  to: Vector3,
  across: Vector3,
  out: Vector3,
  section: Profile,
  bounds: [CutPlane, CutPlane],
): BufferGeometry => {
  const signed =
    section.reduce((sum, [u, v], i) => {
      const [u2, v2] = section[(i + 1) % section.length]!;
      return sum + (u * v2 - u2 * v);
    }, 0) / 2;
  const points = signed < 0 ? [...section].reverse() : section;

  const forward = new Vector3().subVectors(to, from).normalize();
  const ring = points.map(([u, v]) => from.clone().addScaledVector(across, u).addScaledVector(out, v));
  return cutEndGeometry(cutEnd(ring, forward, bounds), forward);
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x11141a,
    cameraPosition: [6.2, 4.4, 7.0],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.5);
  // High and to one side, so each seam throws a shadow down the plane it rides — without that the caps
  // read as painted stripes rather than as members standing proud.
  key.position.set(4, 6, 3.5);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-3.5, 0.5, -2.5);
  scene.add(key, bounce);

  const roofing = new MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.62,
    metalness: 0.32,
    flatShading: true,
    // The roof is an open shell — no soffit, so the underside is visible from below and from inside.
    side: DoubleSide,
  });
  const seaming = new MeshStandardMaterial({
    color: 0x6d7780,
    roughness: 0.45,
    metalness: 0.5,
    flatShading: true,
    // So that turning Seam Opacity down reveals the far side of the prism, not just its near shell.
    side: DoubleSide,
  });
  const masonry = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 3.6,
    depth: 3.6,
    rise: 2.8,
    overhang: 0.16,

    seams: true,
    miter: true,
    seamWidth: 0.14,
    seamRise: 0.05,
    section: "cap" as Section,
    construction: "bisector" as Construction,

    wall: true,
    wallHeight: 2.4,
    wireframe: false,
    seamOpacity: 1,

    pitch: "",
    hip: "",
    seat: "",
    fit: "",
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

    const { width: W, depth: D, rise: R, overhang, wallHeight: base } = params;
    const halfWidth = W / 2 + overhang;
    const halfDepth = D / 2 + overhang;

    if (params.wall) {
      const wall = new Mesh(new BoxGeometry(W, base, D), masonry);
      wall.position.y = base / 2;
      stage.add(wall);
    }

    const roof = buildRoof(halfWidth, halfDepth, R);
    roof.geometry.translate(0, base, 0);
    stage.add(new Mesh(roof.geometry, roofing));

    const errors: number[] = [];
    const contacts: number[] = [];
    const thicknesses: number[] = [];

    if (params.seams) {
      const parts: BufferGeometry[] = [];
      const direction = new Vector3();

      // Each cap's apex end is cut against its two NEIGHBORS around the apex — the construction proved
      // in `studies/miter/junction`. Corner `i`'s neighbors are simply corners `i - 1` and `i + 1`.
      const awayFrom = (joint: Joint) => new Vector3().subVectors(joint.from, joint.to).normalize();

      roof.joints.forEach((joint, index) => {
        // From the eave corner up to the apex. Its LENGTH is the seam's length, which is why the seam
        // never has to be told how long it is.
        direction.subVectors(joint.to, joint.from);
        const length = direction.length();
        if (length < 1e-6) return;
        direction.divideScalar(length);

        // The frame the chosen construction gives: +X across the joint, +Z out along its bisector.
        const orientation = seamFrame(direction, joint, params.construction);
        const across = new Vector3(1, 0, 0).applyQuaternion(orientation);
        const out = new Vector3(0, 0, 1).applyQuaternion(orientation);

        const alpha = halfAngle(joint.planes);
        const section = profile(params.seamWidth, params.seamRise, alpha, params.section);
        thicknesses.push(params.seamRise + (params.seamWidth / 2) * Math.tan(Math.min(alpha, MAX_HALF_ANGLE)));

        const from = joint.from.clone().setY(joint.from.y + base);
        const to = joint.to.clone().setY(joint.to.y + base);

        // The miter plane against a neighbor: through the apex, normal `normalize(a_i - a_j)` with both
        // axes pointing AWAY down their own hip. The neighbor is handed the same plane from the other
        // side, so adjacent caps abut with no gap by construction rather than by tuning.
        const count = roof.joints.length;
        const mine = awayFrom(joint);
        const against = (other: Joint): CutPlane => miterPlane(to, mine, awayFrom(other));
        // Un-mitered leaves the end square across the hip — every cap through the apex, slicing through
        // its neighbors. That is the pile-up the miter exists to resolve.
        const square: CutPlane = { point: to.clone(), normal: new Vector3().subVectors(from, to).normalize() };
        const bounds: [CutPlane, CutPlane] = params.miter
          ? [against(roof.joints[(index + count - 1) % count]!), against(roof.joints[(index + 1) % count]!)]
          : [square, square];

        parts.push(extrude(from, to, across, out, section, bounds));

        // How far the seating has drifted from the bisector it should sit on. A CORRECTNESS measure —
        // unlike agreement between the four caps, which they can have while all being wrong together.
        const truth = seating(joint.planes);
        errors.push((Math.acos(Math.min(1, Math.abs(out.dot(truth)))) * 180) / Math.PI);

        // And what that costs physically: where the widest points actually END UP relative to the roof.
        // The roof solid near a joint is where BOTH signed distances are negative, so `max` is the distance
        // OUT of it: zero rests on the surface, positive floats above, negative is strictly buried. Taking
        // `min` instead calls a healthy cap buried, because a corner resting on one plane sits behind the
        // other plane.'.s infinite extension.
        const drop = (params.seamWidth / 2) * Math.tan(Math.min(alpha, MAX_HALF_ANGLE));
        for (const side of [-1, 1]) {
          const corner = new Vector3()
            .addScaledVector(across, (side * params.seamWidth) / 2)
            .addScaledVector(out, -drop);
          contacts.push(Math.max(corner.dot(joint.planes[0]), corner.dot(joint.planes[1])));
        }
      });

      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (merged) {
        stage.add(new Mesh(merged, seaming));
        if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));
      }
    }

    // The COMMON pitch — straight up a plane, perpendicular to the eave. Two of them on a rectangle,
    // because the short side climbs the same rise over a shorter run and is therefore steeper.
    const acrossWidth = (Math.atan2(R, halfWidth) * 180) / Math.PI;
    const acrossDepth = (Math.atan2(R, halfDepth) * 180) / Math.PI;
    // The HIP's own pitch, up the diagonal. Always the shallowest line on the roof.
    const hipPitch = (Math.atan2(R, Math.hypot(halfWidth, halfDepth)) * 180) / Math.PI;

    params.pitch =
      Math.abs(acrossWidth - acrossDepth) < 0.05
        ? `${acrossWidth.toFixed(1)}° all round`
        : `${acrossDepth.toFixed(1)}° across width · ${acrossWidth.toFixed(1)}° across depth`;
    params.hip = `${hipPitch.toFixed(1)}° · ${Math.hypot(halfWidth, halfDepth, R).toFixed(2)} long — shallower than either plane`;

    if (errors.length === 0) {
      params.seat = "no seams";
      params.fit = "no seams";
    } else {
      const worst = Math.max(...errors);
      params.seat =
        worst < 0.005
          ? `seated — 0.00° off the bisector on all ${errors.length} hips`
          : `${worst.toFixed(2)}° OFF the bisector — the caps are tipped`;

      const low = Math.min(...contacts);
      const high = Math.max(...contacts);
      const thickest = Math.max(...thicknesses);
      const thinnest = Math.min(...thicknesses);
      const span =
        Math.abs(thickest - thinnest) < 5e-4
          ? thickest.toFixed(3)
          : `${thinnest.toFixed(3)}–${thickest.toFixed(3)}`;
      params.fit =
        Math.max(Math.abs(low), Math.abs(high)) < 1e-6
          ? `resting on the roof · thickness ${span} (derived)`
          : `${high > 1e-6 ? `floats ${high.toFixed(3)} ` : ""}${low < -1e-6 ? `buries ${(-low).toFixed(3)}` : ""} · thickness ${span}`;
    }

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centered without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Hip Seams");

  const seam = gui.addFolder("Seams");
  // The whole point of the study. Off, it is a tent; on, it is a roof.
  seam.add(params, "seams").name("Show Seams").onChange(rebuild);
  // Each cap's apex end cut against its two neighbors. Off, every end is square across its own hip and
  // all four pass through the apex, slicing through each other — the pile-up this resolves.
  seam.add(params, "miter").name("Miter Apex").onChange(rebuild);
  // The two dials that are left, and they no longer fight: across, and out. Thickness is derived from
  // width and the joint's own dihedral, so every setting of these two still rests on the roof.
  seam.add(params, "seamWidth", 0.02, 0.6, 0.005).name("Seam Width").onChange(rebuild);
  // Measured from the JOINT LINE. 0 is flush — the roof planed off — and up from there it stands proud.
  seam.add(params, "seamRise", 0, 0.4, 0.005).name("Seam Rise").onChange(rebuild);
  // Flat-topped, or brought to a sharp edge over the joint. Both rest on the same two contact points.
  seam.add(params, "section", { Cap: "cap", Crest: "crest" }).name("Section").onChange(rebuild);
  seam.open();

  const construction = gui.addFolder("Seating");
  // Set the plan off square to tell these apart — at 3.6 x 3.6 the first two agree exactly.
  construction
    .add(params, "construction", {
      "Dihedral Bisector": "bisector",
      "Corner Outward": "outward",
      "Minimal Rotation": "minimal",
    })
    .name("Construction")
    .onChange(rebuild);
  construction.open();

  const form = gui.addFolder("Roof");
  form.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  form.add(params, "depth", 1, 8, 0.1).name("Depth").onChange(rebuild);
  form.add(params, "rise", 0.4, 6, 0.1).name("Rise").onChange(rebuild);
  form.add(params, "overhang", 0, 0.8, 0.01).name("Overhang").onChange(rebuild);
  form.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wall").name("Wall").onChange(rebuild);
  inspect.add(params, "wallHeight", 0.5, 5, 0.1).name("Wall Height").onChange(rebuild);
  inspect.add(params, "wireframe").name("Seam Wireframe").onChange(rebuild);
  // A diagnostic, not a look. Much of a cap is buried by design — it drops below the joint line to reach
  // the roof — so seeing where it actually sits, and how it runs out at the eave, means seeing through it.
  inspect
    .add(params, "seamOpacity", 0.15, 1, 0.05)
    .name("Seam Opacity")
    .onChange((value: number) => {
      seaming.transparent = value < 1;
      seaming.opacity = value;
      // Overlapping caps should ALL show through rather than the nearest one winning, which is the whole
      // reason to turn this down at a junction.
      seaming.depthWrite = value >= 1;
      seaming.needsUpdate = true;
    });

  const readout = gui.addFolder("Readout");
  readout.add(params, "pitch").name("Pitch").listen().disable();
  readout.add(params, "hip").name("Hip").listen().disable();
  readout.add(params, "seat").name("Seat").listen().disable();
  readout.add(params, "fit").name("Fit").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    roofing.dispose();
    seaming.dispose();
    masonry.dispose();
    wire.dispose();
    dispose();
  };
}

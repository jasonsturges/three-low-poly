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
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Hip Seams",
  description:
    "STUDY — a pyramid roof is a tent until its joints are covered. Four planes meeting at an apex leave " +
    "four HIPS, and on a real roof every one is a seam that has to be capped or the water gets in. " +
    "Modelling that cap — a raised member riding each hip — is what turns a cone into a built object, and " +
    "it costs four boxes. The roof is the port; the SEAM is the subject. " +
    "The whole difficulty is which way a cap FACES, and the answer is that it is not a choice. A seam is " +
    "defined by the two planes it covers, and it seats on the bisector of the angle between them — " +
    "`normalize(n1 + n2)`, taken from the roof's own face normals so the cap cannot disagree with the roof " +
    "it sits on. Nothing else in the scene gets a vote. Roll is therefore DERIVED, and the Roll Offset " +
    "dial turns the cap away from its seated angle rather than setting it. " +
    "Two wrong answers are kept alongside it, because both are easy to reach for and one is genuinely " +
    "hard to catch. MINIMAL ROTATION — the shortest turn from UP onto the hip — is underdetermined, and " +
    "resolves its leftover roll against a world axis that has never heard of the roof; it lands 45° to " +
    "135° out. CORNER OUTWARD borrows the corner's horizontal direction, and is the interesting failure: " +
    "on a SQUARE plan that direction lies in a genuine mirror plane of the roof, so it is exactly right " +
    "and looks authoritative. Take the plan off square and the two planes at each hip no longer have equal " +
    "pitch, the mirror is gone, and it drifts — 1.4° at 3.4 x 3.6, 12.6° at 4.4 x 2.6, 27.7° at 6 x 1.5. " +
    "Seat reports the error against the true bisector, which is the measurement that matters: four seams " +
    "can agree with each other perfectly and still all be wrong together. " +
    "The apex is left as it falls. Four caps converging on one point interpenetrate, and that overlap is " +
    "precisely the hole a FINIAL exists to fill — a finial is a joint cover, not ornament, the same thing " +
    "the quoin turned out to be at a wall corner.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  HIP        the sloping joint where two roof planes meet, running from eave up to the apex or ridge.
//             Always SHALLOWER than the planes it joins, because it travels the diagonal — which is why a
//             hipped roof reads longer and lazier than its own pitch suggests. Both are in the readout.
//  RIDGE      the HORIZONTAL joint at the top, where two planes meet each other rather than converge.
//             A square-plan pyramid has none: its ridge has shrunk to a point.
//  EAVE       the lower edge, oversailing the wall so water is thrown clear of it rather than running
//             down the masonry. The OVERHANG is that oversail.
//  APEX       where a pyramid's hips converge. Four seams arriving at one point is a JOIN, and it is
//             unresolved here on purpose.
//  DIHEDRAL   the angle between two planes at their shared edge. A seam's seating is its BISECTOR, and
//             that is the entire orientation problem, correctly stated.
//  PITCH      the slope. Quoted as an angle here; a roofer would quote a rise over a run.
//  HIP CAP /  the member covering a hip. In metalwork a standing seam, in tile a hip roll, in lead a
//  HIP ROLL   roll proper. All the same move: bridge the joint with something raised.
//  PAVILION   a hipped roof on a square plan — a pyramid. The strict name for what this study builds.
//
//  Deliberately NOT here: pinnacles, finials, cornice. They cap a mass and they belong to the terminators
//  question, which wants its own study. The roof had to be isolated first.

type Construction = "bisector" | "outward" | "minimal";

const UP = new Vector3(0, 1, 0);

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
 *
 * Non-indexed, so every plane keeps its own normals and shades flat.
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
const seating = (planes: [Vector3, Vector3]): Vector3 =>
  planes[0].clone().add(planes[1]).normalize();

/**
 * The frame for a seam riding one joint, by each of the three constructions.
 *
 * `bisector` seats the cap on the dihedral, from the roof's own normals. Correct at any plan.
 *
 * `outward` borrows the corner's HORIZONTAL direction and projects it perpendicular to the hip. On a
 * square plan that direction lies in a real mirror plane of the roof and the projection lands exactly on
 * the bisector — which is why it looks authoritative and why the error is easy to ship. Off square, the
 * two planes at a hip have different pitches, the mirror is gone, and the cap tips.
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

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x11141a,
    cameraPosition: [6.2, 4.4, 7.0],
  });

  controls.target.set(0, 2.2, 0);
  controls.update();

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
  });
  const masonry = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 3.6,
    depth: 3.6,
    rise: 2.8,
    overhang: 0.16,

    seams: true,
    seamWidth: 0.11,
    seamThickness: 0.075,
    rollOffset: 0,
    construction: "bisector" as Construction,

    wall: true,
    wallHeight: 2.4,
    wireframe: false,

    pitch: "",
    hip: "",
    seat: "",
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
    if (params.seams) {
      const parts: BufferGeometry[] = [];
      const direction = new Vector3();
      const position = new Vector3();
      const scale = new Vector3();
      const roll = new Quaternion();
      const matrix = new Matrix4();

      for (const joint of roof.joints) {
        // From the eave corner up to the apex. Its LENGTH is the seam's length, which is why the seam
        // never has to be told how long it is.
        direction.subVectors(joint.to, joint.from);
        const length = direction.length();
        if (length < 1e-6) continue;
        direction.divideScalar(length);

        const orientation = seamFrame(direction, joint, params.construction);
        // An OFFSET from the seated angle, applied after the frame is chosen. At 0 the cap sits square on
        // the joint; the dial turns it away from that, and does not decide it.
        roll.setFromAxisAngle(direction, (params.rollOffset * Math.PI) / 180);
        orientation.premultiply(roll);

        position.addVectors(joint.from, joint.to).multiplyScalar(0.5);
        position.y += base;
        scale.set(params.seamWidth, length, params.seamThickness);

        const seam = new BoxGeometry(1, 1, 1);
        seam.applyMatrix4(matrix.compose(position, orientation, scale));
        parts.push(seam);

        // How far the cap's face has ended up from the bisector it should be seated on. This is a
        // CORRECTNESS measure, unlike agreement between the four seams — they can agree and all be wrong.
        // Measured before the offset, since the offset is a deliberate departure rather than an error.
        const seated = seamFrame(direction, joint, params.construction);
        const face = new Vector3(0, 0, 1).applyQuaternion(seated);
        const truth = seating(joint.planes);
        errors.push((Math.acos(Math.min(1, Math.abs(face.dot(truth)))) * 180) / Math.PI);
      }

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
    const hipLength = Math.hypot(halfWidth, halfDepth, R);

    params.pitch =
      Math.abs(acrossWidth - acrossDepth) < 0.05
        ? `${acrossWidth.toFixed(1)}° all round`
        : `${acrossDepth.toFixed(1)}° across width · ${acrossWidth.toFixed(1)}° across depth`;
    params.hip = `${hipPitch.toFixed(1)}° · ${hipLength.toFixed(2)} long — shallower than either plane`;

    if (errors.length === 0) {
      params.seat = "no seams";
    } else {
      const worst = Math.max(...errors);
      params.seat =
        worst < 0.005
          ? `seated — 0.00° off the bisector on all ${errors.length} hips`
          : `${worst.toFixed(2)}° OFF the bisector — the caps are tipped`;
    }
  };
  rebuild();

  const gui = new GUI();
  gui.title("Hip Seams");

  const seam = gui.addFolder("Seams");
  // The whole point of the study. Off, it is a tent; on, it is a roof.
  seam.add(params, "seams").name("Show Seams").onChange(rebuild);
  seam.add(params, "seamWidth", 0.02, 0.4, 0.005).name("Seam Width").onChange(rebuild);
  seam.add(params, "seamThickness", 0.02, 0.3, 0.005).name("Seam Thickness").onChange(rebuild);
  // An OFFSET, not the roll itself: the seated angle is derived from the joint, and this turns the cap
  // away from it. 0 sits square on the hip; 45 stands it on edge as a crest.
  seam.add(params, "rollOffset", -90, 90, 1).name("Roll Offset").onChange(rebuild);
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

  const readout = gui.addFolder("Readout");
  readout.add(params, "pitch").name("Pitch").listen().disable();
  readout.add(params, "hip").name("Hip").listen().disable();
  readout.add(params, "seat").name("Seat").listen().disable();
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

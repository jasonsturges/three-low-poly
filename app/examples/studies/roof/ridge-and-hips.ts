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
  title: "Ridge and Hips",
  description:
    "STUDY — the pyramid's apex, stretched into a line. Take a hipped roof off a square plan and the point " +
    "where four planes met becomes a RIDGE where two planes meet each other and two more run up to its " +
    "ends. That single length is the study. " +
    "It is NOT a free parameter. If every plane is to carry the same pitch — which is what a roof wants, " +
    "since one pitch is one detail repeated rather than four details reconciled — the ridge can only be " +
    "`width - depth`. Nothing else is available. The overhang cancels out of that entirely, which is worth " +
    "knowing: eaves change where the roof ENDS, never what it IS. Drag Ridge Length and the readout says " +
    "what you have made, and Snap to Equal Pitch puts it back. " +
    "Held loose, that one length walks the whole family: 0 is a PYRAMID, `width - depth` the equal-pitch " +
    "HIP, and full length a GABLE — where the end plane does not vanish so much as stand up, going " +
    "vertical and becoming the gable WALL. Three roof types are one number. " +
    "This roof is also what proves the seam seating, because it is the case that breaks the shortcut. A " +
    "cap seats on the bisector of the two planes it covers — and here a hip joins a long slope to a hip " +
    "END, two planes at genuinely different pitches, so there is no mirror to borrow and no way to guess " +
    "it from the corner. Taking `normalize(n1 + n2)` from the roof's own face normals is right at every " +
    "ridge length; the corner's outward direction is 18.7° out at the default and worse as the plan " +
    "stretches. The RIDGE is the reassuring case: its two planes are mirror images, so their bisector is " +
    "exactly UP, and it was the one joint that always looked correct. " +
    "The junctions have not been solved, only divided: the pyramid's single 4-way apex has become two " +
    "3-way junctions, one at each end of the ridge, still uncovered and still waiting on a terminator.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  RIDGE       the horizontal joint at the top, where two planes meet FACE TO FACE rather than converge on
//              a point. A pyramid's ridge has length zero — the same roof with the number turned down.
//  HIP         the sloping joint from an eave corner up to a ridge end. Four of them, and each one is
//              shallower than both planes it joins, because it climbs the same rise along a diagonal run.
//  HIP END     the triangular plane at the short end of the roof, between two hips. Its pitch is set by
//              how far the ridge stops short of the eave, which is what makes ridge length a PITCH
//              decision wearing a length's clothing.
//  GABLE       what the hip end becomes when the ridge runs the full length: it stands vertical, and a
//              vertical roof plane is a WALL. The roof loses a surface and the building gains one.
//  EQUAL PITCH every plane at the same slope. The default a roofer wants — one flashing detail, one cut
//              angle, one set of tiles — and the constraint that fixes the ridge at `width - depth`.
//  DIHEDRAL    the angle between two planes at their shared edge. A seam seats on its BISECTOR.
//  RIDGE CAP   the member covering the ridge, as a hip cap covers a hip. Same move, different joint.
//  RUN / RISE  a roofer quotes pitch as rise over run. Angles here, because a study is read not built.
//
//  Still deliberately absent: finials, pinnacles, cornice. The two junctions this roof leaves open are the
//  argument for them, not the place to solve them.

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
  label: string;
}

interface Roof {
  geometry: BufferGeometry;
  joints: Joint[];
}

const area = (a: Vector3, b: Vector3, c: Vector3): number =>
  new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).length();

/**
 * The roof planes and the joints between them, derived together.
 *
 * Two trapezoid slopes along the ridge and a triangular hip end at each short end, with every face's
 * normal taken from the drawn triangle and handed to the joints that border it. That is what makes the
 * seating trustworthy here: a hip on this roof joins two planes of genuinely DIFFERENT pitch, so its
 * bisector cannot be inferred from the plan — it has to come from the faces themselves.
 *
 * At ridge zero the triangles spanning the ridge have no area, and a zero-area triangle contributes a
 * zero-length normal, which lights as solid black rather than as nothing. They are dropped, leaving
 * exactly the four planes of a pyramid — which is what that roof is.
 */
const buildRoof = (halfWidth: number, halfDepth: number, rise: number, ridge: number): Roof => {
  const c0 = new Vector3(-halfWidth, 0, -halfDepth);
  const c1 = new Vector3(halfWidth, 0, -halfDepth);
  const c2 = new Vector3(halfWidth, 0, halfDepth);
  const c3 = new Vector3(-halfWidth, 0, halfDepth);
  const r0 = new Vector3(-ridge / 2, rise, 0);
  const r1 = new Vector3(ridge / 2, rise, 0);

  // Four PLANES, each wound so its normal comes out up and outward. A plane's normal is taken from its
  // first triangle with real area, so the ridge collapsing cannot take a normal down with it.
  const planes: { triangles: Vector3[][]; normal: Vector3 }[] = [
    { triangles: [[c0, r0, r1], [c0, r1, c1]], normal: new Vector3() }, // the -Z slope
    { triangles: [[c2, r1, r0], [c2, r0, c3]], normal: new Vector3() }, // the +Z slope
    { triangles: [[c3, r0, c0]], normal: new Vector3() }, // the -X hip end
    { triangles: [[c1, r1, c2]], normal: new Vector3() }, // the +X hip end
  ];

  const kept: Vector3[][] = [];
  for (const plane of planes) {
    const solid = plane.triangles.filter(([a, b, c]) => area(a!, b!, c!) > 1e-9);
    plane.normal
      .subVectors(solid[0]![1]!, solid[0]![0]!)
      .cross(new Vector3().subVectors(solid[0]![2]!, solid[0]![0]!))
      .normalize();
    kept.push(...solid);
  }

  const positions = new Float32Array(kept.length * 9);
  kept.forEach((triangle, i) =>
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)),
  );

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const [negZ, posZ, negX, posX] = planes.map((p) => p.normal) as [Vector3, Vector3, Vector3, Vector3];
  const hip = (corner: Vector3, to: Vector3, pair: [Vector3, Vector3]): Joint => ({
    from: corner.clone(),
    to: to.clone(),
    planes: pair,
    outward: new Vector3(corner.x, 0, corner.z).normalize(),
    label: "hip",
  });

  const joints: Joint[] = [
    hip(c0, r0, [negZ, negX]),
    hip(c1, r1, [negZ, posX]),
    hip(c2, r1, [posZ, posX]),
    hip(c3, r0, [posZ, negX]),
  ];

  // The ridge, only when it has length — at zero this is a pyramid and there is no joint here to cover.
  if (ridge > 1e-6) {
    joints.push({
      from: r0.clone(),
      to: r1.clone(),
      // Two mirror-image slopes, so this bisector comes out exactly UP with no special case for it.
      planes: [negZ, posZ],
      // A ridge has no corner to borrow from. UP is the honest stand-in, and here it happens to be right —
      // which is why this was the one joint the corner construction never got wrong.
      outward: UP.clone(),
      label: "ridge",
    });
  }

  return { geometry, joints };
};

/**
 * Where a seam should FACE — the bisector of the two planes it covers.
 *
 * Automatically perpendicular to the joint, because the joint lies in both planes and is therefore
 * perpendicular to both normals. So it can serve directly as a frame axis.
 */
const seating = (planes: [Vector3, Vector3]): Vector3 => planes[0].clone().add(planes[1]).normalize();

/**
 * The frame for a seam riding one joint, by each of the three constructions.
 *
 * `bisector` seats the cap on the dihedral, from the roof's own normals. Correct at any plan and any ridge
 * length, including the ridge itself.
 *
 * `outward` borrows the corner's HORIZONTAL direction. Right only where that direction happens to lie in a
 * mirror plane of the roof — true on a square-plan pyramid, and false on every hip here, because a slope
 * and a hip end do not share a pitch.
 *
 * `minimal` takes the shortest rotation carrying UP onto the seam and resolves the leftover roll against a
 * world axis that has never heard of the roof.
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
    cameraPosition: [7.4, 4.6, 8.2],
  });

  controls.target.set(0, 2.0, 0);
  controls.update();

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(4, 6, 3.5);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-3.5, 0.5, -2.5);
  scene.add(key, bounce);

  const roofing = new MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.62,
    metalness: 0.32,
    flatShading: true,
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
    width: 4.4,
    depth: 2.6,
    rise: 2.0,
    overhang: 0.16,
    ridgeLength: 1.8,

    showSeams: true,
    seamWidth: 0.11,
    seamThickness: 0.075,
    rollOffset: 0,
    construction: "bisector" as Construction,

    wall: true,
    wallHeight: 2.2,
    wireframe: false,

    ridge: "",
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

  /** The only ridge length that puts every plane at the same pitch. The overhang cancels out of it. */
  const equalPitchRidge = () => Math.max(0, params.width - params.depth);

  const rebuild = () => {
    clear();

    const { width: W, depth: D, rise: R, overhang, wallHeight: base } = params;
    const halfWidth = W / 2 + overhang;
    const halfDepth = D / 2 + overhang;
    // A ridge cannot outrun its own eaves; past that the hip ends would invert.
    const ridge = Math.max(0, Math.min(params.ridgeLength, halfWidth * 2));

    if (params.wall) {
      const wall = new Mesh(new BoxGeometry(W, base, D), masonry);
      wall.position.y = base / 2;
      stage.add(wall);
    }

    const roof = buildRoof(halfWidth, halfDepth, R, ridge);
    roof.geometry.translate(0, base, 0);
    stage.add(new Mesh(roof.geometry, roofing));

    const errors: number[] = [];
    if (params.showSeams) {
      const parts: BufferGeometry[] = [];
      const direction = new Vector3();
      const position = new Vector3();
      const scale = new Vector3();
      const roll = new Quaternion();
      const matrix = new Matrix4();

      for (const joint of roof.joints) {
        direction.subVectors(joint.to, joint.from);
        const length = direction.length();
        if (length < 1e-6) continue;
        direction.divideScalar(length);

        const seated = seamFrame(direction, joint, params.construction);
        const orientation = seated.clone();
        // An OFFSET from the seated angle. At 0 the cap sits square on the joint; the dial turns it away
        // from that, and does not decide it.
        roll.setFromAxisAngle(direction, (params.rollOffset * Math.PI) / 180);
        orientation.premultiply(roll);

        position.addVectors(joint.from, joint.to).multiplyScalar(0.5);
        position.y += base;
        scale.set(params.seamWidth, length, params.seamThickness);

        const seam = new BoxGeometry(1, 1, 1);
        seam.applyMatrix4(matrix.compose(position, orientation, scale));
        parts.push(seam);

        // How far the cap's face ends up from the bisector it should be seated on — a CORRECTNESS measure,
        // taken before the offset, since the offset is a deliberate departure rather than an error.
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

    // The two pitches the ridge length arbitrates between. The long planes climb the rise over the depth;
    // the hip ends climb the SAME rise over whatever the ridge left them.
    const mainPitch = (Math.atan2(R, halfDepth) * 180) / Math.PI;
    const endRun = halfWidth - ridge / 2;
    const endPitch = endRun < 1e-6 ? 90 : (Math.atan2(R, endRun) * 180) / Math.PI;
    const hipPitch = (Math.atan2(R, Math.hypot(endRun, halfDepth)) * 180) / Math.PI;

    const equal = equalPitchRidge();
    params.ridge =
      ridge < 1e-6
        ? `0.00 — PYRAMID, apex is a point`
        : endRun < 1e-6
          ? `${ridge.toFixed(2)} — GABLE, the ends have stood up into walls`
          : Math.abs(ridge - equal) < 0.005
            ? `${ridge.toFixed(2)} — equal-pitch HIP (width - depth)`
            : `${ridge.toFixed(2)} — hip, unequal pitch · equal wants ${equal.toFixed(2)}`;

    params.pitch =
      Math.abs(mainPitch - endPitch) < 0.05
        ? `${mainPitch.toFixed(1)}° on every plane`
        : `${mainPitch.toFixed(1)}° long slopes · ${endPitch.toFixed(1)}° hip ends — they disagree`;
    params.hip = `${hipPitch.toFixed(1)}° · ${roof.joints.length} joints, ${roof.joints.filter((j) => j.label === "hip").length} hips`;

    if (errors.length === 0) {
      params.seat = "no seams";
    } else {
      const worst = Math.max(...errors);
      params.seat =
        worst < 0.005
          ? `seated — 0.00° off the bisector on all ${errors.length} seams`
          : `${worst.toFixed(2)}° OFF the bisector — the caps are tipped`;
    }
  };
  rebuild();

  const gui = new GUI();
  gui.title("Ridge and Hips");

  const ridgeFolder = gui.addFolder("Ridge");
  // The study. 0 is a pyramid, `width - depth` the equal-pitch hip, full length a gable.
  const ridgeControl = ridgeFolder
    .add(params, "ridgeLength", 0, 10, 0.05)
    .name("Ridge Length")
    .onChange(rebuild);
  ridgeFolder
    .add(
      {
        snap: () => {
          params.ridgeLength = equalPitchRidge();
          ridgeControl.updateDisplay();
          rebuild();
        },
      },
      "snap",
    )
    .name("Snap to Equal Pitch");
  ridgeFolder.open();

  const form = gui.addFolder("Roof");
  form.add(params, "width", 1, 9, 0.1).name("Width").onChange(rebuild);
  form.add(params, "depth", 1, 9, 0.1).name("Depth").onChange(rebuild);
  form.add(params, "rise", 0.4, 6, 0.1).name("Rise").onChange(rebuild);
  // Changes where the roof ends, never what it is — the equal-pitch ridge is the same either way.
  form.add(params, "overhang", 0, 0.8, 0.01).name("Overhang").onChange(rebuild);
  form.open();

  const seam = gui.addFolder("Seams");
  seam.add(params, "showSeams").name("Show Seams").onChange(rebuild);
  seam.add(params, "seamWidth", 0.02, 0.4, 0.005).name("Seam Width").onChange(rebuild);
  seam.add(params, "seamThickness", 0.02, 0.3, 0.005).name("Seam Thickness").onChange(rebuild);
  // An OFFSET from the seated angle, which is derived. 0 sits square on the joint.
  seam.add(params, "rollOffset", -90, 90, 1).name("Roll Offset").onChange(rebuild);
  seam.open();

  const construction = gui.addFolder("Seating");
  // Every hip here joins two planes of different pitch, so this roof tells the constructions apart at any
  // setting — unlike a square pyramid, where the first two agree exactly.
  construction
    .add(params, "construction", {
      "Dihedral Bisector": "bisector",
      "Corner Outward": "outward",
      "Minimal Rotation": "minimal",
    })
    .name("Construction")
    .onChange(rebuild);
  construction.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wall").name("Wall").onChange(rebuild);
  inspect.add(params, "wallHeight", 0.5, 5, 0.1).name("Wall Height").onChange(rebuild);
  inspect.add(params, "wireframe").name("Seam Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "ridge").name("Ridge").listen().disable();
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

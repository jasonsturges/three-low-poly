import GUI from "lil-gui";
import {
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import { cutEnd, cutEndGeometry, miterPlane, type CutPlane } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Trihedral Corner",
  description:
    "STUDY — THREE members meeting at a point, each cut to fit the other two. A TRIHEDRAL CORNER in " +
    "geometry; a 3-WAY COMPOUND MITER at the saw, because no piece can be cut with a single flat setting. " +
    "Every member ends in the same shape: two facets meeting at a ridge, an arrowhead reaching into the " +
    "joint — which is a HIP END, so the construction from that study carries over untouched. " +
    "The result is better than expected, and it is worth stating precisely because it contradicts the " +
    "obvious guess. ANGLE ASYMMETRY IS NOT WHAT BREAKS A TRIHEDRAL MITER. Three members at wholly " +
    "arbitrary directions close to 2e-16 — the wedges here run 107°/107°/146° and it still shuts — " +
    "provided the cut plane is a MIRROR of the whole member — axis, roll AND section together. " +
    "That is the condition, and it is worth stating exactly, because the shorthands for it are wrong. " +
    "\"Same section and one shared roll\" is sufficient but NOT necessary: a SQUARE section is invariant " +
    "under a quarter turn, so it absorbs exactly that much roll disagreement and closes anyway. Set " +
    "Thickness equal to Width and Seating stops mattering; make them differ and the same 90 degrees of " +
    "disagreement reopens a 0.06 step. A symmetric section can swallow a roll difference matching its own " +
    "symmetry, and nothing else can. " +
    "The shared axis is the CONE axis, the one every member makes the same angle with, found as the vector " +
    "perpendicular to every DIFFERENCE of member directions. Any three directions admit one, which is " +
    "exactly why a THREE-way junction is always solvable and a four-way generally is not — see the " +
    "Junction study, where that same condition decides whether the cuts tile at all. " +
    "The reason this matters beyond joinery: the roof studies cannot use it. A roof cap seats on the " +
    "bisector of the two planes IT covers, so at a ridge end the ridge cap is rolled 44.1° away from the " +
    "hips; and its thickness is DERIVED from its own dihedral, coming out 0.146 against the hips' 0.099. " +
    "Both conditions fail, for reasons that are not adjustable — they are what makes a cap sit on the roof " +
    "in the first place. Switch Seating to Per-member and Section to Mismatched and the readout puts a " +
    "number on it. That is the honest finding: a hip-and-ridge junction is NOT a trihedral miter, and the " +
    "trades appear to have known — a Y-ridge cap is a separate pressed piece, and a King Post " +
    "intersection is a block, not three cuts.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  TRIHEDRAL    three planes meeting at a single vertex. The general name for this corner, and the frame
//  CORNER       the compound-miter angles are derived in.
//  COMPOUND     a cut needing TWO settings — a miter angle across the face and a bevel through the
//  MITER        thickness — because the members do not share a plane. Every cut here is one.
//  CONE AXIS    the axis every member makes the same angle with. Perpendicular to every difference of
//               member directions. Any three directions have one; four usually do not.
//  SEAM         where two members' surfaces meet. For members related by a mirror it lies in the plane
//               bisecting their axes, which is why that simpler construction works — when it works.
//  SECTION      the cross-section, CENTRED on the member's axis here. Centring matters: a section offset
//               to one side displaces each member along its own roll, so members rolled differently end up
//               translated as well as turned, and the joint fails in a way that looks like bad placement
//               rather than bad seating.
//  HIP END      an end bounded by TWO planes rather than one. What every member here has.
//  ARROWHEAD    the end shape from stopping at the FIRST bounding plane met.
//  COPE         cutting a member to the SURFACE of its neighbour instead of to a plane. The fallback when
//               a miter cannot close, and what a ridge cap has to do against a pair of hips.

type Seating = "common" | "own";
type Rig = "cube" | "ridge";

/** One member arriving at the corner. `away` points from the vertex back down the member. */
interface Member {
  away: Vector3;
  /** The member's OWN preferred roll — its dihedral bisector on a roof, or a naive world-up elsewhere. */
  own: Vector3;
  width: number;
  thickness: number;
  color: number;
  name: string;
}

/**
 * THE CONE AXIS — the one every member makes the same angle with, when it exists.
 *
 * Every cut normal is a difference `a_i - a_j`, and `(a_i - a_j) . L = 0` exactly when `a_i . L = a_j . L`.
 * So the axis is whatever is perpendicular to every difference between member directions. With three
 * members there are two differences, and two vectors always have a common perpendicular — **which is why
 * a trihedral corner always has one, and why this study is about three and not four.**
 *
 * Note this is NOT the average of the member directions. The average is a different vector and using it
 * will report a corner as broken while every other measurement says it is fine.
 */
const coneAxis = (list: Member[]): Vector3 => {
  const base = list[0]!.away;
  const differences = list.slice(1).map((m) => m.away.clone().sub(base));
  const axis = new Vector3().crossVectors(differences[0]!, differences[1]!).normalize();
  if (axis.dot(base) > 0) axis.negate();
  return axis;
};

/** The outward normal of a roof face, wound so it comes out up and away from the mass. */
const faceNormal = (a: Vector3, b: Vector3, c: Vector3) =>
  new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 1.15, 1.75],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(1.2, 1.8, 1.4);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-1.2, -0.3, -1);
  scene.add(key, bounce);

  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const materials = new Map<number, MeshStandardMaterial>();
  const materialFor = (color: number) => {
    let material = materials.get(color);
    if (!material) {
      material = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, flatShading: true, side: DoubleSide });
      materials.set(color, material);
    }
    return material;
  };

  const params = {
    rig: "cube" as Rig,
    seating: "common" as Seating,
    width: 0.13,
    thickness: 0.08,
    mismatch: 0,
    length: 0.8,
    opacity: 1,
    wireframe: false,

    closure: "",
    cone: "",
    wedges: "",
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

  const PALETTE = [0xd98f4f, 0x6fa8c7, 0x9fc46f];

  /** The three members, for whichever rig is selected. */
  const members = (): Member[] => {
    const thick = (i: number) => params.thickness * (i === 2 ? 1 + params.mismatch : 1);

    if (params.rig === "cube") {
      // Three mutually perpendicular members — the reference case, and a genuine trihedral corner.
      // Their "own" roll is a naive world-up, which is what breaks it when Seating is Per-member.
      return [
        { away: new Vector3(1, 0, 0), own: new Vector3(0, 1, 0), width: params.width, thickness: thick(0), color: PALETTE[0]!, name: "A" },
        { away: new Vector3(0, 0, 1), own: new Vector3(0, 1, 0), width: params.width, thickness: thick(1), color: PALETTE[1]!, name: "B" },
        { away: new Vector3(0, 1, 0), own: new Vector3(1, 0, 0), width: params.width, thickness: thick(2), color: PALETTE[2]!, name: "C" },
      ];
    }

    // The roof's own RIDGE END, from `studies/roof/ridge-and-hips` at its defaults, vertex at the origin.
    // Each member's "own" roll is a REAL dihedral bisector — which is the thing that cannot be given up,
    // because it is what makes a cap rest on the roof along its length.
    const halfWidth = 4.4 / 2 + 0.16;
    const halfDepth = 2.6 / 2 + 0.16;
    const rise = 2.0;
    const ridge = 1.8;
    const end = new Vector3(ridge / 2, rise, 0);
    const negZ = faceNormal(
      new Vector3(-halfWidth, 0, -halfDepth),
      new Vector3(-ridge / 2, rise, 0),
      new Vector3(halfWidth, 0, -halfDepth),
    );
    const posZ = new Vector3(negZ.x, negZ.y, -negZ.z);
    const posX = new Vector3(rise, halfWidth - ridge / 2, 0).normalize();

    const at = (target: Vector3, planes: [Vector3, Vector3], i: number, name: string): Member => ({
      away: target.clone().sub(end).normalize(),
      own: planes[0].clone().add(planes[1]).normalize(),
      width: params.width,
      thickness: thick(i),
      color: PALETTE[i]!,
      name,
    });

    return [
      at(new Vector3(halfWidth, 0, -halfDepth), [negZ, posX], 0, "hip -Z"),
      at(new Vector3(halfWidth, 0, halfDepth), [posZ, posX], 1, "hip +Z"),
      at(new Vector3(-ridge / 2, rise, 0), [negZ, posZ], 2, "ridge"),
    ];
  };

  /** Where the member's INFINITE prism crosses a plane through the vertex — its cut face, as 4 points. */
  const faceOn = (member: Member, up: Vector3, normal: Vector3, length: number) => {
    const forward = member.away.clone().negate();
    const across = new Vector3().crossVectors(forward, up).normalize();
    const origin = member.away.clone().multiplyScalar(length);
    const half = member.width / 2;
    return (
      [
        [-half, -member.thickness / 2],
        [half, -member.thickness / 2],
        [half, member.thickness / 2],
        [-half, member.thickness / 2],
      ] as [number, number][]
    ).map(([s, t]) => {
      const p = origin.clone().addScaledVector(across, s).addScaledVector(up, t);
      return p.clone().addScaledVector(forward, -p.dot(normal) / forward.dot(normal));
    });
  };

  const rebuild = () => {
    clear();
    const vertex = new Vector3(0, 0, 0);
    const list = members();
    const axis = coneAxis(list);

    // Cyclic order about the cone axis — "next neighbour" is only meaningful as an angle about some axis.
    const reference = Math.abs(new Vector3(1, 0, 0).dot(axis)) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    const u = new Vector3().crossVectors(axis, reference).normalize();
    const v = new Vector3().crossVectors(axis, u);
    const ordered = [...list].sort(
      (a, b) => Math.atan2(a.away.dot(v), a.away.dot(u)) - Math.atan2(b.away.dot(v), b.away.dot(u)),
    );

    /**
     * The member's roll. COMMON takes it from the cone axis, which is what makes adjacent members mirror
     * images across their cut plane — the cut planes contain that axis, so the mirror maps one member's
     * roll onto the other's. OWN takes each member's own preference, and the mirror no longer holds.
     */
    const rollOf = (m: Member) => {
      const forward = m.away.clone().negate();
      const source = params.seating === "common" ? axis : m.own;
      return source.clone().addScaledVector(forward, -source.dot(forward)).normalize();
    };

    const wedges: number[] = [];
    let worst = 0;

    for (let i = 0; i < ordered.length; i++) {
      const member = ordered[i]!;
      const previous = ordered[(i + 2) % 3]!;
      const next = ordered[(i + 1) % 3]!;
      const forward = member.away.clone().negate();
      const up = rollOf(member);
      const across = new Vector3().crossVectors(forward, up).normalize();

      const planes: [CutPlane, CutPlane] = [
        miterPlane(vertex, member.away, previous.away),
        miterPlane(vertex, member.away, next.away),
      ];
      wedges.push(180 - (Math.acos(Math.max(-1, Math.min(1, planes[0].normal.dot(planes[1].normal)))) * 180) / Math.PI);

      const origin = vertex.clone().addScaledVector(member.away, params.length);
      const half = member.width / 2;
      const ring = (
        [
          [-half, -member.thickness / 2],
          [half, -member.thickness / 2],
          [half, member.thickness / 2],
          [-half, member.thickness / 2],
        ] as [number, number][]
      ).map(([s, t]) => origin.clone().addScaledVector(across, s).addScaledVector(up, t));

      const geometry = cutEndGeometry(cutEnd(ring, forward, planes), forward);
      const material = materialFor(member.color);
      material.transparent = params.opacity < 1;
      material.opacity = params.opacity;
      material.depthWrite = params.opacity >= 1;
      stage.add(new Mesh(geometry, material));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

      // CLOSURE — do this member's cut face and its neighbour's coincide on the plane they share? That is
      // the whole question, and it is a distance rather than an opinion.
      const mine = faceOn(member, up, planes[1].normal, params.length);
      const theirs = faceOn(next, rollOf(next), planes[1].normal, params.length);
      for (const p of mine) worst = Math.max(worst, Math.min(...theirs.map((q) => p.distanceTo(q))));
      for (const p of theirs) worst = Math.max(worst, Math.min(...mine.map((q) => p.distanceTo(q))));
    }

    const total = wedges.reduce((sum, w) => sum + w, 0);
    params.wedges = `${wedges.map((w) => w.toFixed(1)).join("° · ")}° = ${total.toFixed(1)}°`;
    params.cone = `axis [${axis.toArray().map((n) => n.toFixed(3)).join(", ")}] · every member ${((Math.acos(Math.max(-1, Math.min(1, ordered[0]!.away.dot(axis)))) * 180) / Math.PI).toFixed(1)}° off it`;
    params.closure =
      worst < 1e-9
        ? `CLOSES — faces coincide to ${worst.toExponential(1)}`
        : `STEP of ${worst.toFixed(4)} — the faces do not meet`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centred without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Trihedral Corner");

  const rig = gui.addFolder("Corner");
  // Cube Corner is three mutually perpendicular members. Ridge End is the roof's, and is the case that
  // fails — for reasons that are properties of a roof cap rather than choices.
  rig.add(params, "rig", { "Cube Corner": "cube", "Roof Ridge End": "ridge" }).name("Rig").onChange(rebuild);
  rig.open();

  const conditions = gui.addFolder("Closure Conditions");
  // The two things a trihedral miter needs. Angles are NOT among them — arbitrary directions close.
  conditions
    .add(params, "seating", { "Common (cone axis)": "common", "Per-member (own)": "own" })
    .name("Seating")
    .onChange(rebuild);
  // Thicken the third member only. Any section difference opens a step, whatever the angles do.
  conditions.add(params, "mismatch", 0, 1.5, 0.05).name("Section Mismatch").onChange(rebuild);
  conditions.open();

  const section = gui.addFolder("Section");
  section.add(params, "width", 0.03, 0.35, 0.005).name("Width").onChange(rebuild);
  section.add(params, "thickness", 0.03, 0.35, 0.005).name("Thickness").onChange(rebuild);
  section.add(params, "length", 0.4, 1.4, 0.05).name("Length").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "opacity", 0.15, 1, 0.05).name("Opacity").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "closure").name("Closure").listen().disable();
  readout.add(params, "cone").name("Cone").listen().disable();
  readout.add(params, "wedges").name("Wedges").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    materials.forEach((material) => material.dispose());
    wire.dispose();
    dispose();
  };
}

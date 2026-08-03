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
  title: "Junction",
  description:
    "STUDY — N members meeting at a POINT, and each one mitered against its neighbors. The roof studies " +
    "ran into this at a pyramid apex and again at a ridge end, and it is the same problem both times: a " +
    "member has exactly TWO neighbors in the cyclic order around a junction however many arrive, so " +
    "member count never changes the cut count. Three, four, eight — always two planes per member. That is " +
    "why this is worth building once, in isolation, instead of twice on a roof. " +
    "The cut between two members is the plane through the junction whose normal is `normalize(a1 - a2)`, " +
    "with both axes pointing AWAY down their own member. Adjacent members are handed the SAME plane from " +
    "opposite sides, so they abut with no gap by construction rather than by tuning. Cutting a member by " +
    "two of them is exactly the HIP END problem — an end bounded by two planes, not one — so the " +
    "construction is borrowed wholesale: run every ring point down the axis, let it stop at whichever " +
    "plane it meets FIRST, and split the ring exactly where consecutive points disagree, or the ridge " +
    "between the two facets comes out smeared instead of sharp. " +
    "The interesting question is whether the cut planes TILE the space around the junction, and the answer " +
    "is a real condition rather than a yes: they share a common axis exactly when the members lie ON A " +
    "CONE about it, since `(a_i - a_j) . L = 0` whenever `a_i . L = a_j . L`. Any THREE directions admit " +
    "such an axis, so a 3-way junction always tiles; a regular n-gon does by symmetry, and its planes come " +
    "out exactly vertical with wedges of exactly 360/n. Four or more IRREGULAR members generally do not, " +
    "and Cone Defect in the readout is what says so — push Skew and watch the wedges stop summing to 360. " +
    "Both rigs are built as REAL ROOFS with the junction moved to the origin — a regular n-gon pyramid, " +
    "and the ridge end lifted from `studies/roof/ridge-and-hips` at its defaults — so every member is " +
    "seated on a genuine dihedral bisector taken from two faces. Each member carries its OWN, which is the " +
    "part that cannot be faked: roll them all off one shared junction axis instead and a symmetric n-gon " +
    "still looks right while the ridge end goes subtly wrong, which is worse than going obviously wrong. " +
    "Miter turned off shows what the roof was doing before: end faces square to each member, all passing " +
    "through the one point, slicing through each other. That is the teeth. Note what mitering does NOT " +
    "fix — with the section offset out along its own axis, the members still splay and leave a dish at the " +
    "center. That is a coverage problem, not a cutting one, and it is what a finial is for.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  JUNCTION    where several members meet at a single POINT. Distinct from a CORNER, where two members
//              meet in a plane — a picture frame is a corner, a roof apex is a junction.
//  MITER       a joint made by cutting both members so a single surface passes through the joint. For
//              EQUAL members it is the angle bisector; for unequal ones it cannot make both pairs of faces
//              meet flush, and something has to step. Turn Skew up with unequal sections to see it.
//  WEDGE       the angular territory one member owns around the junction. They sum to 360 when the cut
//              planes share an axis, and not otherwise.
//  CONE        the condition for that: every member at the same angle to a common axis. THREE directions
//              always lie on one, which is why 3-way junctions are always well behaved.
//  ARROWHEAD   the end shape from stopping at the FIRST plane — the member reaches into the junction and
//              comes to a point. Stopping at the LAST instead notches it, which is the outside corner.
//  SPLIT       the exact division of a ring edge where its two ends choose different planes. Without it
//              the quad straddles both and the ridge rounds off.

/** One member arriving at the junction. `away` points from the junction back down the member. */
interface Member {
  away: Vector3;
  /**
   * Which way is OUT for this member's section — its own dihedral bisector, not the junction's axis.
   *
   * Each member gets its own, because that is what a roof does: a cap seats on the bisector of the two
   * planes IT covers, and at an irregular junction no two members agree about which way that is. Rolling
   * them all off a shared junction axis instead looks right on a symmetric n-gon and wrong everywhere
   * else — and it is exactly the SPLAY between these that leaves a dish no miter can close.
   */
  up: Vector3;
  length: number;
  width: number;
  thickness: number;
  /** How far the section sits out along its own up axis — the roof's caps are offset like this. */
  offset: number;
  color: number;
}

/**
 * THE AXIS every member makes the same angle with — the CONE axis — when one exists.
 *
 * This is the condition for the cut planes to share an axis and the wedges to tile, because every cut
 * normal is a difference `a_i - a_j`, and `(a_i - a_j) . L = 0` exactly when `a_i . L = a_j . L`. So the
 * axis is whatever is perpendicular to every DIFFERENCE between member directions.
 *
 * With `n` members there are `n - 1` independent differences. Two of them always have a common
 * perpendicular, so **any three directions lie on a cone** and a 3-way junction always tiles, however
 * lopsided it looks. From four members up the third difference has to agree as well, and generally does
 * not — `residual` is by how much it fails, and it is the honest measure. Averaging the member directions
 * is NOT this axis and will libel a junction that tiles perfectly well.
 */
const coneAxis = (list: Member[]): { axis: Vector3; residual: number } | null => {
  const base = list[0]!.away;
  const differences = list.slice(1).map((m) => m.away.clone().sub(base));

  let axis: Vector3 | null = null;
  let strongest = 1e-9;
  for (let i = 0; i < differences.length; i++) {
    for (let j = i + 1; j < differences.length; j++) {
      const candidate = new Vector3().crossVectors(differences[i]!, differences[j]!);
      if (candidate.length() > strongest) {
        strongest = candidate.length();
        axis = candidate.clone().normalize();
      }
    }
  }
  if (!axis) return null;

  const residual = Math.max(...differences.map((d) => Math.abs(d.dot(axis!))));
  // Point it OUT of the junction, against the members, so "up" is unambiguous.
  if (axis.dot(base) > 0) axis.negate();
  return { axis, residual };
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.7, 1.35, 2.0],
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
      material = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35, flatShading: true, side: DoubleSide });
      materials.set(color, material);
    }
    return material;
  };

  const params = {
    sides: 4,
    pitch: 48,

    miter: true,
    mode: "min" as "min" | "max",

    width: 0.16,
    thickness: 0.1,
    offset: 0,
    skew: 0,
    unequal: 0,

    opacity: 1,
    wireframe: false,

    wedges: "",
    cone: "",
    tiling: "",
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

  const PALETTE = [0xd98f4f, 0x6fa8c7, 0x9fc46f, 0xc77f9f, 0xc7b96f, 0x7f9fc7, 0xb0785a, 0x6fc7b0];

  /** The outward normal of a roof face, wound so it comes out up and away from the mass. */
  const faceNormal = (a: Vector3, b: Vector3, c: Vector3) =>
    new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();

  /**
   * The members arriving at the junction, for whichever rig is selected.
   *
   * Both rigs are built as REAL ROOFS with the junction moved to the origin, so every member's `up` is a
   * genuine dihedral bisector taken from two faces rather than a plausible-looking vector. That matters:
   * hand-picked directions made the ridge end look almost right, which is worse than looking wrong.
   */
  const members = (): Member[] => {
    const base = { length: 0.85, width: params.width, thickness: params.thickness, offset: params.offset };

    // A regular n-gon PYRAMID with its apex at the origin, built as a REAL roof so that every member is
    // seated on a genuine dihedral bisector taken from two faces. Hip `i` is the joint between face
    // `i - 1` and face `i`, which is the same rule the roof studies use.
    const n = Math.max(3, Math.round(params.sides));
    const apex = new Vector3(0, 0, 0);
    const drop = -Math.tan((params.pitch * Math.PI) / 180);
    const corner = (i: number) => {
      const a = ((i % n) / n) * Math.PI * 2;
      // Skew tilts alternate corners off the cone — the one thing that can stop the cuts sharing an axis.
      // It has to move the ROOF, so the bisectors move with it.
      const lift = drop * (1 + (i % 2 === 0 ? params.skew : -params.skew));
      return new Vector3(Math.cos(a), lift, Math.sin(a));
    };
    const normals = Array.from({ length: n }, (_, i) => faceNormal(corner(i), apex, corner(i + 1)));

    return Array.from({ length: n }, (_, i) => ({
      ...base,
      away: corner(i).clone().normalize(),
      up: normals[(i + n - 1) % n]!.clone().add(normals[i]!).normalize(),
      width: params.width * (1 + (i % 2 === 0 ? params.unequal : 0)),
      color: PALETTE[i % PALETTE.length]!,
    }));
  };

  const rebuild = () => {
    clear();
    const junction = new Vector3(0, 0, 0);
    const list = members();

    // THE JUNCTION AXIS — out of the joint, against the members. Also what the cyclic order is measured
    // around, since "next neighbor" is only meaningful as an angle about some axis.
    //
    // The CONE axis when the members admit one, because that is the axis the cut planes actually share.
    // Only when they do not is there nothing better to do than average the directions.
    const cone = coneAxis(list);
    const axis =
      cone && cone.residual < 1e-6
        ? cone.axis.clone()
        : list.reduce((sum, m) => sum.sub(m.away), new Vector3()).normalize();

    // Cyclic order: project each member onto the plane perpendicular to the axis and sort by angle.
    const reference = new Vector3(1, 0, 0);
    if (Math.abs(reference.dot(axis)) > 0.9) reference.set(0, 0, 1);
    const u = new Vector3().crossVectors(axis, reference).normalize();
    const v = new Vector3().crossVectors(axis, u);
    const ordered = [...list].sort((a, b) => {
      const angle = (m: Member) => Math.atan2(m.away.dot(v), m.away.dot(u));
      return angle(a) - angle(b);
    });

    const wedges: number[] = [];
    const count = ordered.length;

    for (let i = 0; i < count; i++) {
      const member = ordered[i]!;
      const previous = ordered[(i + count - 1) % count]!;
      const next = ordered[(i + 1) % count]!;

      // The member's own frame: down its axis, seated on its OWN bisector. Re-orthogonalized against the
      // axis rather than replaced by anything shared — the bisector is already perpendicular to the joint
      // in exact arithmetic, so this only removes float drift and never changes the seating.
      const forward = member.away.clone().negate();
      const up = member.up.clone().addScaledVector(forward, -member.up.dot(forward)).normalize();
      const across = new Vector3().crossVectors(forward, up).normalize();

      const origin = junction.clone().addScaledVector(member.away, member.length);
      const half = member.width / 2;
      const ring = [
        [-half, member.offset],
        [half, member.offset],
        [half, member.offset + member.thickness],
        [-half, member.offset + member.thickness],
      ].map(([s, t]) => origin.clone().addScaledVector(across, s!).addScaledVector(up, t!));

      const planes: [CutPlane, CutPlane] = [
        miterPlane(junction, member.away, previous.away),
        miterPlane(junction, member.away, next.away),
      ];
      wedges.push(180 - (Math.acos(Math.max(-1, Math.min(1, planes[0].normal.dot(planes[1].normal)))) * 180) / Math.PI);

      // Miter off is the roof's old behavior: an end square to the member, through the junction point.
      const squareEnd: [CutPlane, CutPlane] = [
        { point: junction.clone(), normal: forward.clone().negate() },
        { point: junction.clone(), normal: forward.clone().negate() },
      ];
      const points = cutEnd(ring, forward, params.miter ? planes : squareEnd, { stopAt: params.mode === "min" ? "first" : "last" });

      const geometry = cutEndGeometry(points, forward);
      const material = materialFor(member.color);
      material.transparent = params.opacity < 1;
      material.opacity = params.opacity;
      material.depthWrite = params.opacity >= 1;
      stage.add(new Mesh(geometry, material));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
    }

    // Do the members lie ON A CONE? That is exactly the condition for the cut planes to share an axis and
    // therefore for the wedges to tile. Measured as the residual against the axis perpendicular to every
    // DIFFERENCE of member directions — never against their average, which is a different vector and will
    // libel a 3-way junction that tiles perfectly.
    const total = wedges.reduce((sum, w) => sum + w, 0);
    params.wedges = wedges.map((w) => w.toFixed(1)).join("° · ") + "°";
    params.cone =
      cone && cone.residual < 1e-6
        ? `on a cone — every member ${((Math.acos(Math.max(-1, Math.min(1, ordered[0]!.away.dot(axis)))) * 180) / Math.PI).toFixed(1)}° off its axis`
        : cone
          ? `off the cone by ${cone.residual.toFixed(4)} — no shared axis for the cuts`
          : `degenerate — the members are parallel`;
    params.tiling =
      Math.abs(total - 360) < 0.05
        ? `${total.toFixed(1)}° — the wedges tile the junction`
        : `${total.toFixed(1)}° — does NOT tile, the cut planes have no shared axis`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centered without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Junction");

  const rig = gui.addFolder("Junction");
  // Member count never changes the CUT count — two neighbors whatever n is. That is the whole point.
  rig.add(params, "sides", 3, 12, 1).name("Sides").onChange(rebuild);
  rig.add(params, "pitch", 5, 80, 1).name("Pitch").onChange(rebuild);
  rig.open();

  const cut = gui.addFolder("Miter");
  // Off gives the roof's old apex: every end square to its own member, all through one point, slicing
  // through each other. That is the teeth.
  cut.add(params, "miter").name("Miter").onChange(rebuild);
  // FIRST plane met reaches into the joint and comes to a point; LAST notches it instead.
  cut.add(params, "mode", { "First (arrowhead)": "min", "Last (notch)": "max" }).name("Stop At").onChange(rebuild);
  cut.open();

  const section = gui.addFolder("Section");
  section.add(params, "width", 0.03, 0.5, 0.005).name("Width").onChange(rebuild);
  section.add(params, "thickness", 0.02, 0.3, 0.005).name("Thickness").onChange(rebuild);
  // Push the section OUT along its own axis and the members splay, leaving a dish at the center no miter
  // can close. That is the roof's peak problem, and it is coverage rather than cutting.
  section.add(params, "offset", -0.15, 0.25, 0.005).name("Offset").onChange(rebuild);
  // Make alternate members wider. A miter between UNEQUAL members cannot bring both pairs of faces flush.
  section.add(params, "unequal", 0, 1.5, 0.05).name("Unequal").onChange(rebuild);
  section.open();

  const breakIt = gui.addFolder("Break It");
  // Tilt alternate members off the cone. Three members always find an axis; four or more need not.
  breakIt.add(params, "skew", 0, 0.8, 0.02).name("Skew").onChange(rebuild);
  breakIt.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "opacity", 0.15, 1, 0.05).name("Opacity").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "wedges").name("Wedges").listen().disable();
  readout.add(params, "cone").name("Cone").listen().disable();
  readout.add(params, "tiling").name("Tiling").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    materials.forEach((material) => material.dispose());
    wire.dispose();
    dispose();
  };
}

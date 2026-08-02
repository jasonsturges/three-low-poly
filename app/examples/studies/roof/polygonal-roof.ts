import GUI from "lil-gui";
import {
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
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Polygonal Roof",
  description:
    "STUDY — the pyramid roof on a regular N-GON plan: the octagonal turret cap, and every other polygon " +
    "between a tetrahedral three and a near-conical twelve. It exists because everything the roof studies " +
    "worked out turns out not to care how many sides there are, and this is where that is tested rather " +
    "than assumed. " +
    "Nothing is special-cased for `n`. Each face's normal is taken from its own drawn triangle; each hip " +
    "seats on the bisector of the two faces it covers; each cap's thickness is DERIVED as " +
    "`rise + (width / 2) * tan(alpha)` so its widest points come to rest on the roof. On a regular plan " +
    "every hip is congruent to every other, so one Seam Width gives one thickness — unlike a ridged roof, " +
    "where a hip and a ridge have different dihedrals and come out different sizes. " +
    "The APEX is where the count would be expected to matter, and it does not. A member has exactly TWO " +
    "neighbours in the cyclic order however many arrive, so `n` never changes the number of cuts — always " +
    "two planes per cap, always the same hip-end arrowhead. And on a regular plan adjacent hips are MIRROR " +
    "IMAGES across the plane bisecting them, which is the condition for a miter to shut, so it closes to " +
    "1e-16 at every count. The cut planes come out exactly vertical and the wedges exactly 360/n. See " +
    "`studies/miter/junction`, where that is the subject rather than the consequence. " +
    "What still does not close is the PEAK. Each cap's top face sits `rise` out along its OWN bisector and " +
    "those bisectors splay, so adjacent top faces meet only once the width reaches " +
    "`2 * rise * |horizontal part of the bisector|`. Below that a dish opens at the centre; above it the " +
    "caps overlap. The count turns out not to matter here either, but for a reason worth having: that " +
    "critical width is IDENTICAL at every `n` — 0.076 at these proportions — because the bisector is " +
    "perpendicular to the hip and lies in the vertical plane through it, so it is fixed by the HIP PITCH " +
    "alone, and the hip pitch depends only on radius and rise. Change Sides and the face pitch swings from " +
    "66.8 degrees to 50.3 while the hip holds at 49.4 and the dish behaves exactly the same. It is a " +
    "coverage problem, not a cutting one, and no miter reaches it — that is what a finial is for.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PAVILION   a hipped roof whose plan is a regular polygon, rising to a point. A square one is the
//  ROOF       pyramid; the octagonal one is the turret cap this study exists for.
//  HIP        the sloping joint between two adjacent faces, eave to apex. There are `n` of them, all
//             congruent on a regular plan — which is why one width gives one thickness here.
//  APEX       where every hip converges. `n` seams arriving at one point, and still only TWO cuts each.
//  BROACH     the transition from a square base to an octagonal spire above it. NOT modelled — it is a
//             change of plan partway up, and belongs to its own study.
//  DIHEDRAL   the angle between two faces at their shared edge. A cap seats on its BISECTOR, and the
//             HALF-ANGLE from that bisector to either face is what sizes it.
//  EAVE       the lower edge, oversailing the wall. As `n` rises the plan approaches a circle and the
//             eave approaches its circumference.
//
//  Deliberately NOT here: finials, pinnacles, cornice, and the broach. The dish this roof leaves at its
//  peak is the argument for a finial, not the place to build one.

type Construction = "bisector" | "outward" | "minimal";
type Section = "cap" | "crest";

const UP = new Vector3(0, 1, 0);
/** Past this the joint has folded back on itself and the drop runs away. Nothing on a roof reaches it. */
const MAX_HALF_ANGLE = (85 * Math.PI) / 180;

/** A point in a joint's own cross-section: `across` the joint, and `out` along its bisector. */
type Profile = [across: number, out: number][];

/** A bounding plane for a cap's apex end. `normal` points into the region the cap may occupy. */
interface Plane {
  point: Vector3;
  normal: Vector3;
}

/** How far along `axis` from `p` until the plane is met. `Infinity` when the axis runs parallel to it. */
const hitDistance = (p: Vector3, axis: Vector3, plane: Plane): number => {
  const denominator = axis.dot(plane.normal);
  if (Math.abs(denominator) < 1e-9) return Infinity;
  return plane.point.clone().sub(p).dot(plane.normal) / denominator;
};

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
const buildRoof = (sides: number, radius: number, rise: number): Roof => {
  const n = Math.max(3, Math.round(sides));
  // Corners on a circle. The first sits on +X so the plan reads the same at every count, and a square
  // comes out axis-aligned rather than turned 45 degrees.
  const corners: Vector3[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  const apex = new Vector3(0, rise, 0);

  const positions = new Float32Array(n * 9);
  const normals: Vector3[] = [];

  for (let i = 0; i < n; i++) {
    // (corner, apex, next corner) winds so the face normal comes out UP and OUTWARD, at any count.
    const triangle = [corners[i]!, apex, corners[(i + 1) % n]!];
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

  // Corner `i` is shared by face `i` and face `i - 1`, so those are the two planes its hip covers. The
  // arithmetic is the same at every count, which is the whole reason nothing here is special-cased.
  const joints: Joint[] = corners.map((corner, i) => ({
    from: corner.clone(),
    to: apex.clone(),
    planes: [normals[(i + n - 1) % n]!, normals[i]!],
    outward: new Vector3(corner.x, 0, corner.z).normalize(),
  }));

  return { geometry, joints };
};

/** The wall below, as a prism on the same plan — context, so the eave's oversail reads. */
const wallGeometry = (sides: number, radius: number, height: number): BufferGeometry => {
  const n = Math.max(3, Math.round(sides));
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  const triangles: Vector3[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ring[i]!;
    const b = ring[j]!;
    const at = (p: Vector3, y: number) => new Vector3(p.x, y, p.z);
    triangles.push([at(a, 0), at(b, 0), at(b, height)], [at(a, 0), at(b, height), at(a, height)]);
  }
  for (let i = 1; i < n - 1; i++) {
    triangles.push([
      new Vector3(ring[0]!.x, height, ring[0]!.z),
      new Vector3(ring[i]!.x, height, ring[i]!.z),
      new Vector3(ring[i + 1]!.x, height, ring[i + 1]!.z),
    ]);
  }
  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((t, i) => t.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
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
const extrude = (
  from: Vector3,
  to: Vector3,
  across: Vector3,
  out: Vector3,
  section: Profile,
  bounds: [Plane, Plane],
): BufferGeometry => {
  const signed =
    section.reduce((sum, [u, v], i) => {
      const [u2, v2] = section[(i + 1) % section.length]!;
      return sum + (u * v2 - u2 * v);
    }, 0) / 2;
  const points = signed < 0 ? [...section].reverse() : section;

  const forward = new Vector3().subVectors(to, from).normalize();
  const ring = points.map(([u, v]) =>
    from.clone().addScaledVector(across, u).addScaledVector(out, v),
  );

  // Every ring point runs up the hip and stops at whichever bounding plane it meets FIRST — the hip-end
  // construction from `studies/miter/hip-end`, by way of `studies/miter/junction`. With both bounds set to
  // the plane square across the hip this degenerates to a plain prism, which is the un-mitered case.
  const distances = ring.map((p) => [hitDistance(p, forward, bounds[0]), hitDistance(p, forward, bounds[1])]);
  const pick = (t: number[]) => (t[0]! <= t[1]! ? 0 : 1);

  const ends: { start: Vector3; end: Vector3; owner: number }[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const here = pick(distances[i]!);
    ends.push({
      start: ring[i]!.clone(),
      end: ring[i]!.clone().addScaledVector(forward, distances[i]![here]!),
      owner: here,
    });
    if (here === pick(distances[j]!)) continue;

    // The crossing is exact rather than searched for: with the axis fixed each `t` is linear in position,
    // so `t0 - t1` is linear along a ring edge and its root is one division. Without this split the band
    // spanning the disagreement is a single quad straddling both planes, and the arrowhead rounds off.
    const f0 = distances[i]![0]! - distances[i]![1]!;
    const f1 = distances[j]![0]! - distances[j]![1]!;
    const s = f0 / (f0 - f1);
    if (!Number.isFinite(s) || s <= 0 || s >= 1) continue;
    const crossing = ring[i]!.clone().lerp(ring[j]!, s);
    ends.push({
      start: crossing,
      end: crossing.clone().addScaledVector(forward, hitDistance(crossing, forward, bounds[0])),
      owner: -1,
    });
  }

  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = ends.length;

  // Sides. Each band is planar by construction: both of its ends travel along the SAME axis.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    pushQuad(buffers, [at(ends[j]!.start), at(ends[i]!.start), at(ends[i]!.end), at(ends[j]!.end)], undefined);
  }
  // The eave end, square across the hip. Still an open question — see the note in the study.
  const eaveNormal = forward.clone().negate();
  for (let i = 1; i < count - 1; i++) {
    pushTriangle(buffers, [at(ends[0]!.start), at(ends[i]!.start), at(ends[i + 1]!.start)], at(eaveNormal));
  }
  // The apex end, ONE FAN PER FACET — fanning the whole loop would span both planes and give non-planar
  // triangles, since the ridge between the facets is exactly where the cap must be cut in two.
  const ridges = ends.map((p, i) => (p.owner === -1 ? i : -1)).filter((i) => i >= 0);
  if (ridges.length === 2) {
    for (const [start, finish] of [
      [ridges[0]!, ridges[1]!],
      [ridges[1]!, ridges[0]!],
    ]) {
      const arc: Vector3[] = [];
      for (let i = start; ; i = (i + 1) % count) {
        arc.push(ends[i]!.end);
        if (i === finish) break;
      }
      for (let i = 1; i < arc.length - 1; i++) {
        pushTriangle(buffers, [at(arc[0]!), at(arc[i]!), at(arc[i + 1]!)], undefined);
      }
    }
  } else {
    for (let i = 1; i < count - 1; i++) {
      pushTriangle(buffers, [at(ends[0]!.end), at(ends[i]!.end), at(ends[i + 1]!.end)], undefined);
    }
  }

  return toBufferGeometry(buffers);
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
    // So that turning Seam Opacity down reveals the far side of the prism, not just its near shell.
    side: DoubleSide,
  });
  const masonry = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    sides: 8,
    radius: 1.9,
    rise: 2.4,
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

    const { sides, radius, rise: R, overhang, wallHeight: base } = params;
    const eave = radius + overhang;

    if (params.wall) {
      stage.add(new Mesh(wallGeometry(sides, radius, base), masonry));
    }

    const roof = buildRoof(sides, eave, R);
    roof.geometry.translate(0, base, 0);
    stage.add(new Mesh(roof.geometry, roofing));

    const errors: number[] = [];
    const contacts: number[] = [];
    const thicknesses: number[] = [];

    if (params.seams) {
      const parts: BufferGeometry[] = [];
      const direction = new Vector3();

      // Each cap's apex end is cut against its two NEIGHBOURS around the apex — the construction proved
      // in `studies/miter/junction`. Corner `i`'s neighbours are simply corners `i - 1` and `i + 1`.
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

        // The miter plane against a neighbour: through the apex, normal `normalize(a_i - a_j)` with both
        // axes pointing AWAY down their own hip. The neighbour is handed the same plane from the other
        // side, so adjacent caps abut with no gap by construction rather than by tuning.
        const count = roof.joints.length;
        const mine = awayFrom(joint);
        const against = (other: Joint): Plane => ({
          point: to.clone(),
          normal: mine.clone().sub(awayFrom(other)).normalize(),
        });
        // Un-mitered leaves the end square across the hip — every cap through the apex, slicing through
        // its neighbours. That is the pile-up the miter exists to resolve.
        const square: Plane = { point: to.clone(), normal: new Vector3().subVectors(from, to).normalize() };
        const bounds: [Plane, Plane] = params.miter
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
    // The COMMON pitch runs straight up a face, perpendicular to its eave — so its run is the APOTHEM,
    // the distance to the middle of a side, not the radius. The two converge as `n` rises.
    const n = Math.max(3, Math.round(sides));
    const apothem = eave * Math.cos(Math.PI / n);
    const facePitch = (Math.atan2(R, apothem) * 180) / Math.PI;
    // The HIP climbs the same rise over the full radius, so it is always the shallower line — and the gap
    // between them closes as the plan approaches a circle.
    const hipPitch = (Math.atan2(R, eave) * 180) / Math.PI;

    params.pitch = `${facePitch.toFixed(1)}° up a face · apothem ${apothem.toFixed(2)}`;
    params.hip = `${hipPitch.toFixed(1)}° · ${Math.hypot(eave, R).toFixed(2)} long · ${(facePitch - hipPitch).toFixed(1)}° shallower than the faces`;

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
  };
  rebuild();

  const gui = new GUI();
  gui.title("Polygonal Roof");

  const seam = gui.addFolder("Seams");
  // The whole point of the study. Off, it is a tent; on, it is a roof.
  seam.add(params, "seams").name("Show Seams").onChange(rebuild);
  // Each cap's apex end cut against its two neighbours. Off, every end is square across its own hip and
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
  // The count never changes the CONSTRUCTION — two cut planes per cap whatever it is. It only changes
  // who each cap's neighbours are.
  form.add(params, "sides", 3, 12, 1).name("Sides").onChange(rebuild);
  form.add(params, "radius", 0.6, 4, 0.05).name("Radius").onChange(rebuild);
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

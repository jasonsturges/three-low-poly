import GUI from "lil-gui";
import {
  BufferGeometry,
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
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Cope",
  description:
    "STUDY — the joint for members that do NOT match. A miter cuts both pieces with ONE shared plane, and " +
    "that is exactly why it is fussy: the two members' faces have to land on that plane together, which " +
    "they only do when the plane is a mirror of the whole member — same section, same roll. A COPE gives " +
    "that up. One member is cut to the OTHER'S SURFACE, taking whatever shape is actually there, and " +
    "nothing has to match: different width, different thickness, different roll, any angle. " +
    "So a cope CLOSES BY CONSTRUCTION. There is no condition to satisfy and no residual to tune — the " +
    "readout measures how far the cut end sits from the surface it was cut to, and the answer is zero " +
    "because that is what the cut is. Switch Joint to Miter and watch a real step appear between members " +
    "that cannot be mitered; switch back and it is gone. " +
    "The construction is the same loft used everywhere else, with a different stopping rule. A miter stops " +
    "a ring point at the nearer of two PLANES. A cope stops it where it would ENTER the neighbour's SOLID, " +
    "which is a ray against a convex prism: the entry time is the LAST of the times it crosses into each " +
    "of the prism's half-spaces, and there is no hit at all unless that comes before the FIRST time it " +
    "crosses out of one. Where consecutive ring points land on different faces of the neighbour the edge " +
    "between them is split exactly on the crossing, so the cut reads as a crease rather than a smear. " +
    "Two things a cope is not. It is NOT symmetric — a miter treats both members alike, but a cope has a " +
    "winner and a loser, and something outside the joint has to decide which is which. And it is not " +
    "universal: a member that would have to wrap around its neighbour cannot be coped, which the readout " +
    "reports as a MISS rather than quietly drawing nonsense. " +
    "The coped member comes out as ONE closed shell — the sides, the square start, and the cut end, all " +
    "from a single loft. That is worth saying because the alternative is tempting and worse: unioning a " +
    "few prisms gets the same silhouette while leaving coincident interior faces and no manifold. The HOST " +
    "is one bar too, run clear through the joint rather than built as two halves meeting at the origin — " +
    "two halves would each carry an end cap, and those caps sit coincident in the middle of an apparently " +
    "solid beam, showing as a plane through the middle the moment anything is transparent. " +
    "Where a cope earns its keep: a carpenter reaches for it exactly when members do not match, and the " +
    "seat cut on the post in `studies/miter/mitered-corner` was already a cope before it had the name — " +
    "against a plane there, against a solid here.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  COPE        cutting a member to the SURFACE of what it meets, instead of to a shared plane. Also
//              SCRIBING, when the profile is traced by hand. The joint that tolerates mismatch.
//  SEAT CUT    a cope against a flat surface — the simplest case, and the one already used for the post
//              in the mitered corner study. A cope against a SOLID is the general one.
//  SADDLE /    a cope where the cut wraps the neighbour, familiar from tube framing. Named for the shape
//  FISHMOUTH   the end takes when a round member copes onto another round member.
//  MITER       both members cut by ONE plane. Symmetric, and it demands matching sections and rolls.
//  BUTT        no shaping at all — the member stops flat against its neighbour, leaving a visible joint.
//              A cope is a butt that has been made to fit.
//  MALE /      the coped member is cut; the member it copes INTO is untouched. Every cope picks one.
//  FEMALE
//  MISS        the member never enters its neighbour, so there is nothing to cope to. A real failure and
//              reported as one.

type Joint = "cope" | "miter";

/** One face of a member's infinite prism. `normal` points OUT of the solid. */
interface Face {
  point: Vector3;
  normal: Vector3;
}

/** A member, and the prism it occupies. */
interface Member {
  name: string;
  /** A point on the axis — the junction, for everything here. */
  origin: Vector3;
  /** Unit, pointing AWAY from the junction down the member. */
  away: Vector3;
  /** The section's out direction; `across` follows from it. */
  up: Vector3;
  width: number;
  thickness: number;
  length: number;
  color: number;
}

const frameOf = (m: Member) => {
  const forward = m.away.clone().negate();
  const up = m.up.clone().addScaledVector(forward, -m.up.dot(forward)).normalize();
  const across = new Vector3().crossVectors(forward, up).normalize();
  return { forward, up, across };
};

/**
 * The member as a SOLID — four outward-facing planes, extended forever along its own axis.
 *
 * Infinite on purpose. A cope cuts to the surface its neighbour presents, and the neighbour's own far end
 * has nothing to do with that; treating it as finite would only introduce an edge that is not part of the
 * joint.
 */
const solidOf = (m: Member): Face[] => {
  const { up, across } = frameOf(m);
  return [
    { point: m.origin.clone().addScaledVector(across, m.width / 2), normal: across.clone() },
    { point: m.origin.clone().addScaledVector(across, -m.width / 2), normal: across.clone().negate() },
    { point: m.origin.clone().addScaledVector(up, m.thickness / 2), normal: up.clone() },
    { point: m.origin.clone().addScaledVector(up, -m.thickness / 2), normal: up.clone().negate() },
  ];
};

/**
 * Where a ray first ENTERS a convex solid — the cope's stopping rule.
 *
 * A ray is inside every half-space between the LAST time it crosses in and the FIRST time it crosses out,
 * so entry is `max` over the faces it approaches and there is no hit at all unless that comes before the
 * `min` over the faces it recedes from. This is the whole difference from a miter, which stops at the
 * nearer of two planes and never asks whether it is inside anything.
 *
 * Returns the distance and WHICH face was landed on, because that is what the crease splitting needs.
 */
const entry = (p: Vector3, axis: Vector3, faces: Face[]): { t: number; face: number } | null => {
  let enter = -Infinity;
  let exit = Infinity;
  let landed = -1;

  for (let k = 0; k < faces.length; k++) {
    const face = faces[k]!;
    const offset = p.clone().sub(face.point).dot(face.normal);
    const rate = axis.dot(face.normal);
    if (Math.abs(rate) < 1e-12) {
      // Parallel to this face. Outside it forever, or irrelevant.
      if (offset > 0) return null;
      continue;
    }
    const t = -offset / rate;
    if (rate < 0) {
      if (t > enter) {
        enter = t;
        landed = k;
      }
    } else if (t < exit) {
      exit = t;
    }
  }
  if (landed < 0 || enter > exit) return null;
  return { t: enter, face: landed };
};

interface Landing {
  t: number;
  /** `solid * 4 + face`, or `-1` for a miss. Consecutive points disagreeing marks a crease. */
  owner: number;
}

/** How far a ring point runs before it meets something — the nearest neighbour it enters. */
const stopAt = (p: Vector3, axis: Vector3, solids: Face[][], fallback: number): Landing => {
  let best: Landing = { t: fallback, owner: -1 };
  solids.forEach((faces, index) => {
    const hit = entry(p, axis, faces);
    if (hit && hit.t < best.t) best = { t: hit.t, owner: index * 4 + hit.face };
  });
  return best;
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 1.05, 1.8],
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
    joint: "cope" as Joint,
    angle: 55,
    width: 0.14,
    thickness: 0.1,
    copedWidth: 0.09,
    copedThickness: 0.16,
    roll: 40,
    samples: 10,
    opacity: 1,
    wireframe: false,

    seat: "",
    note: "",
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

  /** The members: which cope into which is a DECISION, so it is stated rather than derived. */
  const rig = (): { members: Member[]; coper: number; into: number[] } => {
    {
      // The plainest case: one member running through, another arriving at an angle and coping onto it.
      // Deliberately mismatched in section and rolled off, because that is what a cope is for.
      const a = (params.angle * Math.PI) / 180;
      const through: Member = {
        name: "through",
        origin: new Vector3(0, 0, 0),
        away: new Vector3(1, 0, 0),
        up: new Vector3(0, 1, 0),
        width: params.width,
        thickness: params.thickness,
        length: 0.75,
        color: PALETTE[0]!,
      };

      const rolled = new Vector3(0, Math.cos((params.roll * Math.PI) / 180), Math.sin((params.roll * Math.PI) / 180));
      const arriving: Member = {
        name: "coped",
        origin: new Vector3(0, 0, 0),
        away: new Vector3(0, Math.sin(a), Math.cos(a)).normalize(),
        up: rolled,
        width: params.copedWidth,
        thickness: params.copedThickness,
        length: 0.8,
        color: PALETTE[2]!,
      };
      return { members: [through, arriving], coper: 1, into: [0] };
    }

  };

  const rebuild = () => {
    clear();
    const { members, coper, into } = rig();
    const samples = Math.max(2, Math.round(params.samples));

    // Everything that is NOT the coped member is drawn whole — a cope leaves its neighbour untouched, and
    // that asymmetry is the joint's defining property.
    members.forEach((member, index) => {
      if (index === coper) return;
      const { forward, up, across } = frameOf(member);
      const half = member.width / 2;
      const halfT = member.thickness / 2;
      const buffers = createGeometryBuffers();
      const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
      const section: [number, number][] = [
        [-half, -halfT],
        [half, -halfT],
        [half, halfT],
        [-half, halfT],
      ];
      // ONE bar, running clear through the joint. Building it as two prisms butted at the origin gives
      // each its own end cap, and those two caps sit coincident in the middle of an apparently solid
      // member — a plane through the middle of the beam, visible the moment anything is transparent.
      const near = section.map(([u, v]) =>
        member.origin
          .clone()
          .addScaledVector(member.away, -member.length)
          .addScaledVector(across, u)
          .addScaledVector(up, v),
      );
      const far = near.map((p) => p.clone().addScaledVector(member.away, member.length * 2));
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        pushQuad(buffers, [at(near[j]!), at(near[i]!), at(far[i]!), at(far[j]!)], undefined);
      }
      for (let i = 1; i < 3; i++) {
        pushTriangle(buffers, [at(far[0]!), at(far[i + 1]!), at(far[i]!)], at(forward.clone().negate()));
        pushTriangle(buffers, [at(near[0]!), at(near[i]!), at(near[i + 1]!)], at(forward));
      }
      const geometry = toBufferGeometry(buffers);
      const material = materialFor(member.color);
      material.transparent = params.opacity < 1;
      material.opacity = params.opacity;
      material.depthWrite = params.opacity >= 1;
      stage.add(new Mesh(geometry, material));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
    });

    // --- the coped member ---------------------------------------------------
    const member = members[coper]!;
    const { forward, up, across } = frameOf(member);
    const solids = into.map((i) => solidOf(members[i]!));

    // The ring, at the member's far end, sampled finely enough that a crossing between two faces of the
    // neighbour is caught on some edge. The exact split below then places it precisely.
    const half = member.width / 2;
    const halfT = member.thickness / 2;
    const corners: [number, number][] = [
      [-half, -halfT],
      [half, -halfT],
      [half, halfT],
      [-half, halfT],
    ];
    const ring: Vector3[] = [];
    for (let c = 0; c < 4; c++) {
      const a = corners[c]!;
      const b = corners[(c + 1) % 4]!;
      for (let s = 0; s < samples; s++) {
        const f = s / samples;
        ring.push(
          member.origin
            .clone()
            .addScaledVector(member.away, member.length)
            .addScaledVector(across, a[0] + (b[0] - a[0]) * f)
            .addScaledVector(up, a[1] + (b[1] - a[1]) * f),
        );
      }
    }

    const fallback = member.length * 2;
    const landings: { start: Vector3; end: Vector3; owner: number }[] = [];

    /** Distance to ONE named face, as a plain ray-plane hit. Linear in the ring position, which is what
     * makes the crease crossing below exact rather than searched for. */
    const toOwner = (p: Vector3, owner: number): number => {
      if (owner < 0) return fallback;
      const face = solids[Math.floor(owner / 4)]![owner % 4]!;
      const rate = forward.dot(face.normal);
      if (Math.abs(rate) < 1e-12) return fallback;
      return face.point.clone().sub(p).dot(face.normal) / rate;
    };

    if (params.joint === "cope") {
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        const here = stopAt(ring[i]!, forward, solids, fallback);
        const next = stopAt(ring[j]!, forward, solids, fallback);
        landings.push({
          start: ring[i]!.clone(),
          end: ring[i]!.clone().addScaledVector(forward, here.t),
          owner: here.owner,
        });
        if (here.owner === next.owner) continue;

        // A CREASE — the two ends of this edge land on different faces. Each face's distance is linear
        // along the edge, so the crossing is one division rather than a search, and the two facets meet on
        // a sharp line instead of a smeared band.
        const a0 = toOwner(ring[i]!, here.owner);
        const a1 = toOwner(ring[j]!, here.owner);
        const b0 = toOwner(ring[i]!, next.owner);
        const b1 = toOwner(ring[j]!, next.owner);
        const denominator = a0 - b0 - (a1 - b1);
        const s = Math.abs(denominator) < 1e-12 ? 0.5 : (a0 - b0) / denominator;
        if (!Number.isFinite(s) || s <= 1e-9 || s >= 1 - 1e-9) continue;
        const crossing = ring[i]!.clone().lerp(ring[j]!, s);
        const landed = stopAt(crossing, forward, solids, fallback);
        landings.push({
          start: crossing,
          end: crossing.clone().addScaledVector(forward, landed.t),
          owner: here.owner,
        });
      }
    } else {
      // MITER, for comparison: the shared plane bisecting this member's axis and each neighbour's.
      const planes = into.map((i) => ({
        point: member.origin.clone(),
        normal: member.away.clone().sub(members[i]!.away).normalize(),
      }));
      for (const p of ring) {
        let best = fallback;
        let owner = -1;
        planes.forEach((plane, k) => {
          const rate = forward.dot(plane.normal);
          if (Math.abs(rate) < 1e-9) return;
          const t = plane.point.clone().sub(p).dot(plane.normal) / rate;
          if (t > 0 && t < best) {
            best = t;
            owner = k;
          }
        });
        landings.push({ start: p.clone(), end: p.clone().addScaledVector(forward, best), owner });
      }
    }

    const buffers = createGeometryBuffers();
    const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
    const count = landings.length;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      pushQuad(
        buffers,
        [at(landings[j]!.start), at(landings[i]!.start), at(landings[i]!.end), at(landings[j]!.end)],
        undefined,
      );
    }
    for (let i = 1; i < count - 1; i++) {
      pushTriangle(buffers, [at(landings[0]!.start), at(landings[i]!.start), at(landings[i + 1]!.start)], at(forward));
    }
    // The cut end, ONE FAN PER FACE. A single fan across the whole loop would span several of the
    // neighbour's faces and emit non-planar triangles — the creases are exactly where it must be split.
    const runs: number[][] = [];
    for (let i = 0; i < count; i++) {
      const previous = landings[(i + count - 1) % count]!.owner;
      if (runs.length > 0 && landings[i]!.owner === previous) runs[runs.length - 1]!.push(i);
      else runs.push([i]);
    }
    // A run that wraps past index 0 is ONE facet, not two. Without this merge the loop is cut at an
    // arbitrary place and the seam shows as a stray triangle.
    if (runs.length > 1 && landings[runs[0]![0]!]!.owner === landings[runs[runs.length - 1]![0]!]!.owner) {
      runs[0] = [...runs.pop()!, ...runs[0]!];
    }

    if (runs.length > 1) {
      // Each facet is closed by the CREASE POINT ENDING THE PREVIOUS RUN. That point sits on both faces —
      // it is where they cross — so it is the only vertex that can close this polygon without leaving its
      // plane. Borrowing the next run's FIRST point instead takes a vertex off this face entirely, which
      // is what scrambles the cut end.
      runs.forEach((run, r) => {
        const previous = runs[(r + runs.length - 1) % runs.length]!;
        const arc = [landings[previous[previous.length - 1]!]!.end, ...run.map((i) => landings[i]!.end)];
        for (let i = 1; i < arc.length - 1; i++) {
          pushTriangle(buffers, [at(arc[0]!), at(arc[i + 1]!), at(arc[i]!)], undefined);
        }
      });
    } else {
      for (let i = 1; i < count - 1; i++) {
        pushTriangle(buffers, [at(landings[0]!.end), at(landings[i + 1]!.end), at(landings[i]!.end)], undefined);
      }
    }

    const geometry = toBufferGeometry(buffers);
    const material = materialFor(member.color);
    material.transparent = params.opacity < 1;
    material.opacity = params.opacity;
    material.depthWrite = params.opacity >= 1;
    stage.add(new Mesh(geometry, material));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    // SEAT — how far the cut end sits from the surface it was cut to. For a cope this is zero by
    // construction; the number is here to show that it IS zero, and to catch a miss.
    let worst = 0;
    let missed = 0;
    for (const landing of landings) {
      if (landing.owner === -1) {
        missed += 1;
        continue;
      }
      let nearest = Infinity;
      for (const faces of solids) {
        for (const face of faces) {
          nearest = Math.min(nearest, Math.abs(landing.end.clone().sub(face.point).dot(face.normal)));
        }
      }
      worst = Math.max(worst, nearest);
    }

    params.seat =
      missed > 0
        ? `${missed}/${count} points MISS — nothing to cope to`
        : worst < 1e-9
          ? `seated on the surface — ${worst.toExponential(1)}`
          : `${worst.toFixed(4)} off the surface`;
    params.note =
      params.joint === "cope"
        ? `${member.name} copes into ${into.map((i) => members[i]!.name).join(" + ")} — nothing has to match`
        : `${member.name} mitered — needs equal section and shared roll, and has neither`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centred without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Cope");

  const setup = gui.addFolder("Joint");
  // Cope cuts to the neighbour's SURFACE; miter cuts both to one shared PLANE and needs them to match.
  setup.add(params, "joint", { Cope: "cope", "Miter (for contrast)": "miter" }).name("Joint").onChange(rebuild);
  setup.open();

  const shape = gui.addFolder("Mismatch");
  // Every one of these is free under a cope. That is the entire point of the technique.
  shape.add(params, "angle", 15, 90, 1).name("Arrival Angle").onChange(rebuild);
  shape.add(params, "roll", 0, 90, 1).name("Coped Roll").onChange(rebuild);
  shape.add(params, "copedWidth", 0.03, 0.3, 0.005).name("Coped Width").onChange(rebuild);
  shape.add(params, "copedThickness", 0.03, 0.3, 0.005).name("Coped Thickness").onChange(rebuild);
  shape.open();

  const host = gui.addFolder("Host");
  host.add(params, "width", 0.05, 0.35, 0.005).name("Width").onChange(rebuild);
  host.add(params, "thickness", 0.03, 0.3, 0.005).name("Thickness").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  // Raise it where the neighbour's own edges cross the cut and the crease needs resolving.
  inspect.add(params, "samples", 2, 32, 1).name("Ring Samples").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.05).name("Opacity").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "seat").name("Seat").listen().disable();
  readout.add(params, "note").name("Joint").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    materials.forEach((material) => material.dispose());
    wire.dispose();
    dispose();
  };
}

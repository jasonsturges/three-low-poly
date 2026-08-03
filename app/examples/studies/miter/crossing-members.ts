import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { ShapeUtils } from "three";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Crossing Members",
  description:
    "STUDY — two members that CROSS instead of meeting, which every other joint study in this library has " +
    "quietly assumed away. A miter, a cope, a junction all involve members that TERMINATE at a shared " +
    "point; the whole construction is about where an end lands. Crossing members do not terminate at all. " +
    "They continue through, so the cut is a NOTCH in the middle of a run — a different operation, needing " +
    "a member to be built in pieces rather than cut at an end. " +
    "Their axes need not even intersect. Two lines in space generally do not meet, and the honest " +
    "description of a crossing is the COMMON PERPENDICULAR: `n = normalize(dA x dB)` gives the one " +
    "direction along which they are separated, and their distance apart is the projection of any " +
    "connecting vector onto it. That single number decides everything. Where it exceeds both half " +
    "thicknesses the members simply PASS and no joint is required — the commonest case in a lattice, and " +
    "one that needs no cutting at all. Where it does not, they overlap, and something has to be removed. " +
    "The overlap is what the modes divide up. INTERPENETRATE removes nothing, which is what this library " +
    "does today wherever bars cross; it is invisible in an opaque merged mesh and wrong the moment " +
    "anything is transparent, sectioned, or silhouetted. HALF LAP splits the overlap between them, each " +
    "losing half, so their outer faces stay flush — the joint a lattice or a cage actually wants. HOUSED " +
    "takes the whole overlap out of one member and leaves the other running through whole, which is what " +
    "you do when one member matters structurally and the other does not. " +
    "The notch walls are the crossing member's own SIDE PLANES, so they are slanted by the crossing angle " +
    "rather than square — at 90 degrees a notch is a rectangle, and at 30 it is a long parallelogram " +
    "nearly three times the bar's width. Take Angle down and watch the lap stretch. " +
    "One thing worth noticing at the extremes: as the angle closes toward zero the notch runs away toward " +
    "infinite length, because two nearly parallel bars overlap for nearly their whole run. There is no " +
    "lap joint there — that is a pair of members that should have been one.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CROSSING      two members passing through the same region without terminating. Distinct from a
//                JUNCTION, where members end at a shared point. Nothing else in this library models it.
//  SKEW LINES    two lines that neither meet nor run parallel — the general case for two axes in space.
//                Their separation is measured along the COMMON PERPENDICULAR.
//  COMMON        `normalize(dA x dB)`. The single direction along which two skew axes are apart, and the
//  PERPENDICULAR one the lap has to be measured and split along.
//  HALF LAP /    each member loses half the overlap, so the two finish flush. The joint a lattice, a
//  CROSS LAP     cage or a garden trellis actually uses.
//  HOUSING       the whole overlap removed from ONE member; the other passes through untouched. Also a
//                DADO or TRENCH when the notch is square across.
//  PASS          no joint at all — the members clear each other along the common perpendicular. Free, and
//                the commonest case in a layered lattice.
//  CHEEK         the flat face left at the bottom of a lap. SHOULDER is the wall at its ends.
//  NOTCH WALL    bounded by the crossing member's own SIDE PLANE, so it slants with the crossing angle.

type Joint = "pass" | "interpenetrate" | "halfLap" | "housed";
type Build = "assembly" | "solid";

interface Member {
  name: string;
  /** A point on the axis. */
  origin: Vector3;
  /** Unit axis direction. */
  axis: Vector3;
  width: number;
  thickness: number;
  length: number;
  color: number;
}

/**
 * How far a point travels along `axis` before it ENTERS the crossing member's slab.
 *
 * The slab is the infinite region between that member's two side planes — `|(p - origin) . across| <= w/2`
 * — and a notch is exactly the part of the host lying inside it. Solving for entry directly is clearer
 * than bounding against one wall and hoping it is the near one: the two roots are the near and far walls,
 * and the near one is simply the smaller. `Infinity` when the axis never reaches it.
 */
const slabEntry = (
  p: Vector3,
  axis: Vector3,
  origin: Vector3,
  across: Vector3,
  halfWidth: number,
): number => {
  const offset = p.clone().sub(origin).dot(across);
  const rate = axis.dot(across);
  if (Math.abs(rate) < 1e-9) return Math.abs(offset) <= halfWidth ? 0 : Infinity;
  const first = (halfWidth - offset) / rate;
  const second = (-halfWidth - offset) / rate;
  const near = Math.min(first, second);
  const far = Math.max(first, second);
  if (far < 0) return Infinity;
  return Math.max(0, near);
};

/**
 * A prism running along `member.axis`, its section spanning `[low, high]` along the common perpendicular.
 *
 * `stopAt` gives each ring vertex its own travel distance, which is what shapes a notch wall: the wall is
 * the crossing member's SIDE PLANE, so every point across the host's width reaches it at a different
 * distance and the end comes out slanted. It is square only at 90 degrees.
 */
const piece = (
  member: Member,
  up: Vector3,
  across: Vector3,
  low: number,
  high: number,
  from: number,
  maxLength: number,
  stopAt: ((p: Vector3) => number) | null,
): BufferGeometry | null => {
  if (high - low <= 1e-9 || maxLength <= 1e-9) return null;
  const half = member.width / 2;
  const section: [number, number][] = [
    [-half, low],
    [half, low],
    [half, high],
    [-half, high],
  ];
  const start = section.map(([u, v]) =>
    member.origin
      .clone()
      .addScaledVector(member.axis, from)
      .addScaledVector(across, u)
      .addScaledVector(up, v),
  );
  const travel = start.map((p) =>
    Math.max(0, Math.min(stopAt ? stopAt(p) : maxLength, maxLength)),
  );
  // Notched away entirely — the crossing member covers this end of the host completely.
  if (travel.every((t) => t < 1e-9)) return null;

  const ends = start.map((p, i) => p.clone().addScaledVector(member.axis, travel[i]!));

  const triangles: Vector3[][] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    triangles.push([start[j]!, start[i]!, ends[i]!], [start[j]!, ends[i]!, ends[j]!]);
  }
  for (let i = 1; i < 3; i++) {
    triangles.push([start[0]!, start[i]!, start[i + 1]!]);
    triangles.push([ends[0]!, ends[i + 1]!, ends[i]!]);
  }

  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, i) =>
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * The shoulder positions on ONE side of the host, as distances along its axis.
 *
 * A notch is bounded by the crossing member's two side planes, and for a point at cross-offset `u` those
 * are reached at `t = (+/-w/2 - c0 - u k) / m`. Every term is linear in `u`, which is the fact the solid
 * below is built on: the shoulders sweep straight across the host's width, so the whole notched member is
 * a LOFT between two outlines rather than anything needing a boolean.
 */
const shouldersAt = (
  u: number,
  host: Member,
  hostAcross: Vector3,
  other: Member,
  otherAcross: Vector3,
): [number, number] | null => {
  const c0 = host.origin.clone().sub(other.origin).dot(otherAcross);
  const k = hostAcross.dot(otherAcross);
  const m = host.axis.dot(otherAcross);
  if (Math.abs(m) < 1e-9) return null; // running parallel to the slab — no shoulders to find
  const half = other.width / 2;
  const a = (half - c0 - u * k) / m;
  const b = (-half - c0 - u * k) / m;
  return [Math.min(a, b), Math.max(a, b)];
};

/**
 * The host's silhouette at one side face, as a closed outline in (length, height).
 *
 * A rectangle with a step cut into one edge — eight vertices, always eight, even when the notch runs past
 * an end and some of them coincide. Keeping the count fixed is what lets the two side outlines be lofted
 * to each other directly; the degenerate triangles that result are dropped at emit time, which is cheaper
 * and far less fiddly than reconciling two polygons of different lengths.
 */
const notchOutline = (
  t0: number,
  t1: number,
  low: number,
  high: number,
  shoulders: [number, number] | null,
  cheek: number,
  keep: "bottom" | "top",
): [number, number][] => {
  if (!shoulders) {
    return [
      [t0, low],
      [t1, low],
      [t1, high],
      [t0, high],
    ];
  }
  const s = Math.max(t0, Math.min(shoulders[0], t1));
  const e = Math.max(t0, Math.min(shoulders[1], t1));
  return keep === "bottom"
    ? [
        [t0, low],
        [t1, low],
        [t1, high],
        [e, high],
        [e, cheek],
        [s, cheek],
        [s, high],
        [t0, high],
      ]
    : [
        [t0, low],
        [s, low],
        [s, cheek],
        [e, cheek],
        [e, low],
        [t1, low],
        [t1, high],
        [t0, high],
      ];
};

/**
 * ONE closed shell for a notched member, lofted between its two side outlines.
 *
 * The alternative — and what the Assembly build does — is to union several prisms. That is correct and
 * invisible while opaque, but it leaves coincident interior faces where the pieces abut, costs more
 * triangles, and is not a single manifold. This is the same member as one surface.
 */
const notchedSolid = (
  host: Member,
  up: Vector3,
  across: Vector3,
  low: number,
  high: number,
  cheek: number,
  keep: "bottom" | "top",
  other: Member,
  otherAcross: Vector3,
  length: number,
): BufferGeometry | null => {
  const halfWidth = host.width / 2;
  const t0 = -length / 2;
  const t1 = length / 2;

  const sides = [-halfWidth, halfWidth].map((u) => ({
    u,
    outline: notchOutline(t0, t1, low, high, shouldersAt(u, host, across, other, otherAcross), cheek, keep),
  }));
  if (sides[0]!.outline.length !== sides[1]!.outline.length) return null;

  const at = (u: number, [t, v]: [number, number]) =>
    host.origin.clone().addScaledVector(host.axis, t).addScaledVector(across, u).addScaledVector(up, v);
  const left = sides[0]!.outline.map((p) => at(sides[0]!.u, p));
  const right = sides[1]!.outline.map((p) => at(sides[1]!.u, p));
  const count = left.length;

  const triangles: Vector3[][] = [];
  // The two side faces, EAR CLIPPED rather than fanned. The outline is not convex — a step is cut into one
  // edge — and a corner fan only stays inside a polygon that is star-shaped from that corner. It happens
  // to be for a notch cut into the top, and is NOT for one cut into the bottom, where the fan escapes
  // across the notch and leaves an open shell. Volume still comes out right in that case, because the
  // stray triangles cancel in the divergence sum, so only an edge-manifold check catches it.
  const contour = sides[0]!.outline.map(([t, v]) => new Vector2(t, v));
  const faces = ShapeUtils.triangulateShape(contour, []);
  for (const [x, y, z] of faces) {
    triangles.push([left[x!]!, left[y!]!, left[z!]!]);
    triangles.push([right[x!]!, right[z!]!, right[y!]!]);
  }
  // The band around the silhouette: bottom, ends, top, cheek and both shoulders, all in one loop.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    triangles.push([left[i]!, right[i]!, right[j]!], [left[i]!, right[j]!, left[j]!]);
  }

  // Drop the degenerate triangles left where the notch ran past an end and vertices coincided. A
  // zero-area triangle contributes a zero-length normal, which lights as solid black rather than nothing.
  const solid = triangles.filter(
    ([a, b, c]) =>
      new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).length() > 1e-12,
  );
  if (solid.length === 0) return null;

  const positions = new Float32Array(solid.length * 9);
  solid.forEach((triangle, i) =>
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.1, 0.95, 1.5],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.45);
  key.position.set(1, 1.6, 1.2);
  const bounce = new DirectionalLight(0x8ea8cc, 0.5);
  bounce.position.set(-1, -0.4, -0.8);
  scene.add(key, bounce);

  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const materials = new Map<number, MeshStandardMaterial>();
  const materialFor = (color: number) => {
    let material = materials.get(color);
    if (!material) {
      material = new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, flatShading: true, side: DoubleSide });
      materials.set(color, material);
    }
    return material;
  };

  const params = {
    joint: "halfLap" as Joint,
    build: "solid" as Build,
    angle: 70,
    skew: 0,
    widthA: 0.12,
    thicknessA: 0.07,
    widthB: 0.12,
    thicknessB: 0.07,
    length: 1.2,
    opacity: 1,
    wireframe: false,

    separation: "",
    lap: "",
    notch: "",
    shell: "",
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
    const radians = (params.angle * Math.PI) / 180;

    // THE COMMON PERPENDICULAR — the one direction along which two skew axes are separated. Everything
    // about a crossing is measured along it, so it is computed before anything else.
    const axisA = new Vector3(1, 0, 0);
    const axisB = new Vector3(Math.cos(radians), 0, Math.sin(radians));
    const normal = new Vector3().crossVectors(axisA, axisB).normalize();

    const a: Member = {
      name: "A",
      origin: new Vector3(0, 0, 0),
      axis: axisA,
      width: params.widthA,
      thickness: params.thicknessA,
      length: params.length,
      color: 0xd98f4f,
    };
    const b: Member = {
      name: "B",
      // Displaced along the common perpendicular. At skew 0 the axes intersect; otherwise they are SKEW
      // lines, which is the general case and the one nothing else here handles.
      origin: normal.clone().multiplyScalar(params.skew),
      axis: axisB,
      width: params.widthB,
      thickness: params.thicknessB,
      length: params.length,
      color: 0x6fa8c7,
    };

    // Each member's own frame. `up` is the common perpendicular for both, which is what lets one number
    // describe the lap: they are separated along it and along nothing else.
    const up = normal.clone();
    const acrossA = new Vector3().crossVectors(a.axis, up).normalize();
    const acrossB = new Vector3().crossVectors(b.axis, up).normalize();

    // Where each member sits along the common perpendicular, and how much of that they share.
    const spanA: [number, number] = [-a.thickness / 2, a.thickness / 2];
    const spanB: [number, number] = [params.skew - b.thickness / 2, params.skew + b.thickness / 2];
    const overlapLow = Math.max(spanA[0], spanB[0]);
    const overlapHigh = Math.min(spanA[1], spanB[1]);
    const overlap = overlapHigh - overlapLow;


    const half = params.length / 2;
    const add = (geometry: BufferGeometry | null, color: number) => {
      if (!geometry) return;
      const material = materialFor(color);
      material.transparent = params.opacity < 1;
      material.opacity = params.opacity;
      material.depthWrite = params.opacity >= 1;
      stage.add(new Mesh(geometry, material));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
    };

    /** A member run whole, from end to end. */
    const whole = (m: Member, across: Vector3, low: number, high: number) =>
      add(piece(m, up, across, low, high, -half, params.length, null), m.color);

    /**
     * A member notched between `low` and `high`, built as TWO pieces — one running in from each end and
     * stopping where it enters the crossing member's slab.
     *
     * This is what makes a crossing different in kind from a junction. A mitered member is cut once and
     * survives on one side; a notched member survives on BOTH sides, so it cannot be produced by cutting
     * an end at all. It has to be built in pieces, and the pieces meet nothing — they just stop.
     */
    const notched = (m: Member, across: Vector3, other: Member, otherAcross: Vector3, low: number, high: number) => {
      for (const direction of [1, -1] as const) {
        const axis = m.axis.clone().multiplyScalar(direction);
        const run: Member = { ...m, axis };
        add(
          piece(run, up, across.clone().multiplyScalar(direction), low, high, -half, params.length, (p) =>
            slabEntry(p, axis, other.origin, otherAcross, other.width / 2),
          ),
          m.color,
        );
      }
    };

    const clear2 = overlap <= 1e-9;
    if (params.joint === "pass" || clear2) {
      whole(a, acrossA, spanA[0], spanA[1]);
      whole(b, acrossB, spanB[0], spanB[1]);
    } else if (params.joint === "interpenetrate") {
      whole(a, acrossA, spanA[0], spanA[1]);
      whole(b, acrossB, spanB[0], spanB[1]);
    } else if (params.joint === "housed") {
      // The whole overlap out of A; B runs through untouched.
      whole(b, acrossB, spanB[0], spanB[1]);
      if (params.build === "solid") {
        // The host as ONE shell. Which part survives in the notch depends on where the overlap sits:
        // if it reaches A's top, the top is what goes.
        const keep = Math.abs(overlapHigh - spanA[1]) < 1e-9 ? "bottom" : "top";
        const cheek = keep === "bottom" ? overlapLow : overlapHigh;
        add(
          notchedSolid(a, up, acrossA, spanA[0], spanA[1], cheek, keep, b, acrossB, params.length),
          a.color,
        );
      } else {
        if (spanA[0] < overlapLow - 1e-9) whole(a, acrossA, spanA[0], overlapLow);
        if (overlapHigh < spanA[1] - 1e-9) whole(a, acrossA, overlapHigh, spanA[1]);
        notched(a, acrossA, b, acrossB, overlapLow, overlapHigh);
      }
    } else {
      // HALF LAP — the overlap split down the middle, so both finish flush.
      const middle = (overlapLow + overlapHigh) / 2;
      if (params.build === "solid") {
        // A keeps its BOTTOM through the notch, B keeps its TOP. That is the interlock, in one line each.
        add(notchedSolid(a, up, acrossA, spanA[0], spanA[1], middle, "bottom", b, acrossB, params.length), a.color);
        add(notchedSolid(b, up, acrossB, spanB[0], spanB[1], middle, "top", a, acrossA, params.length), b.color);
      } else {
        if (spanA[0] < middle - 1e-9) whole(a, acrossA, spanA[0], middle);
        notched(a, acrossA, b, acrossB, middle, spanA[1]);
        if (middle < spanB[1] - 1e-9) whole(b, acrossB, middle, spanB[1]);
        notched(b, acrossB, a, acrossA, spanB[0], middle);
      }
    }

    // What the two builds actually cost, side by side.
    let meshes = 0;
    let triangles = 0;
    for (const child of stage.children) {
      if (child instanceof Mesh) {
        meshes += 1;
        triangles += (child.geometry.getAttribute("position")?.count ?? 0) / 3;
      }
    }
    params.shell =
      params.build === "solid"
        ? `${meshes} closed shell${meshes === 1 ? "" : "s"} · ${triangles} triangles — one manifold per member`
        : `${meshes} prisms · ${triangles} triangles — abutting, with coincident interior faces`;

    // --- readouts ---------------------------------------------------------
    const separation = Math.abs(params.skew);
    const clearance = separation - (a.thickness + b.thickness) / 2;
    params.separation =
      Math.abs(params.angle % 180) < 1e-6
        ? "axes are PARALLEL — there is no crossing"
        : clearance >= -1e-9
          ? `axes ${separation.toFixed(3)} apart — they CLEAR by ${clearance.toFixed(3)}, no joint needed`
          : `axes ${separation.toFixed(3)} apart — they OVERLAP by ${(-clearance).toFixed(3)}`;

    params.lap = clear2
      ? "no overlap to divide"
      : params.joint === "halfLap"
        ? `each member loses ${(overlap / 2).toFixed(3)} of ${overlap.toFixed(3)} — outer faces stay flush`
        : params.joint === "housed"
          ? `A loses all ${overlap.toFixed(3)}; B runs through whole`
          : `${overlap.toFixed(3)} of shared material, removed from neither`;

    // The notch's length along the host: the crossing member's width, stretched by the crossing angle.
    const sine = Math.abs(Math.sin(radians));
    params.notch =
      sine < 1e-6
        ? "parallel — the notch would never end"
        : `${(params.widthB / sine).toFixed(3)} long for a ${params.widthB.toFixed(3)} bar — ${(1 / sine).toFixed(2)}x its width`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centred without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Crossing Members");

  const joint = gui.addFolder("Joint");
  // What this library does today wherever bars cross is INTERPENETRATE — invisible in an opaque merged
  // mesh, wrong the moment anything is transparent or sectioned.
  joint
    .add(params, "joint", {
      "Half lap": "halfLap",
      Housed: "housed",
      Interpenetrate: "interpenetrate",
      "Pass (no joint)": "pass",
    })
    .name("Joint")
    .onChange(rebuild);
  // Assembly unions several prisms per member — correct, invisible while opaque, but it leaves coincident
  // interior faces where the pieces abut and is not a single manifold. Solid is the same member as ONE
  // closed shell, lofted between its two side outlines.
  joint.add(params, "build", { "Single solid": "solid", "Assembly of prisms": "assembly" }).name("Build").onChange(rebuild);
  joint.open();

  const cross = gui.addFolder("Crossing");
  // The notch wall is the crossing member's own side plane, so it slants with this. Take it down and
  // watch the lap stretch out.
  cross.add(params, "angle", 10, 90, 1).name("Angle").onChange(rebuild);
  // Displacement along the COMMON PERPENDICULAR. Past the combined half-thicknesses the members clear
  // each other and no joint is needed at all.
  cross.add(params, "skew", 0, 0.25, 0.005).name("Skew").onChange(rebuild);
  cross.open();

  const stock = gui.addFolder("Stock");
  stock.add(params, "widthA", 0.03, 0.3, 0.005).name("A Width").onChange(rebuild);
  stock.add(params, "thicknessA", 0.02, 0.2, 0.005).name("A Thickness").onChange(rebuild);
  stock.add(params, "widthB", 0.03, 0.3, 0.005).name("B Width").onChange(rebuild);
  stock.add(params, "thicknessB", 0.02, 0.2, 0.005).name("B Thickness").onChange(rebuild);
  stock.add(params, "length", 0.5, 2.5, 0.05).name("Length").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "opacity", 0.15, 1, 0.05).name("Opacity").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "separation").name("Axes").listen().disable();
  readout.add(params, "lap").name("Overlap").listen().disable();
  readout.add(params, "notch").name("Notch").listen().disable();
  readout.add(params, "shell").name("Build").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    materials.forEach((material) => material.dispose());
    wire.dispose();
    dispose();
  };
}

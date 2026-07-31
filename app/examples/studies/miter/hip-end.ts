import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  circleProfile,
  createGeometryBuffers,
  linePath,
  miterFrames,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Hip End",
  description:
    "STUDY — taxonomy (3), the hip: a member whose end has to be cut by TWO planes, not one. Framing " +
    "cannot reach it, because one station is one ring is one plane. Lofting can. Every point of the " +
    "member's ring runs along the axis until it meets a bounding plane, and each point takes whichever " +
    "plane it meets FIRST — or LAST, and that single choice is the whole difference between an inside " +
    "corner and an outside one. Where the winner changes, the ring is split exactly on the crossing, so " +
    "the two facets meet on a clean ridge instead of a smeared band. SQUARE and SEAT show what the " +
    "existing tools manage; HIP is the candidate. Watch Azimuth: swing the member off the ridge and the " +
    "hip degenerates to a plain seat cut on its own, because every ring point starts choosing the same " +
    "plane.",
};

/** A bounding plane. `normal` points into the region the member is allowed to occupy. */
interface Plane {
  point: Vector3;
  normal: Vector3;
}

/** How far along `axis` from `p` until the plane is met. `Infinity` when the axis runs parallel to it. */
function hitDistance(p: Vector3, axis: Vector3, plane: Plane): number {
  const denominator = axis.dot(plane.normal);
  if (Math.abs(denominator) < 1e-9) return Infinity;
  return plane.point.clone().sub(p).dot(plane.normal) / denominator;
}

interface EndPoint {
  /** The point on the start ring this one came from. */
  start: Vector3;
  /** Where it lands. */
  end: Vector3;
  /** Which plane it landed on: `0`, `1`, or `-1` for a point sitting exactly on the ridge. */
  owner: number;
}

/**
 * THE CONSTRUCTION — run every ring point down the axis and let it choose a plane.
 *
 * The molding return lofted a ring to ONE plane. A hip is the same move with two, plus the one thing that
 * makes it a hip rather than a smear: **where consecutive ring points disagree about which plane they
 * meet, the edge between them is SPLIT exactly on the crossing.** Without that split, the band spanning
 * the disagreement is a single quad straddling both planes, and the ridge comes out rounded off.
 *
 * The crossing is exact, not searched for. With the axis fixed, each `t` is a linear function of position,
 * so `t0 − t1` is linear along a ring edge and its root is one division.
 *
 * `mode` is the entire difference between the two kinds of corner, and it is a single word:
 * - `"min"` — stop at the FIRST plane met. The member is landing INSIDE a corner, so it is bounded by
 *   whichever surface it reaches first, and the end comes to a point that reaches into the corner. This
 *   is the arrowhead.
 * - `"max"` — stop at the LAST. The member is wrapping the OUTSIDE of a corner, so it may continue until
 *   it is behind both surfaces, and the end is notched instead of pointed.
 */
function hipEnd(ring: Vector3[], axis: Vector3, planes: [Plane, Plane], mode: "min" | "max"): EndPoint[] {
  const distances = ring.map((p) => [hitDistance(p, axis, planes[0]), hitDistance(p, axis, planes[1])]);
  const pick = (t: number[]) => (mode === "min" ? (t[0]! <= t[1]! ? 0 : 1) : t[0]! >= t[1]! ? 0 : 1);

  const out: EndPoint[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const here = pick(distances[i]!);
    const next = pick(distances[j]!);

    out.push({
      start: ring[i]!.clone(),
      end: ring[i]!.clone().addScaledVector(axis, distances[i]![here]!),
      owner: here,
    });

    if (here === next) continue;

    // The ridge crossing. `f(s) = t0(s) − t1(s)` is linear along the edge, so this is exact.
    const f0 = distances[i]![0]! - distances[i]![1]!;
    const f1 = distances[j]![0]! - distances[j]![1]!;
    const s = f0 / (f0 - f1);
    if (!Number.isFinite(s) || s <= 0 || s >= 1) continue;

    const start = ring[i]!.clone().lerp(ring[j]!, s);
    out.push({
      start,
      end: start.clone().addScaledVector(axis, hitDistance(start, axis, planes[0])),
      owner: -1,
    });
  }
  return out;
}

/** The member: its own start cap, its sides, and the hip end — all from one list of end points. */
function buildMember(points: EndPoint[], axis: Vector3): BufferGeometry {
  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = points.length;

  // The sides. Each band is planar by construction: its four corners lie in the plane through the two
  // ring points spanned by the ring edge and the axis, because both ends travel along the SAME axis.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    pushQuad(
      buffers,
      [at(points[j]!.start), at(points[i]!.start), at(points[i]!.end), at(points[j]!.end)],
      undefined,
    );
  }

  // The start cap, square to the axis.
  const startNormal = axis.clone().negate();
  for (let i = 1; i < count - 1; i++) {
    pushTriangle(
      buffers,
      [at(points[0]!.start), at(points[i]!.start), at(points[i + 1]!.start)],
      at(startNormal),
    );
  }

  // The end cap, ONE FAN PER FACET. Fanning the whole loop would span both planes and give non-planar
  // triangles — the ridge is exactly where the cap must be cut in two.
  const ridges = points.map((p, i) => (p.owner === -1 ? i : -1)).filter((i) => i >= 0);
  if (ridges.length === 2) {
    for (const [from, to] of [
      [ridges[0]!, ridges[1]!],
      [ridges[1]!, ridges[0]!],
    ]) {
      // Walk the cycle from one ridge point to the other; both belong to this facet's plane.
      const arc: Vector3[] = [];
      for (let i = from; ; i = (i + 1) % count) {
        arc.push(points[i]!.end);
        if (i === to) break;
      }
      for (let i = 1; i < arc.length - 1; i++) {
        pushTriangle(buffers, [at(arc[0]!), at(arc[i]!), at(arc[i + 1]!)], undefined);
      }
    }
  } else {
    // No crossing: every point met the same plane, so this is an ordinary seat cut.
    for (let i = 1; i < count - 1; i++) {
      pushTriangle(buffers, [at(points[0]!.end), at(points[i]!.end), at(points[i + 1]!.end)], undefined);
    }
  }

  return toBufferGeometry(buffers);
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.9, 1.5, 2.2],
  });

  camera.fov = 22;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0.15, 0, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(1.1, 1.2, 1.2);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.8, -0.4, 0.7);
  scene.add(key, bounce);

  const timber = new MeshStandardMaterial({
    color: 0xc9b58c,
    roughness: 0.7,
    // A hip's two facets MUST each be flat. Flat shading is the check: a facet shading in two tones is
    // not planar, and the split failed.
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const surface = new MeshBasicMaterial({
    color: 0x6bb6ff,
    transparent: true,
    opacity: 0.16,
    side: DoubleSide,
    depthWrite: false,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const ridgeLine = new LineBasicMaterial({ color: 0xffd166 });

  const params = {
    end: "hip" as "square" | "seat" | "hip",
    corner: "inside" as "inside" | "outside",
    cornerAngle: 90,
    azimuth: 0,
    rake: 0,
    length: 1.1,
    barWidth: 0.16,
    sides: 4,
    showPlanes: true,
    wireframe: false,
    opacity: 1,
    facets: "",
    planarity: "",
    verdict: "",
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

    // The corner: two planes sharing a vertical ridge on the Y axis, splaying toward +X. Their normals
    // point into the wedge between them, which is where the member lives.
    const half = MathUtils.degToRad(params.cornerAngle) / 2;
    const planes: [Plane, Plane] = [
      { point: new Vector3(), normal: new Vector3(Math.sin(half), 0, -Math.cos(half)) },
      { point: new Vector3(), normal: new Vector3(Math.sin(half), 0, Math.cos(half)) },
    ];

    // The member, aimed back down the wedge at the ridge. Azimuth swings it off the bisector; rake tilts
    // it out of horizontal, which is what makes a real hip rafter's cut compound.
    const azimuth = MathUtils.degToRad(params.azimuth);
    const rake = MathUtils.degToRad(params.rake);
    const axis = new Vector3(
      -Math.cos(rake) * Math.cos(azimuth),
      -Math.sin(rake),
      -Math.cos(rake) * Math.sin(azimuth),
    ).normalize();
    const start = axis.clone().multiplyScalar(-params.length);

    // A frame for the start ring — any frame perpendicular to the axis will do, so the cheapest is the
    // one `miterFrames` already builds for a straight run.
    const station = miterFrames(linePath(start, start.clone().add(axis), 1), {
      reference: new Vector3(0, 1, 0),
    })[0]!;
    const profile = circleProfile(params.barWidth / 2, Math.max(3, Math.round(params.sides)));
    const ring = profile.map(([px, py]) =>
      station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
    );

    let points: EndPoint[];
    if (params.end === "hip") {
      points = hipEnd(ring, axis, planes, params.corner === "inside" ? "min" : "max");
    } else if (params.end === "seat") {
      // What the library manages today: one plane for the whole end. Pick the one the member's CENTRE
      // meets, which is the best a single cut can do.
      const centre = ring
        .reduce((sum, p) => sum.add(p), new Vector3())
        .divideScalar(ring.length);
      const t = [hitDistance(centre, axis, planes[0]), hitDistance(centre, axis, planes[1])];
      const chosen = params.corner === "inside" ? (t[0]! <= t[1]! ? 0 : 1) : t[0]! >= t[1]! ? 0 : 1;
      points = ring.map((p) => ({
        start: p.clone(),
        end: p.clone().addScaledVector(axis, hitDistance(p, axis, planes[chosen]!)),
        owner: chosen,
      }));
    } else {
      // Square to its own axis — the bare end, ignoring the corner entirely.
      const centre = ring.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(ring.length);
      const t = Math.min(hitDistance(centre, axis, planes[0]), hitDistance(centre, axis, planes[1]));
      points = ring.map((p) => ({
        start: p.clone(),
        end: p.clone().addScaledVector(axis, t),
        owner: 0,
      }));
    }

    const geometry = buildMember(points, axis);
    stage.add(new Mesh(geometry, timber));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (params.showPlanes) {
      // A patch of each bounding plane, and the ridge they share.
      for (const plane of planes) {
        const along = new Vector3().crossVectors(plane.normal, new Vector3(0, 1, 0)).normalize();
        const up = new Vector3(0, 1, 0);
        const size = params.length * 0.8;
        const corners = [
          plane.point.clone().addScaledVector(along, -size).addScaledVector(up, -size * 0.6),
          plane.point.clone().addScaledVector(along, size).addScaledVector(up, -size * 0.6),
          plane.point.clone().addScaledVector(along, size).addScaledVector(up, size * 0.6),
          plane.point.clone().addScaledVector(along, -size).addScaledVector(up, size * 0.6),
        ];
        const patch = new BufferGeometry().setFromPoints([
          corners[0]!,
          corners[1]!,
          corners[2]!,
          corners[0]!,
          corners[2]!,
          corners[3]!,
        ]);
        stage.add(new Mesh(patch, surface));
      }
      stage.add(
        new LineSegments(
          new BufferGeometry().setFromPoints([
            new Vector3(0, -params.length * 0.5, 0),
            new Vector3(0, params.length * 0.5, 0),
          ]),
          ridgeLine,
        ),
      );
    }

    timber.opacity = params.opacity;
    timber.transparent = params.opacity < 1;
    timber.depthWrite = params.opacity >= 1;

    // How many points landed on each plane, and how flat each facet came out. A facet that is not planar
    // means the split failed — and this is the number the whole study turns on.
    const onA = points.filter((p) => p.owner === 0).length;
    const onB = points.filter((p) => p.owner === 1).length;
    const onRidge = points.filter((p) => p.owner === -1).length;
    params.facets = `${onA} + ${onB} points, ${onRidge} on the ridge`;

    let worst = 0;
    for (const [index, plane] of planes.entries()) {
      for (const point of points) {
        if (point.owner !== index && point.owner !== -1) continue;
        worst = Math.max(worst, Math.abs(point.end.clone().sub(plane.point).dot(plane.normal)));
      }
    }
    params.planarity = worst.toExponential(2);

    // The construction's DOMAIN, and the study found it: every ring point has to start on the legal side
    // of both planes. Swing the member far enough off the bisector and part of its start ring is already
    // through a plane, so `t` for that plane is NEGATIVE — the point would have to travel BACKWARD to
    // reach it, `min` happily picks it, and the end lands outside the corner. It is not a flaw in the
    // loft; there is simply no correct cut when the member is already buried before it starts.
    const outside = points.some(({ start: p }) => {
      const d0 = p.clone().sub(planes[0].point).dot(planes[0].normal);
      const d1 = p.clone().sub(planes[1].point).dot(planes[1].normal);
      return params.corner === "inside" ? d0 < 0 || d1 < 0 : d0 < 0 && d1 < 0;
    });

    params.verdict = outside
      ? "OUT OF DOMAIN — the start ring is already through a plane"
      : onRidge === 2
        ? "two facets on a clean ridge"
        : onRidge === 0
          ? "degenerate — one plane took every point"
          : `unexpected: ${onRidge} ridge points`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Hip End");

  const end = gui.addFolder("End");
  end
    .add(params, "end", {
      "Square — ignores the corner": "square",
      "Seat — one plane": "seat",
      "Hip — two planes": "hip",
    })
    .name("Cut")
    .onChange(rebuild);
  // The one word that separates the two kinds of corner: FIRST plane met, or LAST.
  end
    .add(params, "corner", { "Inside — pointed (min)": "inside", "Outside — notched (max)": "outside" })
    .name("Corner")
    .onChange(rebuild);
  end.open();

  const corner = gui.addFolder("Corner");
  corner.add(params, "cornerAngle", 30, 165, 1).name("Angle").onChange(rebuild);
  corner.open();

  const member = gui.addFolder("Member");
  // Swing it off the bisector and the hip degenerates on its own — every ring point starts choosing the
  // same plane, and the construction quietly becomes a seat cut.
  member.add(params, "azimuth", -80, 80, 1).name("Azimuth").onChange(rebuild);
  // A real hip rafter is raked, which is what makes its cut compound. Here it costs nothing.
  member.add(params, "rake", -60, 60, 1).name("Rake").onChange(rebuild);
  member.add(params, "length", 0.5, 2, 0.05).name("Length").onChange(rebuild);
  member.add(params, "barWidth", 0.04, 0.4, 0.01).name("Width").onChange(rebuild);
  // 4 is square stock, 12 reads round. A round member's hip is where the ridge really shows.
  member.add(params, "sides", 3, 24, 1).name("Sides").onChange(rebuild);
  member.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showPlanes").name("Bounding Planes").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "facets").name("Facets").listen().disable();
  readout.add(params, "planarity").name("Off-plane").listen().disable();
  readout.add(params, "verdict").name("Verdict").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    timber.dispose();
    surface.dispose();
    wire.dispose();
    ridgeLine.dispose();
    dispose();
  };
}

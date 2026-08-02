import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Path,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  type ArchStyle,
  circleProfile,
  createGeometryBuffers,
  linePath,
  miterFrames,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  traceArch,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Curved Boundary",
  description:
    "STUDY — taxonomy (6), the last one: a member terminating on an ARC rather than a plane. It was filed " +
    "as unsolved because there is no flat plane to cut against. There did not need to be. **In a low-poly " +
    "library the arch is ALREADY a polyline** — `segments` made it one — and a polyline is a sequence of " +
    "planes, so this is the hip end with N facets instead of two. Nothing new: cast every ring point along " +
    "the axis to whichever boundary segment it meets, and split the ring wherever that changes. Drop Arch " +
    "Segments to 6 and the came's end grows exactly as many facets as the arch has edges under it; raise " +
    "it and the end follows the curve as closely as the curve itself is cut. The member can never be " +
    "smoother than its boundary, and it is never rougher. DOMAIN: every ring point has to START inside the " +
    "opening. One that begins outside still meets the boundary — from the wrong side — so the cut is " +
    "geometrically correct and completely meaningless, and it reads as a long taper. Set Start Y to 0 with " +
    "any real Width and half the member is below the sill; the readout says so rather than leaving you to " +
    "wonder whether the miter broke.",
};

/** 2D cross product — the sign tells which side of `a` the vector `b` lies on. */
const cross2 = (a: Vector2, b: Vector2) => a.x * b.y - a.y * b.x;

/** Where a ray from `p` along `d` first meets a closed polyline. `-1` owner when it misses entirely. */
function castToBoundary(p: Vector2, d: Vector2, boundary: Vector2[]): { t: number; owner: number } {
  let best = Infinity;
  let owner = -1;

  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const edge = b.clone().sub(a);
    const denominator = cross2(d, edge);
    // Parallel to this edge: it is either missed entirely or grazed, and neither is a cut.
    if (Math.abs(denominator) < 1e-12) continue;

    const w = a.clone().sub(p);
    const t = cross2(w, edge) / denominator;
    const u = cross2(w, d) / denominator;
    // The SEGMENT, not its infinite line — which is the whole reason this works on a concave arch (an
    // ogee) as well as a convex one. Taking the nearest plane would cut against edges that are not there.
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) {
      best = t;
      owner = i;
    }
  }
  return { t: best, owner };
}

/**
 * Is the point inside the closed boundary? Even-odd ray cast.
 *
 * This is the construction's DOMAIN, and it is not optional. A ring point that starts OUTSIDE the opening
 * still meets the boundary — from the wrong side — so the cast returns a perfectly good answer to a
 * meaningless question. A member half below the sill has its lower points cut against the sill from
 * underneath while its upper points run on to the jamb, and the end comes out as a long taper. Every point
 * lands exactly on the boundary; the input was simply not a member that fits in the opening.
 */
function insideBoundary(p: Vector2, boundary: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i]!;
    const b = boundary[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

interface EndPoint {
  start: Vector3;
  end: Vector3;
  /** Which boundary segment this point landed on; `-1` for a point sitting on a shared vertex. */
  owner: number;
}

/**
 * THE CONSTRUCTION — the hip end, with N planes instead of two.
 *
 * Every ring point runs along the axis until it meets the boundary, and takes whichever SEGMENT it meets
 * first. Where consecutive ring points meet different segments, the ring edge is split — and for a
 * polyline that crossing is not "where two distances are equal" but "where the ray passes exactly through
 * the shared VERTEX", which is a different equation with the same happy property: it is linear in the
 * edge parameter, so the root is one division rather than a search.
 *
 * The member ends up with exactly as many facets as the boundary has edges beneath it. It cannot be
 * smoother than its boundary, and it is never rougher — which is the correct relationship, and the reason
 * `segments` on the arch is the only knob that needs to exist.
 */
function followBoundary(ring: Vector3[], axis: Vector3, boundary: Vector2[]): EndPoint[] {
  const flat = new Vector2(axis.x, axis.y).normalize();
  const hits = ring.map((p) => castToBoundary(new Vector2(p.x, p.y), flat, boundary));

  // A ring point that never meets the boundary has no end at all. Dropping it would quietly delete a
  // vertex from a closed loop and open the solid — the same class of hole the cap used to have — so the
  // whole build is refused instead, and the study says so.
  if (hits.some((h) => h.owner < 0)) return [];

  const out: EndPoint[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const here = hits[i]!;
    const next = hits[j]!;

    out.push({
      start: ring[i]!.clone(),
      end: ring[i]!.clone().addScaledVector(axis, here.t),
      owner: here.owner,
    });

    if (here.owner === next.owner) continue;

    // Every vertex between the two segments is a crossing — a wide member over a finely cut arch spans
    // several at once, and each one needs its own split or the facets in between are lost.
    //
    // Walk the SHORT way round. Segment indices are cyclic — the sill is `0` and the left jamb is the last
    // index, and they share the opening's bottom-left corner — so comparing them as plain numbers sends
    // the walk the long way over the crown, inserting a split at every arch vertex instead of the one at
    // the corner.
    const total = boundary.length;
    const ahead = (next.owner - here.owner + total) % total;
    const behind = (here.owner - next.owner + total) % total;
    const step = ahead <= behind ? 1 : -1;
    const steps = Math.min(ahead, behind);

    let k = here.owner;
    for (let c = 0; c < steps; c++) {
      const vertex = boundary[step > 0 ? (k + 1) % total : k]!;
      // The ray from `p(s)` passes through `vertex` when `(vertex − p(s)) × d = 0`, and `p(s)` is linear
      // in `s`, so this is exact.
      const gi = cross2(vertex.clone().sub(new Vector2(ring[i]!.x, ring[i]!.y)), flat);
      const gj = cross2(vertex.clone().sub(new Vector2(ring[j]!.x, ring[j]!.y)), flat);
      const s = gi / (gi - gj);
      k = (k + step + total) % total;
      if (!Number.isFinite(s) || s <= 0 || s >= 1) continue;

      const start = ring[i]!.clone().lerp(ring[j]!, s);
      out.push({ start, end: new Vector3(vertex.x, vertex.y, start.z), owner: -1 });
    }
  }
  return out;
}

/** The member: sides, a square start cap, and an end cap fanned ONE FACET AT A TIME. */
function buildMember(points: EndPoint[], axis: Vector3): BufferGeometry {
  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = points.length;
  if (count < 3) return toBufferGeometry(buffers);

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    pushQuad(
      buffers,
      [at(points[j]!.start), at(points[i]!.start), at(points[i]!.end), at(points[j]!.end)],
      undefined,
    );
  }

  const startNormal = axis.clone().negate();
  for (let i = 1; i < count - 1; i++) {
    pushTriangle(
      buffers,
      [at(points[0]!.start), at(points[i]!.start), at(points[i + 1]!.start)],
      at(startNormal),
    );
  }

  capEnd(buffers, points, axis);
  return toBufferGeometry(buffers);
}

/**
 * The end cap, triangulated so that **no triangle spans two facets**.
 *
 * The naive move is a fan per run of points sharing a segment, closing each run with the chord between its
 * two crossings. That tiles the cap only when there are exactly TWO crossings, because then the two chords
 * are the same edge and the fans meet along it. With four or more, the chords bound an inner polygon that
 * nothing fills — a hole in the cap, and the reason a came straddling two arch vertices came out open.
 *
 * The real structure: the cast reads only a point's LATERAL offset (the ray direction is fixed, so points
 * differing along the member's thickness get the identical answer). The facet boundaries are therefore
 * lines of constant lateral offset, and the cap — which projects exactly onto the ring, since every point
 * travels along the same axis — is a polygon MONOTONE in that coordinate, with a vertex on both of its
 * chains at every cut.
 *
 * So walk the two chains together in lateral order. Each triangle then lies between two adjacent cuts,
 * which is to say on a single facet, and the cap closes.
 */
function capEnd(
  buffers: ReturnType<typeof createGeometryBuffers>,
  points: EndPoint[],
  axis: Vector3,
): void {
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = points.length;

  // Lateral offset, measured on the START ring where the geometry is still a flat convex polygon.
  const center = points
    .reduce((sum, p) => sum.add(p.start), new Vector3())
    .divideScalar(count);
  const lateral = new Vector3(-axis.y, axis.x, 0).normalize();
  const u = points.map((p) => p.start.clone().sub(center).dot(lateral));

  let low = 0;
  let high = 0;
  for (let i = 1; i < count; i++) {
    if (u[i]! < u[low]!) low = i;
    if (u[i]! > u[high]!) high = i;
  }

  // The two chains from the lowest lateral vertex to the highest, one each way round the loop.
  const chain = (step: number) => {
    const out = [low];
    for (let i = (low + step + count) % count; i !== high; i = (i + step + count) % count) out.push(i);
    out.push(high);
    return out;
  };
  const forward = chain(1);
  const backward = chain(-1);

  // Merge-walk: always advance whichever chain has the nearer next vertex, so no triangle ever reaches
  // past a cut — every cut is a vertex on both chains.
  let a = 0;
  let b = 0;
  while (a < forward.length - 1 || b < backward.length - 1) {
    const advanceForward =
      b >= backward.length - 1 ||
      (a < forward.length - 1 && u[forward[a + 1]!]! <= u[backward[b + 1]!]!);

    if (advanceForward) {
      pushTriangle(
        buffers,
        [at(points[forward[a]!]!.end), at(points[backward[b]!]!.end), at(points[forward[a + 1]!]!.end)],
        undefined,
      );
      a++;
    } else {
      pushTriangle(
        buffers,
        [at(points[forward[a]!]!.end), at(points[backward[b]!]!.end), at(points[backward[b + 1]!]!.end)],
        undefined,
      );
      b++;
    }
  }
}

/** The opening's outline: sill, jambs, and the named arch across the head. */
function openingBoundary(
  halfSpan: number,
  springY: number,
  style: ArchStyle,
  archHeight: number,
  segments: number,
): Vector2[] {
  const path = new Path();
  path.moveTo(halfSpan, springY);
  traceArch(path, { style, halfSpan, y: springY, rise: archHeight, from: "right", to: "left" });
  // Right springing round to the left one, over the crown.
  const head = path.getPoints(Math.max(2, Math.round(segments)));

  return [new Vector2(-halfSpan, 0), new Vector2(halfSpan, 0), ...head.map((p) => new Vector2(p.x, p.y))];
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    // The arch reaches 1.8 tall at the defaults — springing 1.1 plus a 0.7 rise — and the previous
    // [0.9, 1.9, 2.6] framed only 1.23 of vertical, so the head was outside the view before you touched
    // anything. Raising the arch height pushes it further still.
    cameraPosition: [1.7, 2.5, 5.0],
  });

  camera.fov = 24;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  // Mid-height of the whole arch rather than of the springing line.
  controls.target.set(0, 0.9, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(0.8, 1.2, 1.5);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.8, -0.3, 0.7);
  scene.add(key, bounce);

  const lead = new MeshStandardMaterial({
    color: 0xb9bfc9,
    roughness: 0.6,
    metalness: 0.2,
    // Each facet of the end MUST be flat. A facet shading in two tones means a split was missed.
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  // Out-of-domain builds are still DRAWN — seeing the failure is the point of a study — but they must not
  // be mistakable for a result. A readout is easy to miss when the viewport looks plausible, and an
  // out-of-domain wedge looks very plausible indeed: it is a geometrically perfect cut, just to a question
  // that was never meaningful.
  const invalid = new MeshStandardMaterial({
    color: 0xd85a5a,
    roughness: 0.6,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const outline = new LineBasicMaterial({ color: 0xffd166 });
  // A refusal has to be VISIBLE. When the construction declines to build there is no mesh to tint, and an
  // empty viewport reads as a crash rather than as a rejection — so the member is ghosted in its place,
  // showing where it sat and which way it pointed.
  const rejected = new LineBasicMaterial({ color: 0xd85a5a });

  const params = {
    style: "semicircle" as ArchStyle,
    halfSpan: 0.7,
    springY: 1.1,
    archHeight: 0.7,
    archSegments: 16,
    follow: true,
    aim: 62,
    offsetX: -0.35,
    startY: 0.35,
    barWidth: 0.09,
    sides: 4,
    showBoundary: true,
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
      if (child instanceof Mesh || child instanceof LineSegments || child instanceof Line) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const boundary = openingBoundary(
      params.halfSpan,
      params.springY,
      params.style,
      params.archHeight,
      params.archSegments,
    );

    const aim = MathUtils.degToRad(params.aim);
    const axis = new Vector3(Math.cos(aim), Math.sin(aim), 0).normalize();
    const start = new Vector3(params.offsetX, params.startY, 0);

    const station = miterFrames(linePath(start, start.clone().add(axis), 1), {
      reference: new Vector3(0, 0, 1),
    })[0]!;
    const profile = circleProfile(params.barWidth / 2, Math.max(3, Math.round(params.sides)));
    const ring = profile.map(([px, py]) =>
      station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
    );

    let points: EndPoint[];
    if (params.follow) {
      points = followBoundary(ring, axis, boundary);
    } else {
      // What a single cut manages: one plane for the whole end, taken where the member's CENTER lands.
      const center = ring.reduce((s, p) => s.add(p), new Vector3()).divideScalar(ring.length);
      const hit = castToBoundary(new Vector2(center.x, center.y), new Vector2(axis.x, axis.y), boundary);
      const a = boundary[hit.owner]!;
      const b = boundary[(hit.owner + 1) % boundary.length]!;
      const edge = b.clone().sub(a);
      const normal = new Vector3(-edge.y, edge.x, 0).normalize();
      points = ring.map((p) => {
        const denominator = axis.dot(normal);
        const t =
          new Vector3(a.x, a.y, p.z).sub(p).dot(normal) / (Math.abs(denominator) < 1e-9 ? 1 : denominator);
        return { start: p.clone(), end: p.clone().addScaledVector(axis, t), owner: hit.owner };
      });
    }

    // The domain check, before anything is believed. A member that starts partly outside the opening gets
    // a geometrically correct cut to a question that was never meaningful.
    const strays = ring.filter((p) => !insideBoundary(new Vector2(p.x, p.y), boundary)).length;

    const geometry = buildMember(points, axis);
    stage.add(new Mesh(geometry, strays > 0 ? invalid : lead));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (points.length < 3) {
      // Refused. Ghost the member where it stood, so a rejection cannot be mistaken for a crash.
      stage.add(new Line(new BufferGeometry().setFromPoints([...ring, ring[0]!]), rejected));
      stage.add(
        new Line(
          new BufferGeometry().setFromPoints([start, start.clone().addScaledVector(axis, params.halfSpan)]),
          rejected,
        ),
      );
    }

    if (params.showBoundary) {
      const loop = [...boundary, boundary[0]!].map((p) => new Vector3(p.x, p.y, 0));
      stage.add(new Line(new BufferGeometry().setFromPoints(loop), outline));
    }

    for (const material of [lead, invalid]) {
      material.opacity = params.opacity;
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    // How many boundary segments the end spans, and whether each facet really lies on its own segment.
    //
    // Count the ARCS, not the distinct owners of the original ring points. A four-sided came has only
    // four points carrying an owner, so counting those caps the answer at four however finely the arch is
    // cut — which is exactly wrong, since the whole claim is that the end follows the boundary. Each
    // crossing separates two facets around a closed loop, so N crossings is N facets.
    const crossings = points.filter((p) => p.owner === -1).length;
    const facets = crossings >= 2 ? crossings : 1;
    params.facets = `${facets} facet${facets === 1 ? "" : "s"}, ${crossings} crossings`;

    let worst = 0;
    for (const point of points) {
      if (point.owner < 0) continue;
      const a = boundary[point.owner]!;
      const b = boundary[(point.owner + 1) % boundary.length]!;
      const edge = b.clone().sub(a);
      const normal = new Vector2(-edge.y, edge.x).normalize();
      worst = Math.max(worst, Math.abs(new Vector2(point.end.x, point.end.y).sub(a).dot(normal)));
    }
    params.planarity = worst.toExponential(2);
    params.verdict =
      strays > 0
        ? `OUT OF DOMAIN — ${strays} of ${ring.length} ring points start outside the opening`
        : points.length < 3
          ? "member misses the boundary entirely"
          : facets > 1
            ? `end follows ${facets} edges of the arch`
            : "single facet — the member fits under one edge";
  };
  rebuild();

  const gui = new GUI();
  gui.title("Curved Boundary");

  const end = gui.addFolder("End");
  // The whole comparison: one plane for the end, or the boundary itself.
  end.add(params, "follow").name("Follow the Boundary").onChange(rebuild);
  end.open();

  const arch = gui.addFolder("Arch");
  arch
    .add(params, "style", [
      "square",
      "segmental",
      "semicircle",
      "horseshoe",
      "elliptical",
      "pointed",
      "ogee",
    ])
    .name("Style")
    .onChange(rebuild);
  // THE knob. The member cannot be smoother than the boundary it dies into — drop this and watch the
  // came's end lose facets in step with the arch.
  arch.add(params, "archSegments", 3, 48, 1).name("Segments").onChange(rebuild);
  arch.add(params, "halfSpan", 0.3, 1.1, 0.01).name("Half Span").onChange(rebuild);
  arch.add(params, "archHeight", 0.1, 1.2, 0.01).name("Rise").onChange(rebuild);
  arch.add(params, "springY", 0.4, 1.6, 0.01).name("Springing").onChange(rebuild);
  arch.open();

  const member = gui.addFolder("Member");
  member.add(params, "aim", 5, 175, 1).name("Aim").onChange(rebuild);
  member.add(params, "offsetX", -1, 1, 0.01).name("Start X").onChange(rebuild);
  member.add(params, "startY", 0, 1.4, 0.01).name("Start Y").onChange(rebuild);
  // A wide came over a finely cut arch spans several edges at once — which is where the multi-crossing
  // split earns its keep.
  member.add(params, "barWidth", 0.02, 0.35, 0.005).name("Width").onChange(rebuild);
  member.add(params, "sides", 3, 16, 1).name("Sides").onChange(rebuild);
  member.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showBoundary").name("Boundary Outline").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "facets").name("End").listen().disable();
  readout.add(params, "planarity").name("Off-segment").listen().disable();
  readout.add(params, "verdict").name("Verdict").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    lead.dispose();
    invalid.dispose();
    rejected.dispose();
    wire.dispose();
    outline.dispose();
    dispose();
  };
}

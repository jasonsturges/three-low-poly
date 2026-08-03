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
  title: "Spanning Member",
  description:
    "STUDY — the came that crosses the WHOLE opening, cut into the leading at BOTH ends. This is what the " +
    "arched lattice window has always needed: a box-ended bar leaves teeth poking out through the frame, " +
    "and the fix is to let the boundary decide where each end stops. It is `curved-boundary` run twice, " +
    "once along the axis and once against it — with one thing that does not come free. The two ends cross " +
    "DIFFERENT arch edges, so they need different splits in the ring, and the sides have to be built on a " +
    "ring carrying BOTH sets or the bands tear. Spin turns it like a propeller: the ends hand off between " +
    "the sill, the jambs and the arch as it turns, and neither end ever knows what the other is doing.",
};

const cross2 = (a: Vector2, b: Vector2) => a.x * b.y - a.y * b.x;

/** Where a ray from `p` along `d` first meets a closed polyline. `owner: -1` when it misses. */
function castToBoundary(p: Vector2, d: Vector2, boundary: Vector2[]): { t: number; owner: number } {
  let best = Infinity;
  let owner = -1;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const edge = b.clone().sub(a);
    const denominator = cross2(d, edge);
    if (Math.abs(denominator) < 1e-12) continue;
    const w = a.clone().sub(p);
    const t = cross2(w, edge) / denominator;
    const u = cross2(w, d) / denominator;
    // The SEGMENT, not its infinite line — what makes a concave ogee work.
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) {
      best = t;
      owner = i;
    }
  }
  return { t: best, owner };
}

/** Even-odd ray cast. A member that starts outside gets a perfect cut to a meaningless question. */
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

/**
 * Where along a ring edge the winning boundary segment changes, for one direction.
 *
 * The ray through `lerp(a, b, s)` passes through a boundary vertex when `(vertex − p(s)) × d = 0`, and
 * `p(s)` is linear in `s`, so each root is one division. A wide member crosses several vertices at once,
 * so every one between the two owners contributes a split.
 */
function splitParams(a: Vector3, b: Vector3, d: Vector2, boundary: Vector2[]): number[] {
  const here = castToBoundary(new Vector2(a.x, a.y), d, boundary);
  const next = castToBoundary(new Vector2(b.x, b.y), d, boundary);
  if (here.owner < 0 || next.owner < 0 || here.owner === next.owner) return [];

  // Walk the SHORT way round. Segment indices are cyclic — the sill is `0` and the left jamb is the last
  // index, and they share the opening's bottom-left corner — so comparing them as plain numbers sends the
  // walk the long way over the crown, inserting a split at every arch vertex instead of the one at the
  // corner. Measured on a member crossing that corner: 34 splits where 1 was wanted.
  const count = boundary.length;
  const ahead = (next.owner - here.owner + count) % count;
  const behind = (here.owner - next.owner + count) % count;
  const step = ahead <= behind ? 1 : -1;
  const steps = Math.min(ahead, behind);

  const out: number[] = [];
  let k = here.owner;
  for (let i = 0; i < steps; i++) {
    const vertex = boundary[step > 0 ? (k + 1) % count : k]!;
    const gi = cross2(vertex.clone().sub(new Vector2(a.x, a.y)), d);
    const gj = cross2(vertex.clone().sub(new Vector2(b.x, b.y)), d);
    const s = gi / (gi - gj);
    if (Number.isFinite(s) && s > 1e-9 && s < 1 - 1e-9) out.push(s);
    k = (k + step + count) % count;
  }
  return out;
}

interface Span {
  /** The point on the member's own ring. */
  ring: Vector3;
  /** Where it lands going backward along the axis, and forward. */
  back: Vector3;
  front: Vector3;
}

/**
 * THE ITERATION — both ends at once, on ONE ring.
 *
 * `curved-boundary` cut a single end, so it could subdivide the ring to suit that end alone. Spanning the
 * opening breaks that: the two ends cross different arch edges, so each wants its own splits, and a side
 * band built on a ring that carries only one set would tear where the other set falls.
 *
 * So the splits are computed for BOTH directions first, unioned per ring edge, and the ring is subdivided
 * once with all of them. Every band then has a vertex wherever either end needs one — and a split the far
 * end did not ask for costs a degenerate seam, never a hole.
 */
function spanOpening(ring: Vector3[], axis: Vector3, boundary: Vector2[]): Span[] {
  const forward = new Vector2(axis.x, axis.y).normalize();
  const backward = forward.clone().negate();

  const points: Vector3[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    points.push(a.clone());

    const cuts = [...splitParams(a, b, forward, boundary), ...splitParams(a, b, backward, boundary)]
      .sort((p, q) => p - q)
      // A vertex both ends happen to want is still one vertex.
      .filter((s, index, all) => index === 0 || s - all[index - 1]! > 1e-9);

    for (const s of cuts) points.push(a.clone().lerp(b, s));
  }

  const spans: Span[] = [];
  for (const p of points) {
    const flat = new Vector2(p.x, p.y);
    const ahead = castToBoundary(flat, forward, boundary);
    const behind = castToBoundary(flat, backward, boundary);
    // A point that escapes in either direction has no member at all; refusing the whole build beats
    // silently dropping a vertex out of a closed loop.
    if (ahead.owner < 0 || behind.owner < 0) return [];
    spans.push({
      ring: p,
      front: p.clone().addScaledVector(axis, ahead.t),
      back: p.clone().addScaledVector(axis, -behind.t),
    });
  }
  return spans;
}

/**
 * A cap, triangulated so that no triangle spans two facets.
 *
 * The cast reads only a point's LATERAL offset, so facet boundaries are lines of constant lateral offset
 * and the cap — which projects exactly onto the ring — is monotone in that coordinate, with a vertex on
 * both chains at every cut. Walking the two chains in lateral order therefore never reaches past a cut.
 */
function capEnd(
  buffers: ReturnType<typeof createGeometryBuffers>,
  spans: Span[],
  pick: (s: Span) => Vector3,
  axis: Vector3,
  flip: boolean,
): void {
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = spans.length;
  const center = spans.reduce((sum, s) => sum.add(s.ring), new Vector3()).divideScalar(count);
  const lateral = new Vector3(-axis.y, axis.x, 0).normalize();
  const u = spans.map((s) => s.ring.clone().sub(center).dot(lateral));

  let low = 0;
  let high = 0;
  for (let i = 1; i < count; i++) {
    if (u[i]! < u[low]!) low = i;
    if (u[i]! > u[high]!) high = i;
  }

  const chain = (step: number) => {
    const out = [low];
    for (let i = (low + step + count) % count; i !== high; i = (i + step + count) % count) out.push(i);
    out.push(high);
    return out;
  };
  const forward = chain(1);
  const backward = chain(-1);

  const emit = (a: number, b: number, c: number) => {
    const tri: [Vec3, Vec3, Vec3] = [at(pick(spans[a]!)), at(pick(spans[b]!)), at(pick(spans[c]!))];
    pushTriangle(buffers, flip ? [tri[0], tri[2], tri[1]] : tri, undefined);
  };

  let a = 0;
  let b = 0;
  while (a < forward.length - 1 || b < backward.length - 1) {
    const advance =
      b >= backward.length - 1 ||
      (a < forward.length - 1 && u[forward[a + 1]!]! <= u[backward[b + 1]!]!);
    if (advance) {
      emit(forward[a]!, backward[b]!, forward[a + 1]!);
      a++;
    } else {
      emit(forward[a]!, backward[b]!, backward[b + 1]!);
      b++;
    }
  }
}

/** The member: sides between the two ends, and a cap on each. */
function buildSpan(spans: Span[], axis: Vector3): BufferGeometry {
  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = spans.length;
  if (count < 3) return toBufferGeometry(buffers);

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    pushQuad(
      buffers,
      [at(spans[j]!.back), at(spans[i]!.back), at(spans[i]!.front), at(spans[j]!.front)],
      undefined,
    );
  }

  capEnd(buffers, spans, (s) => s.front, axis, false);
  capEnd(buffers, spans, (s) => s.back, axis, true);
  return toBufferGeometry(buffers);
}

/** The opening's outline: sill, jambs, and the named arch across the head. */
function openingBoundary(
  halfSpan: number,
  springY: number,
  style: ArchStyle,
  rise: number,
  segments: number,
): Vector2[] {
  const path = new Path();
  path.moveTo(halfSpan, springY);
  traceArch(path, { style, halfSpan, y: springY, rise, from: "right", to: "left" });
  const head = path.getPoints(Math.max(2, Math.round(segments)));
  return [new Vector2(-halfSpan, 0), new Vector2(halfSpan, 0), ...head.map((p) => new Vector2(p.x, p.y))];
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose, onFrame } = createScene(container, {
    background: 0x14171d,
    // The arch reaches 1.8 tall — springing 1.1 plus a 0.7 rise — and the previous [0.5, 1.5, 3.2] framed
    // only 1.48 of vertical. The member also SPINS, sweeping every direction from its center, so the frame
    // has to hold the whole boundary rather than whichever part of it the member happens to be crossing.
    cameraPosition: [1.0, 1.9, 4.6],
  });

  camera.fov = 26;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  // Mid-height of the whole arch, not of the springing line.
  controls.target.set(0, 0.9, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(0.8, 1.2, 1.5);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.8, -0.3, 0.7);
  scene.add(key, bounce);

  const came = new MeshStandardMaterial({
    color: 0xb9bfc9,
    roughness: 0.6,
    metalness: 0.2,
    // Each facet of each end must be flat. A facet shading in two tones means a split was missed.
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  // Out-of-domain builds are drawn but must not be mistakable for a result — an invalid cut is
  // geometrically perfect and looks entirely plausible.
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
  // Dim on purpose: it has to be findable without competing with the joint under study.
  const pivot = new LineBasicMaterial({ color: 0x6f7b8a });

  const params = {
    style: "semicircle" as ArchStyle,
    halfSpan: 0.7,
    springY: 1.1,
    rise: 0.7,
    archSegments: 16,
    centerX: 0,
    centerY: 0.85,
    rotation: 24,
    spin: false,
    spinRate: 20,
    width: 0.09,
    sides: 4,
    showCenter: true,
    showBoundary: true,
    wireframe: false,
    opacity: 1,
    ends: "",
    length: "",
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
      params.rise,
      params.archSegments,
    );

    const angle = MathUtils.degToRad(params.rotation);
    const axis = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    const center = new Vector3(params.centerX, params.centerY, 0);

    const station = miterFrames(linePath(center, center.clone().add(axis), 1), {
      reference: new Vector3(0, 0, 1),
    })[0]!;
    const profile = circleProfile(params.width / 2, Math.max(3, Math.round(params.sides)));
    const ring = profile.map(([px, py]) =>
      station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
    );

    // The member has to START inside the opening, in its entirety — a ring point outside still meets the
    // boundary, from the wrong side, and returns a perfect cut to a meaningless question.
    const strays = ring.filter((p) => !insideBoundary(new Vector2(p.x, p.y), boundary)).length;

    const spans = spanOpening(ring, axis, boundary);
    const geometry = buildSpan(spans, axis);
    stage.add(new Mesh(geometry, strays > 0 ? invalid : came));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (spans.length < 3) {
      // Refused. Ghost the member where it stood — its section and its line — so a rejection cannot be
      // mistaken for the study having broken.
      stage.add(new Line(new BufferGeometry().setFromPoints([...ring, ring[0]!]), rejected));
      const reach = params.halfSpan;
      stage.add(
        new Line(
          new BufferGeometry().setFromPoints([
            center.clone().addScaledVector(axis, -reach),
            center.clone().addScaledVector(axis, reach),
          ]),
          rejected,
        ),
      );
    }

    if (params.showCenter) {
      // A member that spans the whole opening hides the one point you are steering with. A crosshair on
      // the center keeps Center X and Center Y findable no matter how far the ends run.
      const tick = Math.max(params.width, 0.06);
      stage.add(
        new LineSegments(
          new BufferGeometry().setFromPoints([
            center.clone().add(new Vector3(-tick, 0, 0)),
            center.clone().add(new Vector3(tick, 0, 0)),
            center.clone().add(new Vector3(0, -tick, 0)),
            center.clone().add(new Vector3(0, tick, 0)),
          ]),
          pivot,
        ),
      );
    }

    if (params.showBoundary) {
      const loop = [...boundary, boundary[0]!].map((p) => new Vector3(p.x, p.y, 0));
      stage.add(new Line(new BufferGeometry().setFromPoints(loop), outline));
    }

    for (const material of [came, invalid]) {
      material.opacity = params.opacity;
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    if (spans.length >= 3) {
      // Each end's facet count is one per boundary edge it spans. Reported separately, because the whole
      // iteration is that the two ends are independent — they cross different edges and never consult
      // each other.
      const flat = new Vector2(axis.x, axis.y).normalize();
      const edgesHit = (direction: Vector2) =>
        new Set(
          spans.map((s) => castToBoundary(new Vector2(s.ring.x, s.ring.y), direction, boundary).owner),
        ).size;
      params.ends = `front ${edgesHit(flat)} edge(s) · back ${edgesHit(flat.clone().negate())} edge(s)`;
      const centerSpan = spans[0]!;
      params.length = `${centerSpan.front.distanceTo(centerSpan.back).toFixed(4)} · ${spans.length} ring points`;
    } else {
      params.ends = "—";
      params.length = "—";
    }

    params.verdict =
      spans.length < 3
        ? `REFUSED — ${strays} of ${ring.length} ring points start outside; ghosted in place`
        : strays > 0
          ? `OUT OF DOMAIN — ${strays} of ${ring.length} ring points start outside`
          : "both ends cut into the boundary";
  };
  rebuild();

  const stopSpin = onFrame((delta) => {
    if (!params.spin) return;
    params.rotation = (params.rotation + params.spinRate * delta) % 360;
    rebuild();
  });

  const gui = new GUI();
  gui.title("Spanning Member");

  const member = gui.addFolder("Member");
  // The propeller. Both ends hand off between the sill, the jambs and the arch as it turns, and neither
  // end knows what the other is doing.
  member.add(params, "rotation", 0, 360, 0.5).name("Rotation").onChange(rebuild).listen();
  member.add(params, "spin").name("Spin");
  member.add(params, "spinRate", 2, 90, 1).name("Spin Rate");
  member.add(params, "centerX", -0.9, 0.9, 0.01).name("Center X").onChange(rebuild);
  member.add(params, "centerY", 0, 1.8, 0.01).name("Center Y").onChange(rebuild);
  member.add(params, "width", 0.02, 0.35, 0.005).name("Width").onChange(rebuild);
  member.add(params, "sides", 3, 16, 1).name("Sides").onChange(rebuild);
  member.open();

  const arch = gui.addFolder("Opening");
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
  arch.add(params, "archSegments", 3, 48, 1).name("Segments").onChange(rebuild);
  arch.add(params, "halfSpan", 0.3, 1.1, 0.01).name("Half Span").onChange(rebuild);
  arch.add(params, "rise", 0.1, 1.2, 0.01).name("Rise").onChange(rebuild);
  arch.add(params, "springY", 0.4, 1.6, 0.01).name("Springing").onChange(rebuild);
  arch.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showCenter").name("Center Crosshair").onChange(rebuild);
  inspect.add(params, "showBoundary").name("Boundary Outline").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "ends").name("Ends").listen().disable();
  readout.add(params, "length").name("Length").listen().disable();
  readout.add(params, "verdict").name("Verdict").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    stopSpin();
    clear();
    came.dispose();
    invalid.dispose();
    rejected.dispose();
    pivot.dispose();
    wire.dispose();
    outline.dispose();
    dispose();
  };
}

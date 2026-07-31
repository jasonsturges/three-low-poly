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
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  type ArchStyle,
  circleProfile,
  createGeometryBuffers,
  linePath,
  miterFrames,
  offsetLoop,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  traceArch,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Diamond Lattice",
  description:
    "STUDY — the lattice, at last. Every came SPANS the opening and is cut into the leading at both ends by " +
    "the boundary itself, so no came ever pokes a tooth through the frame. The point to take away: there is " +
    "no separate arched case. `square` is an ARCH STYLE — a flat head is still an arch-shaped hole, it just " +
    "has no curve in it — so a rectangular window and a gothic one are the same code with a different " +
    "outline, and the two clipping paths the library carries today collapse into one. The two came families " +
    "are independent, which covers the GREGORIAN lattice too: press its preset and the ±45° diamond becomes " +
    "90°/0° mullions and transoms. Note what that shows — a Gregorian lattice in a SQUARE opening needs no " +
    "cutting at all, because every boundary it meets is already perpendicular to the member; put the same " +
    "lattice under an arch and the mullions run into a curve, and it needs exactly what the diamond needs. " +
    "Cames CROSS each other and are left to interpenetrate, which is correct: lead came crosses lead came, " +
    "and an X-junction has no bisector to share. Explode separates the two families and the glass so you " +
    "can see what merged into the single geometry this is working toward.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CAME       the lead bar holding the glass. Cames CROSS; they are not jointed to each other.
//  LEADING    the cames collectively — the pattern read as one thing.
//  QUARRY     a single pane of glass between cames. Diamond-shaped here, hence "diamond lattice".
//  SPRINGING  the height where the arch leaves the jambs.
//  CHORD      the part of a came's infinite line that lies inside the opening. What actually gets built.

const cross2 = (a: Vector2, b: Vector2) => a.x * b.y - a.y * b.x;

/** Where a ray from `p` along `d` first meets the boundary. `owner: -1` when it misses. */
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
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) {
      best = t;
      owner = i;
    }
  }
  return { t: best, owner };
}

/**
 * Every stretch of the infinite line through `p` along `d` that lies INSIDE the boundary.
 *
 * Not a ray and not one chord: a came laid across an ogee or a horseshoe can enter and leave more than
 * once, so the crossings are collected, sorted, and taken in pairs. Sorting is what makes the non-convex
 * case fall out — between the first and second crossing you are inside, between the second and third you
 * are out, and so on.
 */
function lineChords(p: Vector2, d: Vector2, boundary: Vector2[]): [number, number][] {
  const hits: number[] = [];
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const edge = b.clone().sub(a);
    const denominator = cross2(d, edge);
    if (Math.abs(denominator) < 1e-12) continue;
    const w = a.clone().sub(p);
    const u = cross2(w, d) / denominator;
    // Half-open on `u` so a crossing exactly on a shared vertex is counted once, not twice — otherwise
    // the pairing flips inside for outside for the rest of the line.
    if (u >= 0 && u < 1) hits.push(cross2(w, edge) / denominator);
  }
  hits.sort((a, b) => a - b);

  const chords: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) chords.push([hits[i]!, hits[i + 1]!]);
  return chords;
}

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

/** Where along a ring edge the winning boundary segment changes, for one direction. */
function splitParams(a: Vector3, b: Vector3, d: Vector2, boundary: Vector2[]): number[] {
  const here = castToBoundary(new Vector2(a.x, a.y), d, boundary);
  const next = castToBoundary(new Vector2(b.x, b.y), d, boundary);
  if (here.owner < 0 || next.owner < 0 || here.owner === next.owner) return [];

  // Segment indices are CYCLIC — the sill is 0 and the last jamb is the final index, and they share a
  // corner. Walk the short way or the split runs the long way round the whole outline.
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
  ring: Vector3;
  back: Vector3;
  front: Vector3;
}

/** Both ends cut to the boundary, on ONE ring carrying the splits both ends need. */
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
      .filter((s, index, all) => index === 0 || s - all[index - 1]! > 1e-9);
    for (const s of cuts) points.push(a.clone().lerp(b, s));
  }

  const spans: Span[] = [];
  for (const p of points) {
    const flat = new Vector2(p.x, p.y);
    const ahead = castToBoundary(flat, forward, boundary);
    const behind = castToBoundary(flat, backward, boundary);
    if (ahead.owner < 0 || behind.owner < 0) return [];
    spans.push({
      ring: p,
      front: p.clone().addScaledVector(axis, ahead.t),
      back: p.clone().addScaledVector(axis, -behind.t),
    });
  }
  return spans;
}

/** A cap, walked in lateral order so no triangle spans two facets. */
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
      b >= backward.length - 1 || (a < forward.length - 1 && u[forward[a + 1]!]! <= u[backward[b + 1]!]!);
    if (advance) {
      emit(forward[a]!, backward[b]!, forward[a + 1]!);
      a++;
    } else {
      emit(forward[a]!, backward[b]!, backward[b + 1]!);
      b++;
    }
  }
}

function buildCame(spans: Span[], axis: Vector3): BufferGeometry | null {
  const buffers = createGeometryBuffers();
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];
  const count = spans.length;
  if (count < 3) return null;

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

/**
 * The opening's outline. **`square` is an arch style**, so a rectangular window and a gothic one differ
 * only in these points — there is no separate rectangular code path, and none is wanted.
 */
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
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x141a22,
    cameraPosition: [0.7, 1.5, 3.1],
  });

  camera.fov = 26;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.95, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(0.7, 1.1, 1.6);
  const back = new DirectionalLight(0xa9c4e0, 0.9);
  back.position.set(-0.4, 0.6, -1.5);
  scene.add(key, back);

  const lead = new MeshStandardMaterial({
    color: 0x9aa3ad,
    roughness: 0.55,
    metalness: 0.35,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const glass = new MeshStandardMaterial({
    color: 0x9fc4d6,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    side: DoubleSide,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const outline = new LineBasicMaterial({ color: 0xffd166 });

  const params = {
    style: "pointed" as ArchStyle,
    halfSpan: 0.62,
    springY: 1.15,
    rise: 0.78,
    archSegments: 20,
    angleA: 45,
    angleB: -45,
    spacingA: 0.19,
    spacingB: 0.19,
    phase: 0,
    cameWidth: 0.022,
    cameSides: 4,
    explode: 0,
    showGlass: true,
    glassRebate: 0,
    showBoundary: false,
    wireframe: false,
    opacity: 1,
    lattice: "",
    geometry: "",
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

  /**
   * One family of parallel cames, every one spanning the opening and cut at both ends.
   *
   * Lines are laid out by their PERPENDICULAR offset, which is what makes the spacing mean the same thing
   * at any angle — spacing along an axis would compress as the family rotates.
   */
  const family = (
    angleDeg: number,
    spacing: number,
    boundary: Vector2[],
    profile: ReturnType<typeof circleProfile>,
  ) => {
    const angle = MathUtils.degToRad(angleDeg);
    const axis = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    const normal = new Vector2(-Math.sin(angle), Math.cos(angle));
    const flat = new Vector2(axis.x, axis.y);

    const offsets = boundary.map((p) => p.dot(normal));
    const from = Math.ceil((Math.min(...offsets) - params.phase) / spacing);
    const to = Math.floor((Math.max(...offsets) - params.phase) / spacing);

    const parts: BufferGeometry[] = [];
    let dropped = 0;

    for (let k = from; k <= to; k++) {
      const seed = normal.clone().multiplyScalar(k * spacing + params.phase);
      for (const [t0, t1] of lineChords(seed, flat, boundary)) {
        // A came needs room to be a came. A chord barely longer than the stock is a scrap of lead no
        // glazier would cut, and its ring would straddle the boundary anyway.
        if (t1 - t0 < params.cameWidth * 3) {
          dropped++;
          continue;
        }
        const center = new Vector3(seed.x, seed.y, 0).addScaledVector(axis, (t0 + t1) / 2);
        const station = miterFrames(linePath(center, center.clone().add(axis), 1), {
          reference: new Vector3(0, 0, 1),
        })[0]!;
        const ring = profile.map(([px, py]) =>
          station.position
            .clone()
            .addScaledVector(station.normal, px)
            .addScaledVector(station.binormal, py),
        );
        if (ring.some((p) => !insideBoundary(new Vector2(p.x, p.y), boundary))) {
          dropped++;
          continue;
        }
        const came = buildCame(spanOpening(ring, axis, boundary), axis);
        if (came) parts.push(came);
        else dropped++;
      }
    }
    return { parts, dropped };
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
    const profile = circleProfile(params.cameWidth / 2, Math.max(3, Math.round(params.cameSides)));

    // TWO INDEPENDENT FAMILIES, which is what lets one construction cover both lattices. Diamond is
    // ±45°; GREGORIAN is 90° and 0° — upright mullions and horizontal transoms. A Gregorian lattice in a
    // RECTANGULAR opening needs none of this, because every boundary it meets is perpendicular to the
    // member and a square end is already correct. Put the same lattice under an ARCH and the mullions run
    // into a curve, which is precisely the tooth problem again.
    const a = family(params.angleA, params.spacingA, boundary, profile);
    const b = family(params.angleB, params.spacingB, boundary, profile);

    // The artifact this is working toward: the whole leading as ONE geometry. Merged per family only so
    // the explode can separate them; the shipped version merges once.
    const merge = (parts: BufferGeometry[], push: number) => {
      if (parts.length === 0) return null;
      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!merged) throw new Error("diamond-lattice: came parts have incompatible attributes.");
      if (push !== 0) merged.translate(0, 0, push);
      return merged;
    };

    const leadingA = merge(a.parts, params.explode);
    const leadingB = merge(b.parts, -params.explode);
    let vertices = 0;
    for (const leading of [leadingA, leadingB]) {
      if (!leading) continue;
      vertices += leading.attributes.position!.count;
      stage.add(new Mesh(leading, lead));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(leading), wire));
    }

    if (params.showGlass) {
      // The quarries, as one pane.
      //
      // It fills the opening EXACTLY and sits at the came's mid-depth, because that is where glass
      // actually is: a came is an H-section that wraps the glass edge, so the glass runs through its
      // middle rather than behind it. Setting it back reads as a margin, and insetting it reads as a
      // gap — both of which say the lattice does not fit when it does.
      //
      // `glassRebate` exists for the day a frame arrives: a real pane runs PAST the visible opening into
      // the frame's rebate, where the frame hides its edge. Negative tucks it out; positive leaves a
      // deliberate reveal.
      const inner =
        Math.abs(params.glassRebate) < 1e-9 ? boundary : offsetLoop(boundary, -params.glassRebate);
      const pane = new ShapeGeometry(new Shape(inner));
      pane.translate(0, 0, -params.explode * 2);
      stage.add(new Mesh(pane, glass));
    }

    if (params.showBoundary) {
      const loop = [...boundary, boundary[0]!].map((p) => new Vector3(p.x, p.y, 0));
      stage.add(new Line(new BufferGeometry().setFromPoints(loop), outline));
    }

    lead.opacity = params.opacity;
    lead.transparent = params.opacity < 1;
    lead.depthWrite = params.opacity >= 1;

    params.lattice = `${a.parts.length + b.parts.length} cames (${a.parts.length} + ${b.parts.length})${
      a.dropped + b.dropped > 0 ? ` · ${a.dropped + b.dropped} dropped` : ""
    }`;
    params.geometry = `${vertices} verts · ${leadingA && leadingB ? 2 : 1} merged geometr${leadingA && leadingB ? "ies" : "y"}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Diamond Lattice");

  const opening = gui.addFolder("Opening");
  // `square` is in this list on purpose: it is the RECTANGULAR window, and it needs no other code.
  opening
    .add(params, "style", [
      "square",
      "segmental",
      "semicircle",
      "horseshoe",
      "elliptical",
      "pointed",
      "ogee",
    ])
    .name("Arch")
    .onChange(rebuild);
  opening.add(params, "halfSpan", 0.3, 1, 0.01).name("Half Span").onChange(rebuild);
  opening.add(params, "springY", 0.4, 1.6, 0.01).name("Springing").onChange(rebuild);
  opening.add(params, "rise", 0.1, 1.2, 0.01).name("Rise").onChange(rebuild);
  // The came ends can never be finer than the boundary they die into.
  opening.add(params, "archSegments", 3, 48, 1).name("Arch Segments").onChange(rebuild);
  opening.open();

  const leading = gui.addFolder("Leading");
  const preset = (angleA: number, angleB: number) => () => {
    params.angleA = angleA;
    params.angleB = angleB;
    rebuild();
  };
  leading.add({ go: preset(45, -45) }, "go").name("Diamond (45 / −45)");
  // Upright mullions and horizontal transoms — the same construction, two different angles.
  leading.add({ go: preset(90, 0) }, "go").name("Gregorian (90 / 0)");
  leading.add(params, "angleA", -90, 90, 1).name("Family A Angle").onChange(rebuild).listen();
  leading.add(params, "angleB", -90, 90, 1).name("Family B Angle").onChange(rebuild).listen();
  leading.add(params, "spacingA", 0.06, 0.5, 0.005).name("Family A Spacing").onChange(rebuild);
  leading.add(params, "spacingB", 0.06, 0.5, 0.005).name("Family B Spacing").onChange(rebuild);
  // Slides the whole grid across the opening — worth sweeping, because it is what decides whether a came
  // clips a corner and gets dropped.
  leading.add(params, "phase", -0.25, 0.25, 0.005).name("Phase").onChange(rebuild);
  leading.add(params, "cameWidth", 0.008, 0.06, 0.001).name("Came Width").onChange(rebuild);
  leading.add(params, "cameSides", 3, 12, 1).name("Came Sides").onChange(rebuild);
  leading.open();

  const inspect = gui.addFolder("Inspect");
  // The two families and the glass pull apart on Z — nothing is jointed, so nothing resists.
  inspect.add(params, "explode", 0, 0.3, 0.005).name("Explode").onChange(rebuild);
  inspect.add(params, "showGlass").name("Glass").onChange(rebuild);
  // 0 fills the opening exactly, which is what a leaded light does. Negative runs the pane out past the
  // opening into a frame's rebate; positive leaves a visible reveal.
  inspect.add(params, "glassRebate", -0.05, 0.05, 0.002).name("Glass Rebate").onChange(rebuild);
  inspect.add(params, "showBoundary").name("Boundary Outline").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "lattice").name("Leading").listen().disable();
  readout.add(params, "geometry").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    lead.dispose();
    glass.dispose();
    wire.dispose();
    outline.dispose();
    dispose();
  };
}

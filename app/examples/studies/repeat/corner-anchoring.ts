import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { miterFrames, sweep, type Vec2 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Corner Anchoring",
  description:
    "STUDY — how a REPEATED item lands on a run that turns corners. Two families share one layout: a " +
    "NOTCHED BAND, where the void is a named member you can see into (merlon/crenel, dentil/interdentil), " +
    "and an APPLIED REPEAT, where separate objects hang on a run and there is no gap member at all " +
    "(baluster, modillion). The vocabulary gives the family away — where a language names the gap, the gap " +
    "is a thing. Both are driven here by the SAME numbers, because the layout is arc-length along the path " +
    "and only the geometry differs: family A uses each item's INTERVAL, family B uses only its CENTRE. " +
    "Anchor is the whole study. On Corner, every segment is divided into a whole number of pitches, so a " +
    "full item lands on every corner and the pitch absorbs the slack. On Pitch, the pitch is held exact and " +
    "the corners take whatever is left — watch the Readout report the leftover dumped into one gap.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PITCH        centre to centre. The invariant a course is designed around — not the gap.
//  MERLON       the solid tooth of a battlement. CRENEL (or EMBRASURE) is the gap between two.
//  BATTLEMENT   the whole crenellated course. CRENELLATION is the same thing.
//  DENTIL       the small block of a dentil course; INTERDENTIL is its gap. The same construction as a
//               battlement, at about a fortieth of the size.
//  BALUSTER     a turned upright. A BALUSTRADE is balusters between a base rail and a handrail.
//  NEWEL        the heavier post at a balustrade's corner or end. Why corner anchoring matters: the corner
//               item is a DIFFERENT member, so something has to actually be there.
//  SLACK        what is left over when a run does not divide evenly by the pitch. Somebody absorbs it —
//               the pitch, the gap, or the item — and choosing which is the entire design decision.

/** The square plan both families are laid out on. */
const planAt = (side: number, y: number) => {
  const h = side / 2;
  return [
    new Vector3(-h, y, -h),
    new Vector3(h, y, -h),
    new Vector3(h, y, h),
    new Vector3(-h, y, h),
  ];
};

interface Path {
  points: Vector3[];
  closed: boolean;
  /** Arc length at each vertex, with one extra entry for the total. */
  cum: number[];
  total: number;
}

const measure = (points: Vector3[], closed: boolean): Path => {
  const cum = [0];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    cum.push(cum[i]! + a.distanceTo(b));
  }
  return { points, closed, cum, total: cum[cum.length - 1]! };
};

const pointAt = (path: Path, s: number): Vector3 => {
  const total = path.total;
  const t = path.closed ? ((s % total) + total) % total : Math.min(Math.max(s, 0), total);
  let i = 0;
  while (i < path.cum.length - 2 && path.cum[i + 1]! <= t) i++;
  const a = path.points[i]!;
  const b = path.points[(i + 1) % path.points.length]!;
  const span = path.cum[i + 1]! - path.cum[i]!;
  return a.clone().lerp(b, span > 1e-12 ? (t - path.cum[i]!) / span : 0);
};

/**
 * The stretch of path between two arc lengths, INCLUDING any vertices it crosses.
 *
 * This is what makes a corner item work without special-casing it. An item that spans a corner comes back
 * as three points rather than two, and `miterFrames` mitres the middle one exactly as it would on a long
 * run — so the corner merlon is an L in plan and needs no code of its own.
 */
const subPath = (path: Path, from: number, to: number): Vector3[] => {
  const out = [pointAt(path, from)];
  const span = to - from;
  const crossed: { d: number; point: Vector3 }[] = [];
  for (let i = 0; i < path.points.length; i++) {
    const v = path.cum[i]!;
    let d = v - from;
    if (path.closed) d = ((d % path.total) + path.total) % path.total;
    if (d > 1e-9 && d < span - 1e-9) crossed.push({ d, point: path.points[i]!.clone() });
  }
  crossed.sort((a, b) => a.d - b.d);
  out.push(...crossed.map((c) => c.point), pointAt(path, to));
  return out;
};

interface Layout {
  /** Item centres, as arc lengths. */
  centres: number[];
  actualPitch: number;
  /** How much did not divide evenly, and had to go somewhere. */
  slack: number;
  onCorners: boolean;
}

/**
 * THE LAYOUT — shared by both families, and the only thing this study is really about.
 *
 * `corner` divides EACH SEGMENT into a whole number of pitches. Every vertex therefore lands on an item
 * centre, the pitch shifts by however much it must, and unequal sides each solve themselves. That is how a
 * real course is set out, and it is why a battlement has a merlon on every corner rather than a sliced one.
 *
 * `pitch` holds the requested pitch exactly and walks the whole path from its start. The corners then fall
 * wherever they fall, and everything that does not divide evenly piles into the final gap.
 */
const layout = (path: Path, requested: number, anchor: "corner" | "pitch"): Layout => {
  const pitch = Math.max(1e-4, requested);

  if (anchor === "pitch") {
    const count = Math.max(1, Math.floor(path.total / pitch));
    return {
      centres: Array.from({ length: count }, (_, i) => i * pitch),
      actualPitch: pitch,
      slack: path.total - count * pitch,
      onCorners: false,
    };
  }

  const centres: number[] = [];
  let pitchSum = 0;
  let pitchCount = 0;
  const segments = path.closed ? path.points.length : path.points.length - 1;
  for (let i = 0; i < segments; i++) {
    const length = path.cum[i + 1]! - path.cum[i]!;
    const steps = Math.max(1, Math.round(length / pitch));
    const actual = length / steps;
    pitchSum += length;
    pitchCount += steps;
    // Stop one short: the segment's far end is the NEXT segment's start, and on a closed run the last
    // one is the first. Emitting it twice would stack two items on every corner.
    const last = path.closed || i < segments - 1 ? steps : steps + 1;
    for (let k = 0; k < last; k++) centres.push(path.cum[i]! + k * actual);
  }
  return { centres, actualPitch: pitchSum / pitchCount, slack: 0, onCorners: true };
};

/** A rectangular section standing UP from its path, straddling it in thickness. */
const barProfile = (height: number, thickness: number): Vec2[] => [
  [0, -thickness / 2],
  [height, -thickness / 2],
  [height, thickness / 2],
  [0, thickness / 2],
];

const UP = new Vector3(0, 1, 0);

/** Sweep a section along a stretch of path, mitred at any corner it happens to cross. */
const runAlong = (points: Vector3[], profile: Vec2[], closed = false): BufferGeometry =>
  sweep(
    profile,
    miterFrames(
      points.map((position) => ({ position: position.clone(), tangent: new Vector3() })),
      { closed, reference: UP },
    ),
    { closed },
  );

/** A turned upright, as a silhouette revolved — the classic baluster shape. */
const balusterProfile = (height: number, radius: number) =>
  (
    [
      [0.95, 0.0],
      [1.0, 0.04],
      [1.0, 0.1],
      [0.42, 0.2],
      [0.82, 0.4],
      [0.5, 0.56],
      [0.38, 0.72],
      [0.6, 0.82],
      [0.6, 0.9],
      [0.34, 0.94],
      [0.34, 1.0],
    ] as const
  ).map(([r, y]) => new Vector2(r * radius, y * height));

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [3.2, 2.6, 4.4],
  });

  camera.fov = 26;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.55, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(1.1, 1.5, 1.3);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-1, -0.3, 0.7);
  scene.add(key, bounce);

  const stone = new MeshStandardMaterial({
    color: 0xc9c3b6,
    roughness: 0.95,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const item = new MeshStandardMaterial({
    color: 0xe4b06b,
    roughness: 0.85,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    side: 1.5,
    pitch: 0.26,
    itemWidth: 0.14,
    anchor: "corner" as "corner" | "pitch",
    closed: true,

    notched: true,
    merlonHeight: 0.22,
    bandHeight: 0.09,

    applied: true,
    balusterHeight: 0.3,
    balusterRadius: 0.055,

    separation: 2.4,
    wireframe: false,
    perSide: "",
    pitchOut: "",
    slackOut: "",
    corners: "",
  };

  const left = new Group();
  const right = new Group();
  scene.add(left, right);

  const clear = (group: Group) => {
    const seen = new Set<BufferGeometry>();
    for (const child of [...group.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        seen.add(child.geometry);
        group.remove(child);
      } else if (child instanceof Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
        group.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const add = (group: Group, geometry: BufferGeometry, material: MeshStandardMaterial) => {
    group.add(new Mesh(geometry, material));
    if (params.wireframe) group.add(new LineSegments(new WireframeGeometry(geometry), wire));
  };

  const rebuild = () => {
    clear(left);
    clear(right);

    const plan = planAt(params.side, 0);
    const open = plan.slice(0, 3); // three corners, two of them turned — an L, for the open case
    const points = params.closed ? plan : open;
    const path = measure(points, params.closed);
    const plan3 = layout(path, params.pitch, params.anchor);
    const half = params.itemWidth / 2;

    // ── A — THE NOTCHED BAND ────────────────────────────────────────────────────────────────────────
    // A continuous parapet, and merlons standing on it. The void between merlons is the CRENEL: a real
    // member with a name, which is what tells you this family apart.
    if (params.notched) {
      const wallHeight = 0.55;
      add(
        left,
        runAlong(
          points.map((p) => p.clone().setY(0)),
          barProfile(wallHeight + params.bandHeight, 0.1),
          params.closed,
        ),
        stone,
      );
      for (const centre of plan3.centres) {
        add(
          left,
          runAlong(
            subPath(path, centre - half, centre + half).map((p) =>
              p.clone().setY(wallHeight + params.bandHeight),
            ),
            barProfile(params.merlonHeight, 0.1),
          ),
          item,
        );
      }
      left.add(
        createTextSprite("A — NOTCHED BAND  (merlon / crenel)", {
          font: "ui-monospace, monospace",
          weight: "bold",
          size: 56,
          color: "#e4b06b",
          scale: 0.055,
          y: 1.15,
          z: 0,
        }),
      );
    }

    // ── B — THE APPLIED REPEAT ──────────────────────────────────────────────────────────────────────
    // The SAME centres, but only the centres — an applied item has no interval to occupy, because there
    // is no gap member to occupy the rest. Rails above and below, uprights between.
    if (params.applied) {
      const baseY = 0.12;
      add(
        right,
        runAlong(points.map((p) => p.clone().setY(0)), barProfile(baseY, 0.14), params.closed),
        stone,
      );
      const capY = baseY + params.balusterHeight;
      add(
        right,
        runAlong(points.map((p) => p.clone().setY(capY)), barProfile(0.06, 0.16), params.closed),
        stone,
      );

      // One geometry, placed many times — the layout only says WHERE.
      const shape = new LatheGeometry(
        balusterProfile(params.balusterHeight, params.balusterRadius),
        10,
      );
      for (const centre of plan3.centres) {
        const mesh = new Mesh(shape, item);
        mesh.position.copy(pointAt(path, centre)).setY(baseY);
        right.add(mesh);
      }
      right.add(
        createTextSprite("B — APPLIED REPEAT  (baluster, no gap member)", {
          font: "ui-monospace, monospace",
          weight: "bold",
          size: 56,
          color: "#e4b06b",
          scale: 0.055,
          y: 1.15,
          z: 0,
        }),
      );
    }

    left.position.set(-params.separation / 2, 0, 0);
    right.position.set(params.separation / 2, 0, 0);

    const segments = params.closed ? points.length : points.length - 1;
    params.perSide = `${plan3.centres.length} items over ${segments} segments`;
    params.pitchOut = `asked ${params.pitch.toFixed(4)} · got ${plan3.actualPitch.toFixed(4)}`;
    params.slackOut =
      plan3.slack > 1e-9
        ? `${plan3.slack.toFixed(4)} dumped into one gap`
        : "none — absorbed by the pitch";
    params.corners = plan3.onCorners
      ? "whole item on every corner"
      : "corners fall wherever they land";
  };
  rebuild();

  const gui = new GUI();
  gui.title("Corner Anchoring");

  const set = gui.addFolder("Layout");
  // THE study. Corner divides each segment into whole pitches; Pitch holds the number and lets the
  // corners suffer for it.
  set
    .add(params, "anchor", { "Corner — whole item on each corner": "corner", "Pitch — exact, corners suffer": "pitch" })
    .name("Anchor")
    .onChange(rebuild);
  // Centre to centre. The number a course is actually designed around.
  set.add(params, "pitch", 0.08, 0.6, 0.005).name("Pitch").onChange(rebuild);
  set.add(params, "itemWidth", 0.04, 0.35, 0.005).name("Item Width").onChange(rebuild);
  set.add(params, "closed").name("Closed Run").onChange(rebuild);
  set.add(params, "side", 0.8, 3, 0.05).name("Plan Side").onChange(rebuild);
  set.open();

  const a = gui.addFolder("A — Notched Band");
  a.add(params, "notched").name("Show").onChange(rebuild);
  a.add(params, "merlonHeight", 0.06, 0.5, 0.01).name("Merlon Height").onChange(rebuild);
  a.add(params, "bandHeight", 0.02, 0.2, 0.005).name("Band Height").onChange(rebuild);
  a.open();

  const b = gui.addFolder("B — Applied Repeat");
  b.add(params, "applied").name("Show").onChange(rebuild);
  b.add(params, "balusterHeight", 0.12, 0.6, 0.01).name("Baluster Height").onChange(rebuild);
  b.add(params, "balusterRadius", 0.02, 0.12, 0.005).name("Baluster Radius").onChange(rebuild);
  b.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "separation", 1.5, 4, 0.05).name("Separation").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "perSide").name("Items").listen().disable();
  readout.add(params, "pitchOut").name("Pitch").listen().disable();
  readout.add(params, "slackOut").name("Slack").listen().disable();
  readout.add(params, "corners").name("Corners").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear(left);
    clear(right);
    stone.dispose();
    item.dispose();
    wire.dispose();
    dispose();
  };
}

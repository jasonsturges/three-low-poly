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
import {
  measurePath,
  miterFrames,
  type RepeatAnchor,
  pointAtDistance,
  repeatAlongPath,
  slicePath,
  sweep,
  type Vec2,
} from "three-low-poly";
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
    "and only the geometry differs: family A uses each item's INTERVAL, family B uses only its CENTER. " +
    "Anchor is the whole study, and PITCH IS THE WRONG-WAY CONTROL — it is meant to look broken. On " +
    "Corners, every segment is divided into a whole number of pitches, so a full symmetric item lands on " +
    "every corner and the pitch absorbs the slack. On Pitch, the pitch is held exact and the run is walked " +
    "from its start, so on a square you get one corner with an item centered on it (arc zero IS a corner), " +
    "one with an item straddling it off-center and coming out a lopsided L, and two with nothing at all. " +
    "Orbit round the back to see it — from the front the two families read as finished, which is the point: " +
    "bad setting-out hides until you look at the corners. Watch the Readout report the leftover slack " +
    "dumped into one gap.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PITCH        center to center. The invariant a course is designed around — not the gap.
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

/** A rectangular section standing UP from its path, straddling it in thickness. */
const barProfile = (height: number, thickness: number): Vec2[] => [
  [0, -thickness / 2],
  [height, -thickness / 2],
  [height, thickness / 2],
  [0, thickness / 2],
];

const UP = new Vector3(0, 1, 0);

/** Sweep a section along a stretch of path, mitered at any corner it happens to cross. */
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
    anchor: "corners" as RepeatAnchor,
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
    const path = measurePath(points, { closed: params.closed });
    const repeat = repeatAlongPath(path, { pitch: params.pitch, anchor: params.anchor });
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
      for (const center of repeat.centers) {
        add(
          left,
          runAlong(
            slicePath(path, center - half, center + half).map((p) =>
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
    // The SAME centers, but only the centers — an applied item has no interval to occupy, because there
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
      for (const center of repeat.centers) {
        const mesh = new Mesh(shape, item);
        mesh.position.copy(pointAtDistance(path, center)).setY(baseY);
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
    params.perSide = `${repeat.centers.length} items over ${segments} segments`;
    params.pitchOut = `asked ${params.pitch.toFixed(4)} · got ${repeat.pitch.toFixed(4)}`;
    params.slackOut =
      repeat.slack > 1e-9
        ? `${repeat.slack.toFixed(4)} dumped into one gap`
        : "none — absorbed by the pitch";
    params.corners = repeat.anchored
      ? "whole item on every corner"
      : "corners fall wherever they land";
  };
  rebuild();

  const gui = new GUI();
  gui.title("Corner Anchoring");

  const set = gui.addFolder("Layout");
  // THE study. Corner divides each segment into whole pitches; Pitch holds the number and lets the
  // corners suffer for it.
  // `anchor` names WHAT IS HELD, and everything else bends around it.
  set
    .add(params, "anchor", {
      "Corners — held; the pitch gives": "corners",
      "Pitch — held; the corners give": "pitch",
    })
    .name("Anchor (what is held)")
    .onChange(rebuild);
  // CENTER TO CENTER — not the gap, which is just `pitch - itemWidth` and never a knob. What you get is
  // in the Readout, and it equals what you asked for only when the run happened to divide evenly.
  //
  // Note what is NOT in this folder: the item's WIDTH. It belongs to family A alone, and that is the
  // study's whole thesis showing up in the controls — the layout hands out CENTERS, and only a notched
  // band needs an interval around one. An applied repeat is placed and never measured.
  set.add(params, "pitch", 0.08, 0.6, 0.005).name("Pitch (requested)").onChange(rebuild);
  set.add(params, "closed").name("Closed Run").onChange(rebuild);
  set.add(params, "side", 0.8, 3, 0.05).name("Plan Side").onChange(rebuild);
  set.open();

  const a = gui.addFolder("A — Notched Band");
  a.add(params, "notched").name("Show").onChange(rebuild);
  // Family A ONLY. A notched band uses each item's INTERVAL — `center ± width/2`, sliced out of the path —
  // so it needs a width. Family B uses only the center and never asks.
  //
  // It also moves NOTHING. It fattens each item in place; the centers never budge, which is what makes the
  // pitch the invariant and why a half item can never appear.
  a.add(params, "itemWidth", 0.04, 0.35, 0.005).name("Item Width").onChange(rebuild);
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

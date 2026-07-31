import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
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
  linePath,
  miterCuts,
  miterFrames,
  rectProfile,
  type Station,
  sweep,
  transportFrames,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Miter Joint",
  description:
    "STUDY — the atom of the picture-frame miter: TWO pieces of flat stock meeting at one angle, and " +
    "nothing else. Drag Included Angle through 90° (α), obtuse (β) and acute (γ) and the joint stays shut " +
    "the whole way. Three constructions of the same joint: ONE SWEEP (both arms of one path, sharing the " +
    "corner ring), TWO PIECES (two sticks, each seat cut on the same bisector plane — Explode pulls them " +
    "apart to show the matching faces), and BUTT, the bug, where each piece is cut square to itself and " +
    "leaves a wedge outside the corner and interpenetration inside. Show the cut plane to see why the " +
    "bisector is the only plane that works, and watch the widening readout: the cut face is 1/cos φ wider " +
    "than the stock, which is what the ring has to stretch by.",
};

const UP = new Vector3(0, 1, 0);

type Profile = ReturnType<typeof rectProfile>;

interface Params {
  includedAngle: number;
  armLength: number;
  stock: "flat" | "square" | "round";
  width: number;
  thickness: number;
  construction: "one" | "two" | "butt";
  explode: number;
  tintPieces: boolean;
  wireframe: boolean;
  opacity: number;
  showCutPlane: boolean;
  showFrames: boolean;
  cutAngle: string;
  widening: string;
}

/** What one construction hands back: the meshable geometry, plus the frames behind it for inspection. */
interface Build {
  parts: BufferGeometry[];
  /** Every station, for the frame gizmos. */
  stations: Station[];
  /** Only the stations AT the joint — one per piece. Their agreement (or not) is the whole study. */
  joint: Station[];
}

/**
 * The two arm directions, symmetric about `+X`, with the corner on the origin.
 *
 * Symmetric on purpose: it fixes the bisector at `±Z` for **every** angle, so the cut plane stays put on
 * screen while the arms swing through it. Swinging one arm against a fixed one is what a real frame does,
 * but then the plane moves too and it is much harder to see that the plane is what the ring rides on.
 */
function arms(includedAngle: number): [Vector3, Vector3] {
  const half = MathUtils.degToRad(includedAngle) / 2;
  return [
    new Vector3(Math.cos(half), 0, Math.sin(half)),
    new Vector3(Math.cos(half), 0, -Math.sin(half)),
  ];
}

function profileFor({ stock, width, thickness }: Params): Profile {
  // `rectProfile(width, thickness)` maps thickness -> normal and width -> binormal, and `reference: UP`
  // puts the normal on `+Y`. So a board lies FLAT, wide face up, which is the stock in the reference photo.
  if (stock === "flat") return rectProfile(width, thickness);
  // `circleProfile` is a regular polygon, so the same call gives square tubing at 4 and round bar at 16.
  return circleProfile(width / 2, stock === "square" ? 4 : 16);
}

/**
 * ONE SWEEP — what the library does for a rail loop or a frame.
 *
 * Both arms are segments of a single path, so the corner is a single station whose ring both segments
 * share. Sharing the ring is what closes the joint exactly: there is only one surface there, so there is
 * nothing to line up. The cost is that the arms are one geometry and one piece of stock.
 */
function buildOneSweep(params: Params, profile: Profile): Build {
  const [d0, d1] = arms(params.includedAngle);
  const points = [
    d0.clone().multiplyScalar(params.armLength),
    new Vector3(),
    d1.clone().multiplyScalar(params.armLength),
  ].map((position) => ({ position, tangent: new Vector3() }));

  // Only the middle station is mitered. The two far ends are arbitrary cut-offs and get ordinary
  // perpendicular frames.
  const stations = miterFrames(points, { reference: UP });
  return { parts: [sweep(profile, stations)], stations, joint: [stations[1]!] };
}

/**
 * TWO PIECES — the joint as a carpenter builds it: two sticks, each cut on the same plane.
 *
 * The cut plane is no longer derived from a path (neither stick has a corner in it) — it is SUPPLIED, the
 * same operation as seating a post on a plate, so this is `startCut`/`endCut` rather than `closed`. Both
 * ends are cut on the identical bisector, so both end faces come out as the identical polygon and the
 * pieces meet with nothing to reconcile.
 *
 * `widenSeatCuts: true` is what makes it a MITER rather than a seat. The default preserves the footprint
 * in the cut plane — right for an end LANDING on a surface, because the face then lands flush. Here the
 * face is not landing on anything, it is meeting its own mirror image, so what must be preserved is the
 * true cross-section: real stock cut at an angle is wider on the diagonal, and both halves are wider by
 * the same 1/cos φ.
 */
function buildTwoPieces(params: Params, profile: Profile): Build {
  const [d0, d1] = arms(params.includedAngle);
  const corner = new Vector3();
  const outerA = d0.clone().multiplyScalar(params.armLength);
  const outerB = d1.clone().multiplyScalar(params.armLength);

  // The joint's cut plane, derived from the corner list the two pieces SHARE. Neither piece contains the
  // corner, so neither could derive it — an open path's ends are square by definition. `miterCuts` returns
  // the same bisector `miterFrames` uses internally, which is why the two constructions agree exactly
  // rather than agreeing by luck. Index 1 is the corner; 0 and 2 are the arms' free ends.
  const cut = miterCuts([outerA, corner, outerB])[1]!;

  const a = miterFrames(linePath(outerA, corner, 1), { reference: UP, endCut: cut, widenSeatCuts: true });
  const b = miterFrames(linePath(corner, outerB, 1), { reference: UP, startCut: cut, widenSeatCuts: true });

  const pieceA = sweep(profile, a);
  const pieceB = sweep(profile, b);

  // Explode along the CUT NORMAL rather than along each piece's own length: that separates them
  // perpendicular to the joint face, so both cut faces turn to face the camera at once and you can see
  // they are the same polygon. Sliding along the arms would only open a gap.
  if (params.explode > 0) {
    const push = cut.clone().multiplyScalar(params.explode);
    // A sits on the -cut side of the plane, B on the +cut side.
    pieceA.translate(-push.x, -push.y, -push.z);
    pieceB.translate(push.x, push.y, push.z);
  }

  return { parts: [pieceA, pieceB], stations: [...a, ...b], joint: [a[1]!, b[0]!] };
}

/**
 * BUTT — the bug, and the reason a miter exists at all.
 *
 * Each piece is framed perpendicular to its own path, so each one ends on a ring square to ITSELF. Two
 * rings at two different orientations cannot describe one surface: outside the corner they diverge and
 * leave a wedge of nothing, inside it they cross and the pieces interpenetrate. Neither is a sizing
 * mistake — the stock is right, the framing is wrong. Extending the pieces to overlap only trades the
 * gap for a stub sticking out of the far face.
 */
function buildButt(params: Params, profile: Profile): Build {
  const [d0, d1] = arms(params.includedAngle);
  const corner = new Vector3();
  const a = transportFrames(linePath(d0.clone().multiplyScalar(params.armLength), corner, 1));
  const b = transportFrames(linePath(corner, d1.clone().multiplyScalar(params.armLength), 1));

  const pieceA = sweep(profile, a);
  const pieceB = sweep(profile, b);

  if (params.explode > 0) {
    // No shared plane to explode along, so each piece backs off along its own axis. That is itself the
    // tell: there is no one direction that opens this joint cleanly.
    const pushA = d0.clone().multiplyScalar(params.explode);
    const pushB = d1.clone().multiplyScalar(params.explode);
    pieceA.translate(pushA.x, pushA.y, pushA.z);
    pieceB.translate(pushB.x, pushB.y, pushB.z);
  }

  return { parts: [pieceA, pieceB], stations: [...a, ...b], joint: [a[1]!, b[0]!] };
}

/** The station's ring, as a closed outline — the actual polygon the cut makes through the stock. */
function ringOutline(station: Station, profile: Profile, material: LineBasicMaterial): LineLoop {
  // Mirrors how `sweep` places a profile: position + normal * px + binormal * py. The frame vectors are
  // used at their own length, unnormalized, which is exactly where the widening lives.
  const points = profile.map(([px, py]) =>
    station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
  );
  return new LineLoop(new BufferGeometry().setFromPoints(points), material);
}

/** A translucent patch of the station's cut plane, big enough to read past the stock. */
function cutPlanePatch(station: Station, halfWidth: number, halfHeight: number, material: MeshBasicMaterial): Mesh {
  const u = station.binormal.clone().normalize().multiplyScalar(halfWidth);
  const v = station.normal.clone().normalize().multiplyScalar(halfHeight);
  const at = station.position;
  const corners = [
    at.clone().sub(u).sub(v),
    at.clone().add(u).sub(v),
    at.clone().add(u).add(v),
    at.clone().sub(u).add(v),
  ];
  const geometry = new BufferGeometry().setFromPoints([
    corners[0]!,
    corners[1]!,
    corners[2]!,
    corners[0]!,
    corners[2]!,
    corners[3]!,
  ]);
  return new Mesh(geometry, material);
}

/**
 * The station's own basis, drawn at true length: tangent (the cut plane's normal) red, normal green,
 * binormal blue. The widening is not a separate mechanism — it IS the length of these vectors, so a
 * mitered station shows one leg visibly longer than the unit legs at the plain ends.
 */
function frameGizmo(station: Station, scale: number, materials: LineBasicMaterial[]): LineSegments[] {
  return [station.tangent, station.normal, station.binormal].map((vector, index) => {
    const tip = station.position.clone().addScaledVector(vector, scale);
    const geometry = new BufferGeometry().setFromPoints([station.position.clone(), tip]);
    return new LineSegments(geometry, materials[index]!);
  });
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [3.0, 3.4, 3.4],
  });

  // A long lens, pulled back to match. Whether two faces line up is exactly what perspective
  // foreshortening destroys — at 75° a shut joint can read as a step purely from where it sits in frame.
  camera.fov = 22;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  controls.target.set(0.35, 0, 0);
  controls.update();

  // The shared rig lights from upper-left only, which leaves the outward corner faces — the faces this
  // study is about — reading as flat black. One key from the viewer's side, one low bounce.
  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(0.8, 1.2, 1.4);
  const bounce = new DirectionalLight(0x9fb4d0, 0.45);
  bounce.position.set(-0.6, -0.9, -0.4);
  scene.add(key, bounce);

  const params: Params = {
    includedAngle: 90,
    armLength: 1,
    stock: "flat",
    width: 0.26,
    thickness: 0.09,
    construction: "two",
    explode: 0,
    tintPieces: true,
    wireframe: false,
    opacity: 1,
    showCutPlane: false,
    showFrames: false,
    cutAngle: "",
    widening: "",
  };

  // flatShading is a free planarity checker: a quad that shades in two tones is non-planar, every time.
  // DoubleSide because inspecting a joint means seeing into it.
  const board = (color: number) =>
    new MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0,
      flatShading: true,
      side: DoubleSide,
      // Push the solid back a hair so the wireframe overlay wins the depth test instead of fighting it.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  const stockA = board(0xd9b98a);
  const stockB = board(0xbf9a68);

  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const ring = new LineBasicMaterial({ color: 0xffd166 });
  const plane = new MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.14,
    side: DoubleSide,
    depthWrite: false,
  });
  const axes = [0xff5a5a, 0x7fe3a1, 0x6bb6ff].map((color) => new LineBasicMaterial({ color }));

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments || child instanceof LineLoop) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const profile = profileFor(params);
    const build =
      params.construction === "one"
        ? buildOneSweep(params, profile)
        : params.construction === "two"
          ? buildTwoPieces(params, profile)
          : buildButt(params, profile);

    for (const [index, part] of build.parts.entries()) {
      stage.add(new Mesh(part, params.tintPieces && index === 1 ? stockB : stockA));
      // Overlaid rather than replacing the surface — a bare wireframe of a joint is unreadable, because
      // you cannot tell which lines are in front.
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(part), wire));
    }

    if (params.showCutPlane) {
      // Sized off the widened section, so the patch always reads as bigger than the face it carries.
      const reach = Math.max(params.width, params.thickness);
      for (const station of build.joint) {
        stage.add(cutPlanePatch(station, reach * 1.1, reach * 0.9, plane));
        stage.add(ringOutline(station, profile, ring));
      }
    }

    if (params.showFrames) {
      for (const station of build.stations) {
        for (const gizmo of frameGizmo(station, params.width * 0.9, axes)) stage.add(gizmo);
      }
    }

    for (const material of [stockA, stockB]) {
      material.opacity = params.opacity;
      // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
      // the sorted back-to-front path and drops out of the depth buffer.
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    // The saw angle each piece is cut at, and how much wider that cut is than the stock. φ is the angle
    // between a piece's own direction and the cut plane's normal, so for an included angle α it is
    // 90° − α/2: 45° at a square corner, and the widening is then exactly √2.
    const phi = 90 - params.includedAngle / 2;
    params.cutAngle = `${phi.toFixed(1)}°`;
    params.widening = `×${(1 / Math.cos(MathUtils.degToRad(phi))).toFixed(3)}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Miter Joint");

  const joint = gui.addFolder("Joint");
  // 20° at the low end because the widening runs as 1/sin(α/2) and a very sharp corner needs a cut wider
  // than the arms are long — a real workshop limit, not a limit of the framing.
  joint.add(params, "includedAngle", 20, 175, 1).name("Included Angle").onChange(rebuild).listen();
  joint.add(params, "armLength", 0.4, 1.4, 0.01).name("Arm Length").onChange(rebuild);
  // The three cases from the reference photo, one click each.
  joint
    .add(
      {
        preset: () => {
          params.includedAngle = 90;
          rebuild();
        },
      },
      "preset",
    )
    .name("α = 90°");
  joint
    .add(
      {
        preset: () => {
          params.includedAngle = 125;
          rebuild();
        },
      },
      "preset",
    )
    .name("β > 90°");
  joint
    .add(
      {
        preset: () => {
          params.includedAngle = 62;
          rebuild();
        },
      },
      "preset",
    )
    .name("γ < 90°");
  joint.open();

  const stock = gui.addFolder("Stock");
  stock
    .add(params, "stock", { "Flat Board": "flat", "Square Bar": "square", "Round Bar": "round" })
    .name("Section")
    .onChange(rebuild);
  stock.add(params, "width", 0.06, 0.5, 0.005).name("Width").onChange(rebuild);
  // Only the flat board has an independent thickness; the others are turned from one dimension.
  stock.add(params, "thickness", 0.02, 0.3, 0.005).name("Thickness").onChange(rebuild);
  stock.open();

  const build = gui.addFolder("Construction");
  const explode = { controller: null as null | ReturnType<typeof build.add> };
  build
    .add(params, "construction", {
      "One Sweep (shared ring)": "one",
      "Two Pieces (seat cut)": "two",
      "Butt (bug)": "butt",
    })
    .name("Built As")
    .onChange(() => {
      // One sweep is one geometry, so there is nothing to pull apart.
      explode.controller?.enable(params.construction !== "one");
      rebuild();
    });
  explode.controller = build.add(params, "explode", 0, 0.6, 0.005).name("Explode").onChange(rebuild);
  build.add(params, "tintPieces").name("Tint Pieces").onChange(rebuild);
  build.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showCutPlane").name("Cut Plane").onChange(rebuild);
  inspect.add(params, "showFrames").name("Station Frames").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  // Read-only: these are consequences of the angle, not knobs. Exposing them as sliders would ship a way
  // to contradict the geometry.
  const readout = gui.addFolder("Readout");
  readout.add(params, "cutAngle").name("Cut Angle φ").listen().disable();
  readout.add(params, "widening").name("Widening 1/cos φ").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    for (const material of [stockA, stockB, wire, ring, plane, ...axes]) material.dispose();
    dispose();
  };
}

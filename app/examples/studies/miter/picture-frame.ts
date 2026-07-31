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
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  circleProfile,
  linePath,
  miterFrames,
  offsetLoop,
  rectProfile,
  type Station,
  sweep,
  transportFrames,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Picture Frame",
  description:
    "STUDY — the closed miter: four corners, all shut, as ONE sweep. The frame is a closed polyline of " +
    "corner points and nothing else; `miterFrames(corners, { closed: true })` puts a ring on every corner's " +
    "bisector and `sweep(..., { closed: true })` wraps the last ring back onto the first, so there are no " +
    "end caps anywhere in the model. Switch to FOUR PIECES to build the same frame as four sticks, each " +
    "seat cut at both ends, and Explode to pull them apart. Then move Stile Stock: unequal stock is not " +
    "merely ugly, it makes the outer corner STEP, and the control is unavailable in One Loop mode because " +
    "consecutive segments there SHARE a ring — one ring is one cross-section, so unequal stock is " +
    "inexpressible, not just discouraged. Sides proves the joint is angle-agnostic: a hexagon miters at " +
    "60° exactly as a rectangle does at 90°.",
};

type Profile = ReturnType<typeof rectProfile>;

interface Params {
  sides: number;
  width: number;
  height: number;
  stock: "flat" | "square" | "round";
  stockWidth: number;
  stockThickness: number;
  stileStock: number;
  construction: "loop" | "pieces" | "butt";
  explode: number;
  tintPieces: boolean;
  showPanel: boolean;
  wireframe: boolean;
  opacity: number;
  showCutPlanes: boolean;
  showFrames: boolean;
  cornerAngle: string;
  widening: string;
  vertices: string;
}

interface Build {
  parts: BufferGeometry[];
  stations: Station[];
  /** One per mitered corner — for a four-piece build, both pieces' rings land on the same plane. */
  joint: Station[];
}

/**
 * The frame's corners, wound counter-clockwise in the XY plane — so the frame stands up facing the
 * viewer, the way a frame on a wall does.
 *
 * These are the moulding's CENTRELINE, not its outer edge: the stock straddles the path, so the frame
 * measures `width + stockWidth` across the outside and `width − stockWidth` across the opening. The
 * centreline is what the miter is about — the bisector is a property of the path, and the faces follow.
 */
function frameCorners({ sides, width, height }: Params): Vector3[] {
  if (sides === 4) {
    const hw = width / 2;
    const hh = height / 2;
    return [
      new Vector3(-hw, -hh, 0),
      new Vector3(hw, -hh, 0),
      new Vector3(hw, hh, 0),
      new Vector3(-hw, hh, 0),
    ];
  }
  // A regular polygon on the same width, seated flat-side-down so it reads as a frame rather than a
  // spinning shape when the side count changes.
  const radius = width / 2;
  const start = Math.PI / 2 + Math.PI / sides;
  return Array.from({ length: sides }, (_, i) => {
    const angle = start + (i / sides) * Math.PI * 2;
    return new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  });
}

function profileFor({ stock, stockWidth, stockThickness }: Params, scale = 1): Profile {
  // `rectProfile(width, thickness)` maps thickness -> normal and width -> binormal. On a loop in the XY
  // plane the default `reference` of +Z lands the normal on +Z, so THICKNESS is the frame's depth into
  // the wall and WIDTH is the face you see from the front. The widening then acts on the face width,
  // which is exactly where a miter is wider.
  if (stock === "flat") return rectProfile(stockWidth * scale, stockThickness);
  return circleProfile((stockWidth * scale) / 2, stock === "square" ? 4 : 16);
}

/** Unit direction of the edge leaving corner `i`. */
const edgeDirection = (corners: Vector3[], i: number) =>
  corners[(i + 1) % corners.length]!.clone().sub(corners[i]!).normalize();

/**
 * The cut plane's normal at corner `i` — the bisector of the edge arriving and the edge leaving.
 *
 * This is the same quantity `miterFrames` derives internally for a closed path; the four-piece build has
 * to compute it explicitly because neither stick contains the corner, so neither can derive it.
 */
const bisectorAt = (corners: Vector3[], i: number) =>
  edgeDirection(corners, (i - 1 + corners.length) % corners.length)
    .add(edgeDirection(corners, i))
    .normalize();

/**
 * ONE LOOP — the frame as a single closed sweep.
 *
 * `closed` twice, and they do different jobs: on `miterFrames` it means the last corner joins back to
 * the first so EVERY corner gets a bisector (an open path leaves its two ends square); on `sweep` it
 * means the final ring stitches back onto the first ring rather than being capped. Between them the
 * frame has no ends at all — no caps, no seam, and one shared ring at each corner.
 */
function buildLoop(params: Params, profile: Profile): Build {
  const corners = frameCorners(params).map((position) => ({ position, tangent: new Vector3() }));
  const stations = miterFrames(corners, { closed: true });
  return { parts: [sweep(profile, stations, { closed: true })], stations, joint: stations };
}

/**
 * FOUR PIECES — the frame as a carpenter cuts it: one stick per side, mitered at both ends.
 *
 * Each stick is seat cut against the bisector its end lands on, which is the same plane its neighbour is
 * cut against, so the two faces come out as the same polygon and the corner closes. `widenSeatCuts: true`
 * because these ends meet each other rather than landing on a surface — what has to be preserved is the
 * true cross-section, not the footprint.
 *
 * This is the build that can express unequal stock, and the build that shows why you should not want to.
 */
function buildPieces(params: Params): Build {
  const corners = frameCorners(params);
  const centre = new Vector3();
  const parts: BufferGeometry[] = [];
  const stations: Station[] = [];
  const joint: Station[] = [];

  for (let i = 0; i < corners.length; i++) {
    const from = corners[i]!;
    const to = corners[(i + 1) % corners.length]!;
    const frames = miterFrames(linePath(from, to, 1), {
      startCut: bisectorAt(corners, i),
      endCut: bisectorAt(corners, (i + 1) % corners.length),
      widenSeatCuts: true,
    });

    // Alternate sides carry the stile stock, so on a rectangle the uprights differ from the rails.
    const piece = sweep(profileFor(params, i % 2 === 1 ? params.stileStock : 1), frames);

    if (params.explode > 0) {
      // Outward from the frame's centre, perpendicular to the stick's own run — the way an exploded
      // frame diagram separates, and the only direction that opens both of a stick's joints at once.
      const push = from
        .clone()
        .add(to)
        .multiplyScalar(0.5)
        .sub(centre)
        .normalize()
        .multiplyScalar(params.explode);
      piece.translate(push.x, push.y, push.z);
    }

    parts.push(piece);
    stations.push(...frames);
    joint.push(frames[0]!);
  }

  return { parts, stations, joint };
}

/**
 * BUTT — the bug. Each stick cut square to itself, so nothing lines up.
 *
 * On a closed frame it is worse than on a single corner: the defect appears FOUR times, and the frame
 * has a hole at every corner while every corner also overlaps. Note the stock is right; only the
 * framing is wrong.
 */
function buildButt(params: Params): Build {
  const corners = frameCorners(params);
  const centre = new Vector3();
  const parts: BufferGeometry[] = [];
  const stations: Station[] = [];

  for (let i = 0; i < corners.length; i++) {
    const from = corners[i]!;
    const to = corners[(i + 1) % corners.length]!;
    const frames = transportFrames(linePath(from, to, 1));
    const piece = sweep(profileFor(params, i % 2 === 1 ? params.stileStock : 1), frames);

    if (params.explode > 0) {
      const push = from
        .clone()
        .add(to)
        .multiplyScalar(0.5)
        .sub(centre)
        .normalize()
        .multiplyScalar(params.explode);
      piece.translate(push.x, push.y, push.z);
    }

    parts.push(piece);
    stations.push(...frames);
  }

  return { parts, stations, joint: stations.filter((_, i) => i % 2 === 0) };
}

/**
 * The panel the frame holds, built by OFFSETTING the frame's own path inward.
 *
 * Not by scaling it: shrinking a rectangle's width and height does not give its inset — the two sides
 * move by different amounts unless it happens to be square, and on a polygon nothing lines up at all.
 * `offsetLoop` is the library's own answer to that, so the opening always hugs the moulding.
 */
function buildPanel(params: Params): BufferGeometry {
  const corners = frameCorners(params).map((p) => new Vector2(p.x, p.y));
  // Half the stock reaches the moulding's inner face; a touch more tucks the panel behind it.
  const inner = offsetLoop(corners, -params.stockWidth * 0.52);
  const geometry = new ShapeGeometry(new Shape(inner));
  // Behind the frame's centreline, so the moulding sits proud of it as a real rabbet does.
  geometry.translate(0, 0, -params.stockThickness * 0.3);
  return geometry;
}

/** The station's ring as a closed outline — the polygon the cut actually makes through the stock. */
function ringOutline(station: Station, profile: Profile, material: LineBasicMaterial): LineLoop {
  // Mirrors how `sweep` places a profile: position + normal * px + binormal * py, using the frame
  // vectors at their own length — which is where the widening lives.
  const points = profile.map(([px, py]) =>
    station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
  );
  return new LineLoop(new BufferGeometry().setFromPoints(points), material);
}

/** A translucent patch of the station's cut plane, sized to read past the stock. */
function cutPlanePatch(station: Station, halfWidth: number, halfHeight: number, material: MeshBasicMaterial): Mesh {
  const u = station.binormal.clone().normalize().multiplyScalar(halfWidth);
  const v = station.normal.clone().normalize().multiplyScalar(halfHeight);
  const at = station.position;
  const c = [
    at.clone().sub(u).sub(v),
    at.clone().add(u).sub(v),
    at.clone().add(u).add(v),
    at.clone().sub(u).add(v),
  ];
  return new Mesh(new BufferGeometry().setFromPoints([c[0]!, c[1]!, c[2]!, c[0]!, c[2]!, c[3]!]), material);
}

/** Station basis at true length: tangent (the cut normal) red, normal green, binormal blue. */
function frameGizmo(station: Station, scale: number, materials: LineBasicMaterial[]): LineSegments[] {
  return [station.tangent, station.normal, station.binormal].map((vector, index) => {
    const tip = station.position.clone().addScaledVector(vector, scale);
    return new LineSegments(
      new BufferGeometry().setFromPoints([station.position.clone(), tip]),
      materials[index]!,
    );
  });
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 1.1, 3.7],
  });

  // A long lens: whether four corners are shut is exactly the judgement perspective foreshortening
  // ruins, and a frame puts one corner in each quadrant of the picture where the distortion differs.
  camera.fov = 22;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(0.7, 1.1, 1.6);
  const bounce = new DirectionalLight(0x9fb4d0, 0.45);
  bounce.position.set(-0.8, -0.7, 0.6);
  scene.add(key, bounce);

  const params: Params = {
    sides: 4,
    width: 1.2,
    height: 0.9,
    stock: "flat",
    stockWidth: 0.12,
    stockThickness: 0.05,
    stileStock: 1,
    construction: "loop",
    explode: 0,
    tintPieces: false,
    showPanel: true,
    wireframe: false,
    opacity: 1,
    showCutPlanes: false,
    showFrames: false,
    cornerAngle: "",
    widening: "",
    vertices: "",
  };

  // flatShading is a free planarity checker — a quad shading in two tones is non-planar, every time.
  const moulding = (color: number) =>
    new MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0,
      flatShading: true,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  const stockA = moulding(0xd9b98a);
  const stockB = moulding(0xbf9a68);
  const panel = new MeshStandardMaterial({ color: 0x2b3140, roughness: 0.95, side: DoubleSide });

  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const ring = new LineBasicMaterial({ color: 0xffd166 });
  const plane = new MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.12,
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
      params.construction === "loop"
        ? buildLoop(params, profile)
        : params.construction === "pieces"
          ? buildPieces(params)
          : buildButt(params);

    for (const [index, part] of build.parts.entries()) {
      stage.add(new Mesh(part, params.tintPieces && index % 2 === 1 ? stockB : stockA));
      // Overlaid rather than replacing the surface — a bare wireframe of a joint is unreadable, because
      // you cannot tell which lines are in front.
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(part), wire));
    }

    if (params.showPanel) stage.add(new Mesh(buildPanel(params), panel));

    if (params.showCutPlanes) {
      const reach = Math.max(params.stockWidth, params.stockThickness);
      for (const station of build.joint) {
        stage.add(cutPlanePatch(station, reach * 1.2, reach * 1.0, plane));
        stage.add(ringOutline(station, profile, ring));
      }
    }

    if (params.showFrames) {
      for (const station of build.stations) {
        for (const gizmo of frameGizmo(station, params.stockWidth * 1.1, axes)) stage.add(gizmo);
      }
    }

    for (const material of [stockA, stockB]) {
      material.opacity = params.opacity;
      // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
      // the sorted back-to-front path and drops out of the depth buffer.
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    // The interior angle of a regular polygon; a rectangle's is 90 whatever its proportions. Each piece
    // is sawn at half the TURN, which is 90 − angle/2, and the cut is 1/cos of that wider than the stock.
    const angle = ((params.sides - 2) * 180) / params.sides;
    const phi = 90 - angle / 2;
    params.cornerAngle = `${angle.toFixed(1)}°  (cut ${phi.toFixed(1)}°)`;
    params.widening = `×${(1 / Math.cos(MathUtils.degToRad(phi))).toFixed(3)}`;
    // One closed loop has no end caps and shares a ring at every corner; the same frame as separate
    // sticks pays for two capped ends per piece. The count is the concrete difference.
    const total = build.parts.reduce((sum, part) => sum + part.attributes.position!.count, 0);
    params.vertices = `${total} in ${build.parts.length} part${build.parts.length === 1 ? "" : "s"}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Picture Frame");

  const frame = gui.addFolder("Frame");
  const heightController = frame.add(params, "height", 0.3, 1.4, 0.01).name("Height");
  frame
    .add(params, "sides", { Rectangle: 4, Pentagon: 5, Hexagon: 6, Octagon: 8, Decagon: 10 })
    .name("Sides")
    .onChange(() => {
      // A regular polygon has one dimension, so height stops meaning anything the moment it is not a
      // rectangle. Disabling it is honest; leaving it live would ship a knob that silently does nothing.
      heightController.enable(params.sides === 4);
      rebuild();
    });
  frame.add(params, "width", 0.5, 1.6, 0.01).name("Width").onChange(rebuild);
  heightController.onChange(rebuild);
  frame.open();

  const stock = gui.addFolder("Stock");
  stock
    .add(params, "stock", { "Flat Moulding": "flat", "Square Bar": "square", "Round Bar": "round" })
    .name("Section")
    .onChange(rebuild);
  stock.add(params, "stockWidth", 0.04, 0.3, 0.005).name("Face Width").onChange(rebuild);
  stock.add(params, "stockThickness", 0.02, 0.2, 0.005).name("Depth").onChange(rebuild);
  stock.open();

  const build = gui.addFolder("Construction");
  const explodeController = build.add(params, "explode", 0, 0.35, 0.005).name("Explode");
  const stileController = build.add(params, "stileStock", 0.4, 1.6, 0.01).name("Stile Stock");
  build
    .add(params, "construction", {
      "One Loop (closed sweep)": "loop",
      "Four Pieces (seat cut)": "pieces",
      "Butt (bug)": "butt",
    })
    .name("Built As")
    .onChange(() => {
      const separable = params.construction !== "loop";
      // Both are meaningless on a closed sweep, and for the same reason: it is ONE piece of stock with
      // one cross-section. Unequal stock there is not discouraged, it is inexpressible.
      explodeController.enable(separable);
      stileController.enable(separable);
      if (!separable) params.stileStock = 1;
      rebuild();
    });
  explodeController.onChange(rebuild);
  stileController.onChange(rebuild);
  explodeController.enable(false);
  stileController.enable(false);
  build.add(params, "tintPieces").name("Tint Alternate").onChange(rebuild);
  build.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showPanel").name("Panel").onChange(rebuild);
  inspect.add(params, "showCutPlanes").name("Cut Planes").onChange(rebuild);
  inspect.add(params, "showFrames").name("Station Frames").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  // Read-only: consequences of the shape, not knobs.
  const readout = gui.addFolder("Readout");
  readout.add(params, "cornerAngle").name("Corner").listen().disable();
  readout.add(params, "widening").name("Widening").listen().disable();
  readout.add(params, "vertices").name("Vertices").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    for (const material of [stockA, stockB, panel, wire, ring, plane, ...axes]) material.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  createGeometryBuffers,
  offsetLoop,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Edge Treatment",
  description:
    "STUDY — a box whose edges are CHAMFERED, ROUNDED, or COVED, built as a LOFT between offset loops. " +
    "The construction is the raised panel's, generalized: a stack of cross-sections, each the base " +
    "rectangle pushed inward by however much the edge profile says at that height, lofted together. Three " +
    "treatments come out of one mechanism, differing only in how the inset falls off — a straight line, a " +
    "convex quarter, a concave quarter. That is the inside/outside curve problem as ONE construction with " +
    "a signed shape rather than two. Show Sections to see the stack the solid is made of, and note what " +
    "never happens: no edge is rounded, nothing is trimmed, and the eight corners resolve themselves " +
    "because a corner is just where two bands of the loft meet. Axis points the treatment at any pair of " +
    "faces — set it to Z and this is exactly the raised panel: a rectangle from the front, a trapezoid " +
    "from above.",
};

/** `chamfer` is flat, `round` bulges out, `cove` hollows in. `sharp` leaves the edge alone. */
type EdgeStyle = "sharp" | "chamfer" | "round" | "cove";

/** One cross-section of the stack: how far up from the face, and how far in from the outline. */
interface Level {
  rise: number;
  inset: number;
}

/**
 * The edge's own profile, as a list of levels from the face inward.
 *
 * All three run from `(rise 0, inset radius)` — the face, pulled fully in — to `(rise radius, inset 0)`,
 * where the solid reaches full size. Only the path between differs, and that is the entire difference
 * between a chamfer, a round, and a cove.
 *
 * They are parametrized by ANGLE rather than by rise, because sampling rise uniformly would bunch a
 * round's points where the curve is flat and starve it where it turns.
 */
function edgeProfile(style: EdgeStyle, radius: number, segments: number): Level[] {
  if (style === "sharp" || radius <= 0) return [{ rise: 0, inset: 0 }];
  // A chamfer is one flat facet, so `segments` must not touch it — a chamfer that got smoother would not
  // be a chamfer. Same rule the molding sections follow.
  if (style === "chamfer") {
    return [
      { rise: 0, inset: radius },
      { rise: radius, inset: 0 },
    ];
  }

  const steps = Math.max(1, Math.round(segments));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * (Math.PI / 2);
    return style === "round"
      ? // Convex: the solid reaches nearly full width almost at once, then flattens.
        { rise: radius * (1 - Math.cos(t)), inset: radius * (1 - Math.sin(t)) }
      : // Concave: it stays pulled in and flares late.
        { rise: radius * Math.sin(t), inset: radius * Math.cos(t) };
  });
}

/** The base outline, wound counter-clockwise as `offsetLoop` requires. */
function baseOutline(width: number, depth: number): Vector2[] {
  const hw = width / 2;
  const hd = depth / 2;
  return [new Vector2(-hw, -hd), new Vector2(hw, -hd), new Vector2(hw, hd), new Vector2(-hw, hd)];
}

/**
 * The solid, as a stack of offset loops lofted together.
 *
 * Every section is `offsetLoop(outline, -inset)` — a real offset, not a scale, so a non-square box keeps
 * a constant edge all the way round instead of a wider one on its long sides. That is also what makes the
 * construction survive the day the outline stops being a rectangle.
 *
 * Nothing here knows about edges or corners. The eight corners of a chamfered box come out right because
 * a corner is only ever where two bands of the loft happen to meet, and each band brings its own plane.
 */
function buildSolid(
  width: number,
  height: number,
  depth: number,
  style: EdgeStyle,
  radius: number,
  segments: number,
  bottom: boolean,
  top: boolean,
): { geometry: BufferGeometry; sections: { loop: Vector2[]; y: number }[] } {
  const outline = baseOutline(width, depth);
  // A treatment deeper than half the box would meet itself in the middle. Clamp rather than fold.
  const limit = Math.min(width, depth) / 2 - 1e-4;
  const reach = Math.min(radius, limit, (bottom && top ? height / 2 : height) - 1e-4);
  const profile = edgeProfile(style, Math.max(0, reach), segments);

  const sections: { loop: Vector2[]; y: number }[] = [];
  const push = (y: number, inset: number) => {
    // `offsetLoop` at zero distance still walks and rebuilds the loop; skip it so the untreated middle
    // is literally the same points the caller gave.
    sections.push({ loop: inset < 1e-9 ? outline : offsetLoop(outline, -inset), y });
  };

  if (bottom) for (const level of profile) push(level.rise, level.inset);
  else push(0, 0);

  if (top) for (const level of [...profile].reverse()) push(height - level.rise, level.inset);
  else push(height, 0);

  const buffers = createGeometryBuffers();
  const at = (p: Vector2, y: number): Vec3 => [p.x, y, p.y];

  for (let s = 0; s < sections.length - 1; s++) {
    const lower = sections[s]!;
    const upper = sections[s + 1]!;
    // Coincident sections happen wherever the profile starts or ends flat; a zero-height band has no
    // normal to compute from.
    if (Math.abs(upper.y - lower.y) < 1e-12) continue;

    for (let i = 0; i < lower.loop.length; i++) {
      const j = (i + 1) % lower.loop.length;
      pushQuad(
        buffers,
        [
          at(lower.loop[j]!, lower.y),
          at(lower.loop[i]!, lower.y),
          at(upper.loop[i]!, upper.y),
          at(upper.loop[j]!, upper.y),
        ],
        undefined,
      );
    }
  }

  const cap = (loop: Vector2[], y: number, normal: Vec3, reverse: boolean) => {
    const order = reverse ? loop.map((_, i) => loop.length - 1 - i) : loop.map((_, i) => i);
    for (let i = 1; i < loop.length - 1; i++) {
      pushTriangle(
        buffers,
        [at(loop[order[0]!]!, y), at(loop[order[i]!]!, y), at(loop[order[i + 1]!]!, y)],
        normal,
      );
    }
  };
  const first = sections[0]!;
  const last = sections[sections.length - 1]!;
  cap(first.loop, first.y, [0, -1, 0], false);
  cap(last.loop, last.y, [0, 1, 0], true);

  return { geometry: toBufferGeometry(buffers), sections };
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.6, 1.4, 2.0],
  });

  camera.fov = 24;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.25, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(0.9, 1.2, 1.3);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.8, -0.4, 0.6);
  scene.add(key, bounce);

  // flatShading is a free planarity checker on a loft: a band that shades in two tones is not flat, and
  // on a chamfer every band is supposed to be.
  const solid = new MeshStandardMaterial({
    color: 0xc6cdd6,
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
    side: DoubleSide,
    // Push the solid back a hair so the overlays win the depth test instead of fighting it.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const ring = new LineBasicMaterial({ color: 0xffd166 });
  const ghost = new LineBasicMaterial({ color: 0x5a6472 });

  const params = {
    width: 0.9,
    height: 0.5,
    depth: 0.6,
    style: "round" as EdgeStyle,
    radius: 0.08,
    segments: 4,
    axis: "y" as "x" | "y" | "z",
    bottom: true,
    top: true,
    showSections: false,
    showGhost: false,
    wireframe: false,
    opacity: 1,
    extent: "",
    verts: "",
  };

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
    const { geometry, sections } = buildSolid(
      params.width,
      params.height,
      params.depth,
      params.style,
      params.radius,
      params.segments,
      params.bottom,
      params.top,
    );

    // The stack is built along Y, then pointed. Rotating the GEOMETRY rather than the mesh keeps the
    // measurements below honest — a mesh transform would leave the bounding box lying about the solid.
    if (params.axis === "x") geometry.rotateZ(Math.PI / 2);
    else if (params.axis === "z") geometry.rotateX(Math.PI / 2);

    stage.add(new Mesh(geometry, solid));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    if (params.showSections) {
      // The stack, drawn. This is the whole construction made visible: every section is an offset of the
      // one outline, and the solid is nothing but the bands between them.
      for (const section of sections) {
        const points = section.loop.map((p) => new Vector3(p.x, section.y, p.y));
        const loop = new LineLoop(new BufferGeometry().setFromPoints(points), ring);
        if (params.axis === "x") loop.rotateZ(Math.PI / 2);
        else if (params.axis === "z") loop.rotateX(Math.PI / 2);
        stage.add(loop);
      }
    }

    if (params.showGhost) {
      // The box the treatment was cut out of. The solid must never exceed it, at any style or radius.
      const box = new BoxGeometry(params.width, params.height, params.depth).translate(
        0,
        params.height / 2,
        0,
      );
      if (params.axis === "x") box.rotateZ(Math.PI / 2);
      else if (params.axis === "z") box.rotateX(Math.PI / 2);
      stage.add(new LineSegments(new WireframeGeometry(box), ghost));
    }

    solid.opacity = params.opacity;
    // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
    // the sorted back-to-front path and drops out of the depth buffer.
    solid.transparent = params.opacity < 1;
    solid.depthWrite = params.opacity >= 1;

    geometry.computeBoundingBox();
    const b = geometry.boundingBox!;
    params.extent = `${(b.max.x - b.min.x).toFixed(4)} × ${(b.max.y - b.min.y).toFixed(4)} × ${(b.max.z - b.min.z).toFixed(4)}`;
    params.verts = `${geometry.attributes.position!.count} verts · ${sections.length} sections`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Edge Treatment");

  const edge = gui.addFolder("Edge");
  edge
    .add(params, "style", {
      Sharp: "sharp",
      "Chamfer (flat)": "chamfer",
      "Round (convex)": "round",
      "Cove (concave)": "cove",
    })
    .name("Treatment")
    .onChange(rebuild);
  edge.add(params, "radius", 0, 0.3, 0.005).name("Radius").onChange(rebuild);
  // The low-poly knob: 1 collapses a round or a cove onto its chord, which is a chamfer. It never moves
  // the silhouette's extent — the solid still fills the box exactly.
  edge.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  edge
    .add(params, "axis", { "Y — top and bottom": "y", "X — left and right": "x", "Z — front and back": "z" })
    .name("Axis")
    .onChange(rebuild);
  // A plinth is treated on one end only; a raised panel on both.
  edge.add(params, "bottom").name("Treat Near Face").onChange(rebuild);
  edge.add(params, "top").name("Treat Far Face").onChange(rebuild);
  edge.open();

  const box = gui.addFolder("Box");
  box.add(params, "width", 0.2, 1.6, 0.01).name("Width").onChange(rebuild);
  box.add(params, "height", 0.1, 1.2, 0.01).name("Height").onChange(rebuild);
  box.add(params, "depth", 0.2, 1.6, 0.01).name("Depth").onChange(rebuild);
  box.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showSections").name("Show Sections").onChange(rebuild);
  inspect.add(params, "showGhost").name("Ghost Box").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "extent").name("Extent").listen().disable();
  readout.add(params, "verts").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    solid.dispose();
    wire.dispose();
    ring.dispose();
    ghost.dispose();
    dispose();
  };
}

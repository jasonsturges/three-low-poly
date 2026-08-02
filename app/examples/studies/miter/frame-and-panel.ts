import GUI from "lil-gui";
import {
  BoxGeometry,
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
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createGeometryBuffers,
  linePath,
  miterCuts,
  miterFrames,
  offsetLoop,
  pushQuad,
  pushTriangle,
  rectProfile,
  sweep,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Frame And Panel",
  description:
    "STUDY — a four-panel door, which is the joint the miter work has been circling: FRAME AND PANEL, or " +
    "stile-and-rail construction. The lesson is that the door's own joints are NOT miters. Stiles run the " +
    "full height and rails BUTT into them (traditionally a mortise and tenon), because the door hangs on " +
    "the stile and a continuous member is what carries it — taxonomy (4), the T-junction. The muntin " +
    "between the panels butts into the rails the same way. Switch Frame Joint to MITER for the other real " +
    "style, the mitered cabinet door, built as four separate sticks off `miterCuts` — and note the rail " +
    "widths lock to the stile's, because a miter cannot join unequal stock. What DOES miter on a door is " +
    "the applied panel molding: turn it on and an arbitrary routed profile wraps each opening as one " +
    "closed mitered loop. Panels are RAISED — a field, a bevel, and a tongue that floats in the frame's " +
    "groove — and their four bevels meet at the corners in a 45° hip, which is the same joint the taxonomy " +
    "calls unbuildable by framing. Here it costs nothing, because the surface is lofted between two loops " +
    "rather than swept along one.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  STILE     the two vertical members, running the full height. Outermost, uninterrupted.
//  RAIL      the horizontal members between the stiles: top rail, lock (or middle) rail, bottom rail.
//  MUNTIN    the short vertical divider between rails. (Loosely called a mullion, but a mullion divides
//            an opening in a wall; a muntin divides one inside a frame.)
//  PANEL     the board filling an opening. It FLOATS in a groove — never glued — so it can move with the
//            season without splitting the frame.
//  FIELD     the flat middle of a raised panel. The slope around it is the BEVEL, or the raise; where the
//            two meet is the FILLET.
//  TONGUE    the thinned edge of the panel that sits in the frame's groove.
//  STICKING  molding worked into the frame's own edge. Molding applied separately is PLANTED.

type Role = "stile" | "rail" | "muntin" | "panel" | "molding";

/** Group order in the merged geometry, so a material index means the same thing every rebuild. */
const ROLES: Role[] = ["stile", "rail", "muntin", "panel", "molding"];

interface Part {
  geometry: BufferGeometry;
  role: Role;
  /** Direction this part backs away along when exploded — its own, not derived from a bounding box. */
  push: Vector3;
}

interface Params {
  width: number;
  height: number;
  thickness: number;
  stileWidth: number;
  topRail: number;
  lockRail: number;
  bottomRail: number;
  lockRailCenter: number;
  muntinWidth: number;
  frameJoint: "butt" | "miter";
  panelStyle: "raised" | "flat";
  panelThickness: number;
  bevelWidth: number;
  tongueThickness: number;
  grooveDepth: number;
  molding: boolean;
  moldingWidth: number;
  moldingHeight: number;
  moldingSegments: number;
  explode: number;
  tintRoles: boolean;
  showPanels: boolean;
  wireframe: boolean;
  opacity: number;
  readout: string;
}

interface Opening {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A rectangular member. The frame is boxes on purpose — see the note on `buildFrame`. */
function boxBetween(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BufferGeometry {
  const geometry = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  geometry.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return geometry;
}

/**
 * Where every member lands, and the four openings left between them.
 *
 * A mitered frame forces its four members to ONE section: consecutive members share a cut plane, and
 * unequal stock lands its outer faces at different radii, so the corner steps instead of turning. So in
 * miter mode the rails take the stile's width — the door cannot have a deep bottom rail, which is
 * precisely why real panel doors are not mitered.
 */
function layout(params: Params) {
  const { width, height, stileWidth, muntinWidth, lockRail, lockRailCenter } = params;
  const mitered = params.frameJoint === "miter";
  const topRail = mitered ? stileWidth : params.topRail;
  const bottomRail = mitered ? stileWidth : params.bottomRail;

  const halfWidth = width / 2;
  const innerLeft = -halfWidth + stileWidth;
  const innerRight = halfWidth - stileWidth;
  const lockBottom = height * lockRailCenter - lockRail / 2;
  const lockTop = lockBottom + lockRail;
  const topRailBottom = height - topRail;

  const openings: Opening[] = [
    { x0: innerLeft, x1: -muntinWidth / 2, y0: lockTop, y1: topRailBottom },
    { x0: muntinWidth / 2, x1: innerRight, y0: lockTop, y1: topRailBottom },
    { x0: innerLeft, x1: -muntinWidth / 2, y0: bottomRail, y1: lockBottom },
    { x0: muntinWidth / 2, x1: innerRight, y0: bottomRail, y1: lockBottom },
  ];

  return { halfWidth, innerLeft, innerRight, topRail, bottomRail, lockBottom, lockTop, topRailBottom, openings };
}

/**
 * The frame: two stiles, three rails, two muntins.
 *
 * **Boxes, deliberately.** Of the two joints on offer this is the T-junction, and a T has no bisector to
 * share — the rail dies into the stile's face. That is not a compromise: the stile runs through BECAUSE
 * it must, since the hinges screw into it and the door's whole weight hangs off that one member. Cut it
 * into four mitered corners and you have replaced the strongest member with four end-grain joints.
 *
 * The mitered variant is a real style all the same — most kitchen cabinet doors are built that way — so
 * it is here as an alternative, not as the bug. It is the only construction on this door that uses
 * `miterCuts`, and it is four SEPARATE sticks, because a door frame has to be four members even when
 * they are mitered.
 */
function buildFrame(params: Params, place: ReturnType<typeof layout>): Part[] {
  const { thickness, stileWidth, height, muntinWidth, lockRail } = params;
  const { halfWidth, innerLeft, innerRight, topRail, bottomRail, lockBottom, lockTop, topRailBottom } = place;
  const front = thickness / 2;
  const parts: Part[] = [];

  if (params.frameJoint === "butt") {
    parts.push(
      { geometry: boxBetween(-halfWidth, innerLeft, 0, height, -front, front), role: "stile", push: new Vector3(-1, 0, 0) },
      { geometry: boxBetween(innerRight, halfWidth, 0, height, -front, front), role: "stile", push: new Vector3(1, 0, 0) },
      { geometry: boxBetween(innerLeft, innerRight, topRailBottom, height, -front, front), role: "rail", push: new Vector3(0, 1, 0) },
      { geometry: boxBetween(innerLeft, innerRight, 0, bottomRail, -front, front), role: "rail", push: new Vector3(0, -1, 0) },
    );
  } else {
    // The frame's CENTERLINE — the miter is a property of the path, and the stock straddles it.
    const inset = stileWidth / 2;
    const corners = [
      new Vector3(-halfWidth + inset, inset, 0),
      new Vector3(halfWidth - inset, inset, 0),
      new Vector3(halfWidth - inset, height - inset, 0),
      new Vector3(-halfWidth + inset, height - inset, 0),
    ];
    // One cut plane per corner, shared by the two sticks that meet there. Neither stick contains the
    // corner, so neither could derive it on its own.
    const cuts = miterCuts(corners, { closed: true });
    const profile = rectProfile(stileWidth, thickness);

    for (let i = 0; i < corners.length; i++) {
      const next = (i + 1) % corners.length;
      const frames = miterFrames(linePath(corners[i]!, corners[next]!, 1), {
        startCut: cuts[i],
        endCut: cuts[next],
        // These ends meet each other rather than landing on a surface, so what must be preserved is the
        // true cross-section, not the footprint.
        widenSeatCuts: true,
      });
      const outward = corners[i]!
        .clone()
        .add(corners[next]!)
        .multiplyScalar(0.5)
        .sub(new Vector3(0, height / 2, 0))
        .setZ(0)
        .normalize();
      parts.push({
        geometry: sweep(profile, frames),
        // Verticals read as stiles, horizontals as rails — even though a mitered frame has no member
        // that runs through, which is exactly what the tint shows.
        role: i % 2 === 0 ? "rail" : "stile",
        push: outward,
      });
    }
  }

  // The lock rail and the muntins butt in BOTH modes. They are interior members dying into other
  // members' faces, and no framing operation reaches a T-junction.
  parts.push({
    geometry: boxBetween(innerLeft, innerRight, lockBottom, lockTop, -front, front),
    role: "rail",
    push: new Vector3(0, lockBottom + lockRail / 2 < height / 2 ? -1 : 1, 0),
  });
  parts.push(
    { geometry: boxBetween(-muntinWidth / 2, muntinWidth / 2, lockTop, topRailBottom, -front, front), role: "muntin", push: new Vector3(0, 1, 0) },
    { geometry: boxBetween(-muntinWidth / 2, muntinWidth / 2, bottomRail, lockBottom, -front, front), role: "muntin", push: new Vector3(0, -1, 0) },
  );

  return parts;
}

/** A flat cap over a closed loop, at height `z`, facing `+Z` when `outward` is positive. */
function pushCap(
  buffers: ReturnType<typeof createGeometryBuffers>,
  loop: Vector2[],
  z: number,
  outward: number,
): void {
  const normal: Vec3 = [0, 0, Math.sign(outward)];
  const at = (i: number): Vec3 => [loop[i]!.x, loop[i]!.y, z];
  const order = outward > 0 ? loop.map((_, i) => i) : loop.map((_, i) => loop.length - 1 - i);

  if (loop.length === 4) {
    pushQuad(buffers, [at(order[0]!), at(order[1]!), at(order[2]!), at(order[3]!)], normal);
    return;
  }
  // A fan, for when the field is not a rectangle — an arched panel head, later.
  for (let i = 1; i < loop.length - 1; i++) {
    pushTriangle(buffers, [at(order[0]!), at(order[i]!), at(order[i + 1]!)], normal);
  }
}

/**
 * A RAISED panel: a flat field, a bevel sloping down to a thin tongue, on both faces.
 *
 * The shape is a loft between two closed loops — the panel's outline and the field inset inside it —
 * and that is the whole construction. Which matters for the miter taxonomy: **the four bevels meet at
 * the corners in a 45° hip**, the two-faceted corner listed as not expressible by framing. It costs
 * nothing here, because the surface is lofted BETWEEN two loops rather than swept ALONG one: the
 * corner is just where two bands of that loft happen to meet, and each band brings its own plane.
 *
 * The inset comes from `offsetLoop`, not from shrinking the rectangle — the two are the same only for
 * a square, and only a real offset survives the day this panel gets an arched head.
 */
function buildPanel(opening: Opening, params: Params): BufferGeometry {
  const { grooveDepth, panelThickness, tongueThickness, bevelWidth, panelStyle } = params;
  // The panel runs INTO the frame's groove on all four sides. It is never sized to the opening: a panel
  // cut to the opening would fall out of it.
  const outline = [
    new Vector2(opening.x0 - grooveDepth, opening.y0 - grooveDepth),
    new Vector2(opening.x1 + grooveDepth, opening.y0 - grooveDepth),
    new Vector2(opening.x1 + grooveDepth, opening.y1 + grooveDepth),
    new Vector2(opening.x0 - grooveDepth, opening.y1 + grooveDepth),
  ];

  const buffers = createGeometryBuffers();
  const flat = panelStyle === "flat";
  const edge = flat ? panelThickness / 2 : tongueThickness / 2;
  const field = panelThickness / 2;
  // Never past the middle: a bevel wider than half the panel has no field left to slope down to.
  const inset = Math.min(bevelWidth, Math.min(opening.x1 - opening.x0, opening.y1 - opening.y0) / 2 - 0.005);
  const inner = flat ? outline : offsetLoop(outline, -inset);

  for (const side of [1, -1]) {
    pushCap(buffers, inner, side * field, side);
    if (flat) continue;

    // The bevel band. Each quad carries its own slanted normal, so flat shading facets it — and a quad
    // that shades in two tones would be telling you the loft is non-planar.
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      const o0: Vec3 = [outline[i]!.x, outline[i]!.y, side * edge];
      const o1: Vec3 = [outline[j]!.x, outline[j]!.y, side * edge];
      const f1: Vec3 = [inner[j]!.x, inner[j]!.y, side * field];
      const f0: Vec3 = [inner[i]!.x, inner[i]!.y, side * field];
      pushQuad(buffers, side > 0 ? [o0, o1, f1, f0] : [o1, o0, f0, f1], undefined);
    }
  }

  // The tongue's own edge — the sliver that disappears into the groove.
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    pushQuad(
      buffers,
      [
        [outline[i]!.x, outline[i]!.y, -edge],
        [outline[j]!.x, outline[j]!.y, -edge],
        [outline[j]!.x, outline[j]!.y, edge],
        [outline[i]!.x, outline[i]!.y, edge],
      ],
      undefined,
    );
  }

  return toBufferGeometry(buffers);
}

/**
 * A quarter-round (ovolo) molding section, in the station's own axes.
 *
 * `px` runs along the frame's normal — proud of the door's face — and `py` along its binormal, which on
 * a loop wound counter-clockwise points radially OUTWARD, away from the opening. So the section is a lip
 * standing at the opening's edge, curving down onto the frame.
 *
 * This is the entire answer to "can a routed molding be mitered": a profile is a list of 2D points and
 * nothing else, so a decorative section goes exactly where `rectProfile` goes. The miter never sees it —
 * the corner is a property of the PATH.
 */
function ovoloProfile(width: number, height: number, segments: number): Vec2[] {
  const points: Vec2[] = [[0, 0]];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * (Math.PI / 2);
    points.push([height * Math.cos(angle), width * Math.sin(angle)]);
  }
  return points;
}

/**
 * Planted molding around one opening, on both faces — one closed mitered loop each.
 *
 * The back face runs the loop REVERSED with a `-Z` reference, which lands the section proud of the back
 * and still pointing outward: same construction, mirrored, rather than a mirrored copy of the geometry.
 */
function buildMolding(opening: Opening, params: Params): Part[] {
  const profile = ovoloProfile(params.moldingWidth, params.moldingHeight, params.moldingSegments);
  const front = params.thickness / 2;
  const corners = (z: number) => [
    new Vector3(opening.x0, opening.y0, z),
    new Vector3(opening.x1, opening.y0, z),
    new Vector3(opening.x1, opening.y1, z),
    new Vector3(opening.x0, opening.y1, z),
  ];

  return [1, -1].map((side) => {
    const loop = corners(side * front);
    if (side < 0) loop.reverse();
    const stations = miterFrames(
      loop.map((position) => ({ position, tangent: new Vector3() })),
      { closed: true, reference: new Vector3(0, 0, side) },
    );
    return {
      geometry: sweep(profile, stations, { closed: true }),
      role: "molding" as Role,
      push: new Vector3(0, 0, side),
    };
  });
}

/**
 * The whole door, as ONE geometry.
 *
 * Two-stage merge: every part of a role merges into one geometry, then those five merge WITH GROUPS. The
 * result is a single `BufferGeometry` carrying one material group per role, in a fixed order — so a mesh
 * takes a material array and the group index means the same thing on every rebuild. Merging the parts
 * individually would give one group per box, which is a different material index every time the frame
 * joint changes.
 */
function buildDoor(params: Params): { geometry: BufferGeometry; parts: number } {
  const place = layout(params);
  const parts: Part[] = [...buildFrame(params, place)];

  if (params.showPanels) {
    for (const opening of place.openings) {
      parts.push({ geometry: buildPanel(opening, params), role: "panel", push: new Vector3(0, 0, 1) });
      if (params.molding) parts.push(...buildMolding(opening, params));
    }
  }

  if (params.explode > 0) {
    for (const part of parts) {
      // Molding leads, then panels, then the frame — an assembly diagram reads outside-in.
      const reach = params.explode * (part.role === "molding" ? 2.2 : part.role === "panel" ? 1.4 : 1);
      const push = part.push.clone().multiplyScalar(reach);
      part.geometry.translate(push.x, push.y, push.z);
    }
  }

  const byRole = ROLES.map((role) => {
    const own = parts.filter((part) => part.role === role).map((part) => part.geometry);
    return own.length > 0 ? mergeGeometries(own) : null;
  });
  for (const part of parts) part.geometry.dispose();

  const present = byRole.filter((geometry): geometry is BufferGeometry => geometry !== null);
  const geometry = mergeGeometries(present, true)!;
  for (const merged of present) merged.dispose();

  return { geometry, parts: parts.length };
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    // A 2.03m door on a 24 degree lens needs the distance. The previous [1.9, 2.4, 4.4] framed 2.12 of
    // vertical against a 2.03 door — it fitted with 4% to spare, and Explode pushes parts further out
    // still, so anything but the assembled state ran off the frame.
    cameraPosition: [2.4, 2.75, 5.5],
  });

  camera.fov = 24;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  // The door's own middle, so it sits centred rather than riding low.
  controls.target.set(0, 1.02, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(0.9, 1.4, 1.6);
  const bounce = new DirectionalLight(0x9fb4d0, 0.45);
  bounce.position.set(-0.9, -0.4, 0.7);
  scene.add(key, bounce);

  // One material per role, in ROLES order — the merged geometry's groups index straight into this.
  const paint = (color: number) =>
    new MeshStandardMaterial({
      color,
      roughness: 0.75,
      metalness: 0,
      // A free planarity check on the panel bevels: a quad shading in two tones is not flat.
      flatShading: true,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  const TINTS: Record<Role, number> = {
    stile: 0xc9d3e0,
    rail: 0x9fb0c6,
    muntin: 0x7f93ad,
    panel: 0xb9c6d6,
    molding: 0xe4c98a,
  };
  const PLAIN = 0xb9c2cf;
  const materials = ROLES.map(() => paint(PLAIN));
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params: Params = {
    // A real 32in x 80in x 1-3/4in door, in metres.
    width: 0.813,
    height: 2.032,
    thickness: 0.045,
    stileWidth: 0.115,
    topRail: 0.115,
    lockRail: 0.2,
    bottomRail: 0.235,
    lockRailCenter: 0.44,
    muntinWidth: 0.1,
    frameJoint: "butt",
    panelStyle: "raised",
    panelThickness: 0.018,
    bevelWidth: 0.055,
    tongueThickness: 0.008,
    grooveDepth: 0.012,
    molding: false,
    moldingWidth: 0.022,
    moldingHeight: 0.012,
    moldingSegments: 4,
    explode: 0,
    tintRoles: true,
    showPanels: true,
    wireframe: false,
    opacity: 1,
    readout: "",
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
    const { geometry, parts } = buildDoor(params);
    stage.add(new Mesh(geometry, materials));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    for (const [index, role] of ROLES.entries()) {
      const material = materials[index]!;
      material.color.setHex(params.tintRoles ? TINTS[role] : PLAIN);
      material.opacity = params.opacity;
      // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
      // the sorted back-to-front path and drops out of the depth buffer.
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    params.readout = `${geometry.attributes.position!.count} verts · ${geometry.groups.length} groups · from ${parts} parts`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Frame And Panel");

  const joint = gui.addFolder("Joinery");
  const railControllers: ReturnType<typeof joint.add>[] = [];
  joint
    .add(params, "frameJoint", { "Butt — stiles run through": "butt", "Miter — four sticks": "miter" })
    .name("Frame Joint")
    .onChange(() => {
      // A mitered frame is one section for all four members, so the rail widths stop being free. They
      // are not merely ignored — there is no cross-section that could express them.
      for (const controller of railControllers) controller.enable(params.frameJoint === "butt");
      rebuild();
    });
  joint.add(params, "molding").name("Panel Molding").onChange(rebuild);
  joint.add(params, "explode", 0, 0.25, 0.005).name("Explode").onChange(rebuild);
  joint.open();

  const frame = gui.addFolder("Frame");
  frame.add(params, "width", 0.6, 1.1, 0.005).name("Width").onChange(rebuild);
  frame.add(params, "height", 1.6, 2.4, 0.01).name("Height").onChange(rebuild);
  frame.add(params, "thickness", 0.025, 0.09, 0.001).name("Thickness").onChange(rebuild);
  frame.add(params, "stileWidth", 0.06, 0.2, 0.005).name("Stile Width").onChange(rebuild);
  railControllers.push(
    frame.add(params, "topRail", 0.06, 0.25, 0.005).name("Top Rail").onChange(rebuild),
    frame.add(params, "bottomRail", 0.06, 0.35, 0.005).name("Bottom Rail").onChange(rebuild),
  );
  frame.add(params, "lockRail", 0.08, 0.35, 0.005).name("Lock Rail").onChange(rebuild);
  frame.add(params, "lockRailCenter", 0.25, 0.6, 0.005).name("Lock Rail Height").onChange(rebuild);
  frame.add(params, "muntinWidth", 0.05, 0.2, 0.005).name("Muntin Width").onChange(rebuild);

  const panel = gui.addFolder("Panel");
  panel
    .add(params, "panelStyle", { "Raised (fielded)": "raised", Flat: "flat" })
    .name("Style")
    .onChange(rebuild);
  panel.add(params, "panelThickness", 0.008, 0.03, 0.001).name("Thickness").onChange(rebuild);
  panel.add(params, "bevelWidth", 0.01, 0.12, 0.005).name("Bevel Width").onChange(rebuild);
  panel.add(params, "tongueThickness", 0.004, 0.02, 0.001).name("Tongue").onChange(rebuild);
  panel.add(params, "grooveDepth", 0, 0.03, 0.001).name("Groove Depth").onChange(rebuild);
  panel.open();

  const molding = gui.addFolder("Molding");
  molding.add(params, "moldingWidth", 0.008, 0.05, 0.001).name("Width").onChange(rebuild);
  molding.add(params, "moldingHeight", 0.004, 0.03, 0.001).name("Height").onChange(rebuild);
  // The low-poly knob on the section, exactly as `segments` is on a curve: 1 is a chamfer, 12 is turned.
  molding.add(params, "moldingSegments", 1, 12, 1).name("Segments").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "tintRoles").name("Tint by Role").onChange(rebuild);
  inspect.add(params, "showPanels").name("Panels").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    for (const material of [...materials, wire]) material.dispose();
    dispose();
  };
}

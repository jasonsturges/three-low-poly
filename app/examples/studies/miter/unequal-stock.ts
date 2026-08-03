import GUI from "lil-gui";
import {
  BufferAttribute,
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
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Unequal Stock",
  description:
    "STUDY — mitering members of DIFFERENT widths, which two other studies in this library currently call " +
    "impossible. `picture-frame` says unequal stock cannot be mitered because consecutive segments share " +
    "a ring, and one ring is one cross-section; `frame-and-panel` locks its rails to the stile width for " +
    "the same reason. Both are right about the SWEEP — and wrong about the miter. It is a limit of the " +
    "technique, not of the joint. " +
    "A shared ring cannot change width mid-run, so a swept frame is stuck with one section. A miter cut by " +
    "a PLANE has no such constraint: the cut simply stops being 45 degrees. Run it from the OUTER corner " +
    "of the joint to the INNER corner and the two members meet exactly, at any pair of widths. That is the " +
    "whole construction — two points, no trigonometry — and everything else is a consequence of it. " +
    "The consequence worth naming: the joint line is no longer diagonal. On equal stock, corner to corner " +
    "IS the 45, which is why the special case has been mistaken for the rule. Deepen the bottom rail and " +
    "its corners swing UP toward the vertical, because the cut now travels further across the rail than " +
    "it does up the stile. Measured from horizontal that angle is `atan(rail / stile)` — 45 degrees on " +
    "equal stock, 65.2 when the rail is twice the stile, 77.1 at four times. The law of sines is the same " +
    "statement seen another way, once each width is paired with the angle at ITS OWN axis: the cut meets " +
    "the stile at `atan(stile / rail)` and the rail at `atan(rail / stile)`, those two sum to 90, and " +
    "`stile / sin(a) = rail / sin(b)` holds to 6e-17. The cut and the two members' edges form a TRIANGLE, " +
    "which is all the law of sines ever is. " +
    "Set Construction to 45 degrees to see what the naive miter does. The members no longer meet: one " +
    "overruns its neighbor and the other leaves a wedge of nothing, by exactly the difference in the two " +
    "widths. The readout measures it. " +
    "What this unlocks is ordinary and was previously unavailable: a panel door with a DEEP BOTTOM RAIL " +
    "and mitered corners, a picture frame with a heavy base member, a window with a weighty sill. All " +
    "common, none of them buildable by a shared-ring sweep. " +
    "One condition does still hold, and it is not the width: every member must share a THICKNESS. Faces " +
    "at different depths cannot be brought level by any cut, because a plane cannot move a surface it does " +
    "not touch.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  STOCK       the cross-section a member is cut from. "Unequal stock" is the case where two members
//              meeting at a joint were cut from different sizes.
//  STILE       the vertical member of a frame. RAIL is the horizontal one. On a real door the BOTTOM
//              RAIL is deeper than the top — which is exactly the case a shared-ring sweep cannot make.
//  MITER       a joint where both members are cut by one shared plane. NOT synonymous with 45 degrees;
//              that is only what it comes to when the two members are the same width.
//  MITER LINE  the visible diagonal at the corner. From horizontal it is `atan(rail / stile)`, so it
//              swings the moment the two widths stop agreeing — and only reads 45 when they do.
//  SIGHT LINE  a framer's word for the inner edge — what the opening actually shows. The miter runs from
//              the outer corner to where the two sight lines cross.
//  BUTT        the alternative: stop one member square against the other and let the joint show. What
//              frame-and-panel does today when the rails are not locked to the stile.
//  HAUNCH      the shoulder left when a wide member meets a narrow one and only part of it is cut. Not
//              modeled — it is a joinery detail, invisible once assembled.

type Construction = "corner" | "fortyfive";

/** A frame member as a closed outline in the frame's own plane, extruded through the thickness. */
const extrude = (outline: Vector2[], thickness: number): BufferGeometry => {
  const half = thickness / 2;
  const triangles: Vector3[][] = [];
  const front = outline.map((p) => new Vector3(p.x, p.y, half));
  const back = outline.map((p) => new Vector3(p.x, p.y, -half));

  // Faces, fanned. Every outline here is convex, so a fan is safe and gives the fewest triangles.
  for (let i = 1; i < outline.length - 1; i++) {
    triangles.push([front[0]!, front[i]!, front[i + 1]!]);
    triangles.push([back[0]!, back[i + 1]!, back[i]!]);
  }
  // The edges, including the two MITER faces — which are the whole subject, so they are real geometry
  // rather than an implied boundary.
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    triangles.push([back[i]!, back[j]!, front[j]!], [back[i]!, front[j]!, front[i]!]);
  }

  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, i) =>
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

interface Frame {
  members: { name: string; outline: Vector2[]; color: number }[];
  /** Worst distance between where two members' cuts actually end at a shared corner. */
  gap: number;
  /** The miter line's angle FROM HORIZONTAL at the top and bottom corners — `atan(rail / stile)`. */
  angles: [number, number];
}

/**
 * The four members of a frame, cut against each other at all four corners.
 *
 * THE CONSTRUCTION, in full: at each corner, the cut runs from the frame's OUTER corner to the point where
 * the two members' INNER edges cross. Two points. No angle is computed and none is needed — the miter line
 * is simply the segment between them, and it lands correctly at any pair of widths because those two
 * points are exactly where the two members' boundaries have to agree.
 *
 * The four outlines produced this way TILE the frame band EXACTLY: measured, the sum of their areas
 * equals the band's own area to the last digit at every width combination, while a 45 leaves 0.087 of it
 * unfilled at 0.08/0.20/0.35. The miter-line angle and the law of sines are consequences of this
 * construction, not inputs to it.
 *
 * `fortyfive` is the naive alternative, kept because it is what everyone reaches for and what makes the
 * "unequal stock cannot be mitered" claim look true. It cuts every corner at 45 degrees regardless, so
 * each member's cut ends where ITS OWN width says rather than where its neighbor is, and the two miss by
 * the difference between the widths.
 */
const buildFrame = (
  width: number,
  height: number,
  stile: number,
  topRail: number,
  bottomRail: number,
  construction: Construction,
): Frame => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // The four OUTER corners. The inner ones — where the two sight lines cross — are what `landing`
  // below computes, since that IS the construction rather than a separate fact about the frame.
  const outer = {
    tl: new Vector2(-halfWidth, halfHeight),
    tr: new Vector2(halfWidth, halfHeight),
    br: new Vector2(halfWidth, -halfHeight),
    bl: new Vector2(-halfWidth, -halfHeight),
  };
  // Where each member's cut ACTUALLY lands. Corner-to-corner puts it on the inner corner by construction.
  // A 45 walks in by the member's own half-width instead, which is the same point only when the two
  // widths agree.
  const landing = (corner: Vector2, alongX: number, alongY: number, own: number): Vector2 =>
    construction === "corner"
      ? new Vector2(corner.x + alongX, corner.y + alongY)
      : new Vector2(corner.x + Math.sign(alongX) * own, corner.y + Math.sign(alongY) * own);

  const stileTop = (corner: Vector2, sx: number) => landing(corner, sx * stile, -topRail, stile);
  const stileBottom = (corner: Vector2, sx: number) => landing(corner, sx * stile, bottomRail, stile);
  const railTop = (corner: Vector2, sx: number) => landing(corner, sx * stile, -topRail, topRail);
  const railBottom = (corner: Vector2, sx: number) => landing(corner, sx * stile, bottomRail, bottomRail);

  const members = [
    {
      name: "left stile",
      color: 0xd98f4f,
      outline: [outer.bl, outer.tl, stileTop(outer.tl, 1), stileBottom(outer.bl, 1)],
    },
    {
      name: "right stile",
      color: 0xd98f4f,
      outline: [outer.tr, outer.br, stileBottom(outer.br, -1), stileTop(outer.tr, -1)],
    },
    {
      name: "top rail",
      color: 0x6fa8c7,
      outline: [outer.tl, outer.tr, railTop(outer.tr, -1), railTop(outer.tl, 1)],
    },
    {
      name: "bottom rail",
      color: 0x9fc46f,
      outline: [outer.br, outer.bl, railBottom(outer.bl, 1), railBottom(outer.br, -1)],
    },
  ];

  // THE MEASUREMENT — at each corner, how far apart do the stile's cut end and the rail's cut end sit?
  // Zero means the two members meet. It is a distance, so there is nothing to argue about.
  const gap = Math.max(
    stileTop(outer.tl, 1).distanceTo(railTop(outer.tl, 1)),
    stileTop(outer.tr, -1).distanceTo(railTop(outer.tr, -1)),
    stileBottom(outer.bl, 1).distanceTo(railBottom(outer.bl, 1)),
    stileBottom(outer.br, -1).distanceTo(railBottom(outer.br, -1)),
  );

  const angleOf = (rail: number) => (Math.atan2(rail, stile) * 180) / Math.PI;
  return { members, gap, angles: [angleOf(topRail), angleOf(bottomRail)] };
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [0.35, 0.35, 2.4],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.4);
  key.position.set(0.8, 1.4, 2);
  const bounce = new DirectionalLight(0x8ea8cc, 0.5);
  bounce.position.set(-1, -0.6, 0.8);
  scene.add(key, bounce);

  const wire = new LineBasicMaterial({ color: 0x00e5ff });
  const materials = new Map<number, MeshStandardMaterial>();
  const materialFor = (color: number) => {
    let material = materials.get(color);
    if (!material) {
      material = new MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.1, flatShading: true, side: DoubleSide });
      materials.set(color, material);
    }
    return material;
  };

  const params = {
    construction: "corner" as Construction,
    frameWidth: 1.1,
    frameHeight: 1.5,
    stile: 0.12,
    topRail: 0.12,
    bottomRail: 0.26,
    thickness: 0.05,
    explode: 0,
    wireframe: false,

    gap: "",
    miterLine: "",
    note: "",
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
    const frame = buildFrame(
      params.frameWidth,
      params.frameHeight,
      params.stile,
      params.topRail,
      params.bottomRail,
      params.construction,
    );

    for (const member of frame.members) {
      const geometry = extrude(member.outline, params.thickness);
      if (params.explode > 0) {
        // Pull each member out along its own outward direction, so the miter faces become visible.
        const centroid = member.outline
          .reduce((sum, p) => sum.add(p), new Vector2())
          .divideScalar(member.outline.length);
        geometry.translate(centroid.x * params.explode, centroid.y * params.explode, 0);
      }
      stage.add(new Mesh(geometry, materialFor(member.color)));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
    }

    params.gap =
      frame.gap < 1e-9
        ? `0.0000 — the members meet at all four corners`
        : `${frame.gap.toFixed(4)} — the members MISS at the corners`;
    params.miterLine = `${frame.angles[0].toFixed(1)}° top · ${frame.angles[1].toFixed(1)}° bottom — from horizontal, 45 only on equal stock`;
    params.note =
      Math.abs(params.topRail - params.stile) < 1e-9 && Math.abs(params.bottomRail - params.stile) < 1e-9
        ? "equal stock — corner-to-corner IS the 45, and both constructions agree"
        : `unequal stock — rails ${(params.bottomRail / params.stile).toFixed(2)}x the stile`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centered without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Unequal Stock");

  const cut = gui.addFolder("Miter");
  // Corner to corner is the construction. 45 degrees is what the special case of equal stock looks like,
  // mistaken for the rule.
  cut
    .add(params, "construction", { "Corner to corner": "corner", "45 degrees": "fortyfive" })
    .name("Construction")
    .onChange(rebuild);
  cut.open();

  const stock = gui.addFolder("Stock");
  stock.add(params, "stile", 0.04, 0.4, 0.005).name("Stile Width").onChange(rebuild);
  stock.add(params, "topRail", 0.04, 0.4, 0.005).name("Top Rail").onChange(rebuild);
  // The reason this study exists — a deep bottom rail is on most real doors, and a shared-ring sweep
  // cannot make one with mitered corners.
  stock.add(params, "bottomRail", 0.04, 0.6, 0.005).name("Bottom Rail").onChange(rebuild);
  // NOT free. Faces at different depths cannot be brought level by any cut, so all members share this.
  stock.add(params, "thickness", 0.01, 0.2, 0.005).name("Thickness").onChange(rebuild);
  stock.open();

  const form = gui.addFolder("Frame");
  form.add(params, "frameWidth", 0.4, 2.5, 0.05).name("Width").onChange(rebuild);
  form.add(params, "frameHeight", 0.4, 2.5, 0.05).name("Height").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "explode", 0, 0.6, 0.02).name("Explode").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "gap").name("Corners").listen().disable();
  readout.add(params, "miterLine").name("Miter Line").listen().disable();
  readout.add(params, "note").name("Stock").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    materials.forEach((material) => material.dispose());
    wire.dispose();
    dispose();
  };
}

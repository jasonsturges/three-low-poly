import GUI from "lil-gui";
import {
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WireframeGeometry,
} from "three";
import { circleProfile, linePath, miterFrames, sweep, transportFrames } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Mitered Corner",
  description:
    "STUDY — the reference for joining swept bars, isolated to THREE PIECES at one bottom corner of an " +
    "iron cage: two rails and the raked post they meet. Built twice, labelled in the scene. LEFT (BUG) is " +
    "framed perpendicular to each path — the rails stop dead at the corner leaving a wedge of nothing, and " +
    "the post's slanted end lip punches out through the rail. RIGHT (MITERED) shares one ring between rail " +
    "segments and seat cuts the post to the surface it stands on, so nothing interpenetrates. Overlay the " +
    "wireframe to see the corner share a single ring rather than two bars overlapping, and drop Rail Stock " +
    "to 1.00 to watch the outer edge graze.",
};

// The lower corner of a tapered iron cage, at the scale a lantern actually uses.
const CAGE = {
  halfWidth: 0.15,
  taper: 0.72,
  height: 0.4,
  barWidth: 0.015,
  /**
   * Rail stock as a fraction of the post's. `1` is the ALIGNED case — the rail's outer face lands at
   * `cornerRadius + railStock × barWidth` and the post's at `cornerRadius + barWidth`, so equal stock is
   * what makes the post's faces continue the rail's.
   *
   * Move it off 1 and the post is oversized or undersized on **all four faces at once**. It cannot be tuned
   * to fix a corner: shrinking the rail brings its outer face toward the post's and pushes its inner face
   * away by the same amount, so one side closes exactly as the other opens.
   */
  railStock: 1,
};

const UP = new Vector3(0, 1, 0);
/** The cage's own axis — a square bar squares up to this, not to the corner's diagonal. */
const CAGE_AXIS = new Vector3(1, 0, 0);

/** Corner `index` of the square cage at half-width `halfWidth`, height `y`. */
const corner = (halfWidth: number, y: number, index: number) => {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  return new Vector3(
    Math.cos(angle) * halfWidth * Math.SQRT2,
    y,
    Math.sin(angle) * halfWidth * Math.SQRT2,
  );
};

/**
 * The three points of the isolated corner: halfway along the incoming rail, the corner itself, halfway
 * along the outgoing rail. Both sides build from these same points, so nothing but the framing differs.
 */
const railPoints = (halfWidth: number) => {
  const at = corner(halfWidth, 0, 0);
  return [
    at.clone().lerp(corner(halfWidth, 0, 3), 0.5),
    at,
    at.clone().lerp(corner(halfWidth, 0, 1), 0.5),
  ];
};

/**
 * THE BUG. Every bar framed perpendicular to its own path.
 *
 * Two failures compound, and neither is a sizing mistake — both are framing mistakes:
 *
 * 1. Each rail terminates ON the corner point with a ring square to its own direction. Outside the corner
 *    that leaves an empty wedge; inside, the two rails interpenetrate. Extending them to overlap only
 *    trades the gap for protruding stubs.
 * 2. The post is RAKED, so a ring square to the post is slanted relative to the rail it lands on. One lip
 *    of the end face buries itself while the opposite lip lifts clear and punches out through the rail.
 */
function perpendicularCorner({ halfWidth, taper, height, barWidth, railStock }: typeof CAGE): BufferGeometry[] {
  const [before, at, after] = railPoints(halfWidth);
  const rail = circleProfile(barWidth * railStock, 4);

  return [
    // Two separate rails, each terminating ON the corner point.
    sweep(rail, transportFrames(linePath(before, at, 1))),
    sweep(rail, transportFrames(linePath(at, after, 1))),
    // The post, cut square to its own raked axis, run to the rail's centerline.
    sweep(
      circleProfile(barWidth, 4),
      transportFrames(linePath(at, corner(halfWidth * taper, height, 0), 1)),
    ),
  ];
}

/**
 * THE FIX. Same dimensions, different framing.
 *
 * The rails become ONE sweep with a mitered station at the corner: the ring sits on the plane bisecting the
 * joint, so both segments share the identical ring and the corner closes exactly — no gap, no overlap, and
 * no end caps to hide. The post is SEAT CUT: its end ring is cut to the horizontal plane it lands on rather
 * than square to its own axis, so the end face is flat and stands ON the rail instead of inside it.
 */
function miteredCorner(
  { halfWidth, taper, height, barWidth, railStock }: typeof CAGE,
  squareToCage: boolean,
): BufferGeometry[] {
  // ONE open sweep of three stations — half a rail, the mitered corner, half a rail. The two ends are
  // arbitrary cut-offs and get ordinary perpendicular frames; only the middle station is mitered.
  const rails = sweep(
    circleProfile(barWidth * railStock, 4),
    miterFrames(
      railPoints(halfWidth).map((position) => ({ position, tangent: new Vector3() })),
      { reference: UP },
    ),
  );

  // The post STANDS ON the rail's top surface rather than running into it — a miter aligns surfaces so
  // members meet, and burying one inside another is not a joint. The surface is read off the rail's own
  // bounding box, because the profile decides where a ring's extremes land: `circleProfile(r, 4)` reaches
  // `r / √2` along a frame axis, not `r`.
  rails.computeBoundingBox();
  const footY = rails.boundingBox!.max.y;

  // The post's center sits on the RAIL's center radius at the contact plane — NOT on the nominal corner
  // line evaluated there. The corner line rakes inward as it rises, so by `footY` it has already drifted in
  // and the post's faces miss the rail's by that drift.
  const foot = corner(halfWidth, footY, 0);
  const head = corner(halfWidth * taper, height, 0);

  const post = sweep(
    circleProfile(barWidth, 4),
    // ONE segment: an intermediate station on a straight bar is unstretched while the seat-cut end widens,
    // which pinches the middle.
    miterFrames(linePath(foot, head, 1), {
      startCut: UP,
      // BOTH ends, matching the lantern. With only the foot seat cut, the head falls back to a frame
      // perpendicular to the raked axis — and two rings at different orientations cannot be joined by planar
      // quads. The side faces twist, so each one's two triangles carry different normals and shade
      // differently under flatShading. It worsens as the bar shortens, because the rake grows: measured
      // 8.7° of crease at height 0.4 rising to 33.6° at 0.1, against 0.000° when both ends are cut flat.
      endCut: UP,
      // `circleProfile(r, 4)` puts its faces perpendicular to the frame's axes, so this decides which way
      // the square bar presents. It must be perpendicular to the cut normal, so it cannot be UP — and it
      // must be a CAGE axis. The corner's radial direction looks like the symmetric choice and is the
      // wrong symmetry: it turns the post 45° and points an edge outward instead of a face.
      reference: squareToCage ? CAGE_AXIS : new Vector3(foot.x, 0, foot.z).normalize(),
    }),
  );

  return [rails, post];
}

/** A flat text label, so which side is which does not depend on remembering. */
function createLabel(text: string, tint: string): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.font = "bold 64px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = tint;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map, transparent: true }));
  sprite.scale.set(0.24, 0.06, 1);
  return sprite;
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    // Equal on all three axes, so no axis is privileged and a face that is flush looks flush from the start.
    cameraPosition: [1.2, 1.2, 1.2],
  });
  // Looking in on the corners from OUTSIDE the cage diagonal, which is where both defects show.
  controls.target.set(0, 0.06, 0);

  // A long lens, pulled back to match. Judging whether two faces line up is exactly what perspective
  // foreshortening destroys — at 75° a flush joint can read as a step and a step as flush, depending only on
  // where the corner sits in frame. Narrowing the field flattens that out.
  camera.fov = 16;
  // The 0.1 default clips long before you are close enough to read a joint on bars 0.015 across.
  camera.near = 0.001;
  camera.updateProjectionMatrix();
  controls.update();

  // The shared rig is one directional from upper-left, which leaves the outward corner faces — the exact
  // faces this study is about — reading as flat black. Two fills: one from the viewer's side so the outer
  // corner is lit, and a low one so the rail's underside is not a silhouette.
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(0.6, 0.7, 1);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.4, -0.8, 0.3);
  scene.add(key, bounce);

  // Mid-grey and barely metallic. Dark metal needs an environment map to read as anything but black, and
  // this study is about seeing form — legibility beats material accuracy here.
  const iron = new MeshStandardMaterial({
    color: 0x8d949e,
    metalness: 0.15,
    roughness: 0.55,
    flatShading: true,
    // DoubleSide because inspecting a joint means seeing into it: with back faces culled, a transparent
    // bar shows nothing where it matters.
    side: DoubleSide,
    // Push the solid back a hair so the wireframe overlay wins the depth test instead of fighting it.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    ...CAGE,
    wireframe: false,
    opacity: 1,
    separation: 0.46,
    squareToCage: true,
    showRails: true,
    showPost: true,
    showBug: true,
    showLabels: true,
  };

  const left = new Group();
  const right = new Group();
  scene.add(left, right);

  const bugLabel = createLabel("PERPENDICULAR — BUG", "#ff9d6b");
  const fixLabel = createLabel("MITERED — FIX", "#7fe3a1");
  left.add(bugLabel);
  right.add(fixLabel);

  // The post is always the LAST part each builder returns, so isolation does not need the builders to
  // report anything about themselves.
  const fill = (group: Group, parts: BufferGeometry[]) => {
    for (const [index, part] of parts.entries()) {
      const isPost = index === parts.length - 1;
      if (isPost ? !params.showPost : !params.showRails) {
        part.dispose();
        continue;
      }
      group.add(new Mesh(part, iron));
      // Overlaid rather than replacing the surface — a bare wireframe of a joint is unreadable because you
      // cannot tell which lines are in front.
      if (params.wireframe) group.add(new LineSegments(new WireframeGeometry(part), wire));
    }
  };

  // Copy before iterating, and use remove() rather than reassigning children, which would leave every
  // dropped child still pointing at this group as its parent. Labels persist across rebuilds.
  const clear = (group: Group) => {
    for (const child of [...group.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        group.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear(left);
    clear(right);
    if (params.showBug) fill(left, perpendicularCorner(params));
    fill(right, miteredCorner(params, params.squareToCage));

    // Park each corner point itself on the group origin, so both joints sit at a known place and stay put
    // as the cage is resized — the corner is the subject, not the cage.
    const at = corner(params.halfWidth, 0, 0);
    left.position.set(-params.separation / 2 - at.x, 0, -at.z);
    right.position.set(params.showBug ? params.separation / 2 - at.x : -at.x, 0, -at.z);
    // Well clear of the post's head, because a label parked just above the joint lands squarely in the
    // sightline the moment you orbit to inspect it.
    bugLabel.position.set(at.x, params.height + 0.16, at.z);
    fixLabel.position.set(at.x, params.height + 0.16, at.z);
    bugLabel.visible = params.showLabels && params.showBug;
    fixLabel.visible = params.showLabels;

    iron.opacity = params.opacity;
    // Only pay for transparency when it is actually asked for — a fully opaque transparent material still
    // takes the back-to-front sorted path and drops out of the depth buffer.
    iron.transparent = params.opacity < 1;
    iron.depthWrite = params.opacity >= 1;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Mitered Corner");

  // Isolation is the point of the study — a joint is easiest to read when you can take one member away and
  // look at the hole it leaves.
  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showBug").name("Show the Bug").onChange(rebuild);
  inspect.add(params, "showLabels").name("Labels").onChange(rebuild);
  inspect.add(params, "showRails").name("Rails").onChange(rebuild);
  inspect.add(params, "showPost").name("Post").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  const cage = gui.addFolder("Cage");
  cage.add(params, "halfWidth", 0.06, 0.3, 0.005).name("Half Width").onChange(rebuild);
  // Straight sides at 1 — the post's end cut is square to the rail and the seat cut has nothing to fix.
  // Rake it and the perpendicular frame breaks down while the seat cut holds.
  cage.add(params, "taper", 0.35, 1, 0.01).name("Taper").onChange(rebuild);
  cage.add(params, "height", 0.15, 0.7, 0.01).name("Height").onChange(rebuild);
  // Fatter bars magnify both defects: the wedge and the punch-through both scale with bar width.
  cage.add(params, "barWidth", 0.005, 0.045, 0.001).name("Bar Width").onChange(rebuild);
  // At 1.00 the rail's outer face and the post's outer corner graze — a hairline sliver. Clearly under or
  // clearly over both read as deliberate.
  cage.add(params, "railStock", 0.5, 1.4, 0.01).name("Rail Stock").onChange(rebuild);
  cage.open();

  const frame = gui.addFolder("Post Reference");
  // OFF uses the corner's radial direction and turns the post 45°, pointing an edge outward rather than a
  // face. The reference vector is not cosmetic — it decides how a square bar presents.
  frame.add(params, "squareToCage").name("Square to Cage").onChange(rebuild);

  const view = gui.addFolder("View");
  view.add(params, "separation", 0.25, 1, 0.01).name("Separation").onChange(rebuild);

  return () => {
    gui.destroy();
    clear(left);
    clear(right);
    for (const label of [bugLabel, fixLabel]) {
      label.material.map?.dispose();
      label.material.dispose();
    }
    iron.dispose();
    wire.dispose();
    dispose();
  };
}

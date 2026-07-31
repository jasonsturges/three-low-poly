import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WireframeGeometry,
} from "three";
import { MoldingGeometry, type MoldingFacing, type MoldingStyle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Inside And Outside Corners",
  description:
    "STUDY — the same miter, on opposite sides of the path. LEFT is an INSIDE corner: two walls, molding " +
    "in the room, the cornice everyone pictures. RIGHT is an OUTSIDE corner: a square pier with a cap and " +
    "a plinth, molding wrapping the outside. Watch the readout while you drag Corner Angle — the turn, the " +
    "cut, and the widening are IDENTICAL on both. Nothing about the miter changes: the bisector is the " +
    "same plane whichever side the section sits on, and `1/cos φ` depends only on the angle. The whole " +
    "difference is `facing`, and Flip Facing proves it by putting each one on the wrong side — the cornice " +
    "buries itself in the wall and the pier's cap turns inside out. The pier is also the safer of the two: " +
    "an outward run can have any projection, while an inward one is bounded by the room, and opposite " +
    "walls' molding will eventually meet in the middle.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CAPITAL    the crowning member of a column. On a square pier or pilaster, usually just the CAP.
//  ABACUS     the flat slab at the very top of a capital, which the load sits on.
//  NECKING    the small band where the shaft meets the capital. An ASTRAGAL if it is a bead.
//  PLINTH     the block at the foot of a column or pier.
//  BREAK      what a cornice does when it wraps around a projection — it BREAKS AROUND the pier.
//  RETURN     where a run wraps back to the wall so no end grain shows.
//  INSIDE /   which side of the corner the material is on. A room's corners are inside corners; a pier's
//  OUTSIDE    are outside corners. The MITER does not care — only the molding's facing does.

const SECTION = {
  drop: 0.14,
  projection: 0.1,
};

/** A wall or pier stub, laid along `direction` from `at`, standing on `y = 0`. */
function slab(
  at: Vector3,
  direction: Vector3,
  length: number,
  height: number,
  thickness: number,
  offset: number,
): BufferGeometry {
  // Perpendicular in the horizontal plane, so the slab can be pushed to one side of the run.
  const side = new Vector3(direction.z, 0, -direction.x).multiplyScalar(offset * thickness * 0.5);
  const mid = at.clone().addScaledVector(direction, length / 2).add(side);
  const geometry = new BoxGeometry(length, height, thickness);
  // BoxGeometry's local +X is its length, and rotateY(φ) carries +X to (cos φ, 0, −sin φ) — so the angle
  // wanted is the NEGATIVE of the direction's own bearing.
  geometry.rotateY(-Math.atan2(direction.z, direction.x));
  geometry.translate(mid.x, height / 2, mid.z);
  return geometry;
}

/** A flat text label, so which side is which does not depend on remembering. */
function createLabel(text: string, tint: string): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.font = "bold 60px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = tint;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map, transparent: true }));
  sprite.scale.set(1.1, 0.28, 1);
  return sprite;
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [3.4, 3.0, 5.4],
  });

  // A long lens: judging whether a mitered corner is shut is exactly what perspective foreshortening
  // ruins, and this study puts one corner on each side of the frame where the distortion differs.
  camera.fov = 22;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  controls.target.set(0, 1.1, 0);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.25);
  key.position.set(0.9, 1.3, 1.5);
  const bounce = new DirectionalLight(0x9fb4d0, 0.45);
  bounce.position.set(-0.9, -0.5, 0.6);
  scene.add(key, bounce);

  const params = {
    cornerAngle: 90,
    sides: 4,
    style: "ogee" as MoldingStyle,
    drop: SECTION.drop,
    projection: SECTION.projection,
    segments: 6,
    height: 2.2,
    armLength: 1.1,
    pierWidth: 0.55,
    thickness: 0.14,
    separation: 2.6,
    flipFacing: false,
    showBase: true,
    showAbacus: true,
    wireframe: false,
    opacity: 1,
    turn: "",
    cut: "",
    widening: "",
  };

  const plaster = new MeshStandardMaterial({
    color: 0xd8d2c6,
    roughness: 0.9,
    flatShading: true,
    side: DoubleSide,
    // Push the solid back a hair so the wireframe overlay wins the depth test instead of fighting it.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const stone = new MeshStandardMaterial({ color: 0x9aa1ab, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const left = new Group();
  const right = new Group();
  scene.add(left, right);

  const insideLabel = createLabel("INSIDE — a room", "#7fe3a1");
  const outsideLabel = createLabel("OUTSIDE — a pier", "#ffc46b");
  left.add(insideLabel);
  right.add(outsideLabel);

  const clear = (group: Group) => {
    for (const child of [...group.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        group.remove(child);
      }
    }
  };

  const add = (group: Group, geometry: BufferGeometry, material: MeshStandardMaterial) => {
    group.add(new Mesh(geometry, material));
    // Overlaid rather than replacing the surface — a bare wireframe of a joint is unreadable, because
    // you cannot tell which lines are in front.
    if (params.wireframe) group.add(new LineSegments(new WireframeGeometry(geometry), wire));
  };

  const molding = (points: Vector3[], closed: boolean, facing: MoldingFacing, run: "crown" | "base") =>
    new MoldingGeometry({
      points,
      closed,
      facing: params.flipFacing ? (facing === "inward" ? "outward" : "inward") : facing,
      run,
      style: params.style,
      drop: params.drop,
      projection: params.projection,
      segments: params.segments,
    });

  /**
   * THE INSIDE CORNER — two walls, molding in the room.
   *
   * The arms are symmetric about `+X`, so the corner's own bisector stays put on screen while the angle
   * swings through it. The run is OPEN: three points, one corner, and a square cut at each end where a
   * length would die into a doorway.
   */
  const buildInside = () => {
    const half = MathUtils.degToRad(params.cornerAngle) / 2;
    const d0 = new Vector3(Math.cos(half), 0, Math.sin(half));
    const d1 = new Vector3(Math.cos(half), 0, -Math.sin(half));
    const at = new Vector3();

    // The walls sit BEHIND the run, on the far side from the room.
    add(left, slab(at, d0, params.armLength, params.height, params.thickness, -1), stone);
    add(left, slab(at, d1, params.armLength, params.height, params.thickness, 1), stone);

    const line = (y: number) => [
      at.clone().addScaledVector(d0, params.armLength).setY(y),
      at.clone().setY(y),
      at.clone().addScaledVector(d1, params.armLength).setY(y),
    ];

    add(left, molding(line(params.height), false, "inward", "crown"), plaster);
    if (params.showBase) add(left, molding(line(0), false, "inward", "base"), plaster);
  };

  /**
   * THE OUTSIDE CORNER — a pier with a cap and a plinth, molding wrapping the outside.
   *
   * CLOSED, so there are no ends and no caps anywhere — the same construction as a picture frame, laid
   * flat. The run's points are the pier's own CORNERS, which puts each segment's back plane exactly on
   * the face between them.
   */
  const buildOutside = () => {
    const sides = Math.max(3, Math.round(params.sides));
    // `CylinderGeometry` puts its vertices at (r·sinθ, ·, r·cosθ) starting at θ = 0, so a run through
    // the same angles lands on the prism's own corners rather than near them.
    const radius = (params.pierWidth / 2) * Math.SQRT2;
    const corners = (y: number) =>
      Array.from({ length: sides }, (_, i) => {
        const angle = (i / sides) * Math.PI * 2;
        return new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      });

    const shaft = new CylinderGeometry(radius, radius, params.height, sides).translate(
      0,
      params.height / 2,
      0,
    );
    add(right, shaft, stone);

    // The cap sits a little BELOW the top, because a capital is ornamental and often meets no ceiling
    // at all — which is exactly the case that made this study worth isolating.
    const capY = params.height - params.drop * 1.4;
    add(right, molding(corners(capY), true, "outward", "crown"), plaster);
    if (params.showBase) add(right, molding(corners(0), true, "outward", "base"), plaster);

    if (params.showAbacus) {
      // The flat slab crowning a capital. A plain prism, oversailing by the molding's own projection.
      const abacus = params.projection * 1.15;
      add(
        right,
        new CylinderGeometry(radius + abacus, radius + abacus, params.drop * 0.35, sides).translate(
          0,
          params.height - params.drop * 0.175,
          0,
        ),
        stone,
      );
    }
  };

  const rebuild = () => {
    clear(left);
    clear(right);
    buildInside();
    buildOutside();

    left.position.set(-params.separation / 2, 0, 0);
    right.position.set(params.separation / 2, 0, 0);
    insideLabel.position.set(0, params.height + 0.45, 0);
    outsideLabel.position.set(0, params.height + 0.45, 0);

    plaster.opacity = params.opacity;
    stone.opacity = params.opacity;
    for (const material of [plaster, stone]) {
      // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
      // the sorted back-to-front path and drops out of the depth buffer.
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    // The pier's corners turn by the polygon's exterior angle; the room's by 180° − its included angle.
    // Set the pier to 4 sides and the room to 90° and the two lines below read identically, which is the
    // entire point of the study.
    const roomTurn = 180 - params.cornerAngle;
    const pierTurn = 360 / Math.max(3, Math.round(params.sides));
    const describe = (turn: number) => `${turn.toFixed(1)}°`;
    params.turn = `room ${describe(roomTurn)} · pier ${describe(pierTurn)}`;
    params.cut = `room ${describe(roomTurn / 2)} · pier ${describe(pierTurn / 2)}`;
    const widen = (turn: number) => (1 / Math.cos(MathUtils.degToRad(turn / 2))).toFixed(3);
    params.widening = `room ×${widen(roomTurn)} · pier ×${widen(pierTurn)}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Inside And Outside Corners");

  const corner = gui.addFolder("Corner");
  // 90 against 4 sides is the matched pair — the same turn on both sides of the study.
  corner.add(params, "cornerAngle", 30, 170, 1).name("Room Angle").onChange(rebuild);
  corner.add(params, "sides", 3, 16, 1).name("Pier Sides").onChange(rebuild);
  // The proof: put each run on the wrong side and watch the cornice bury itself in the wall.
  corner.add(params, "flipFacing").name("Flip Facing (bug)").onChange(rebuild);
  corner.open();

  const section = gui.addFolder("Section");
  section
    .add(params, "style", {
      "Cove (cavetto)": "cove",
      Ovolo: "ovolo",
      Chamfer: "chamfer",
      "Ogee (cyma recta)": "ogee",
      "Cyma (reversa)": "cyma",
      Scotia: "scotia",
      "Fillet (plain band)": "fillet",
      "Step (corbel)": "step",
    })
    .name("Profile")
    .onChange(rebuild);
  section.add(params, "drop", 0.04, 0.4, 0.005).name("Drop").onChange(rebuild);
  // An OUTWARD run can take any projection at all. An inward one is bounded by the room it is in.
  section.add(params, "projection", 0.02, 0.35, 0.005).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.open();

  const build = gui.addFolder("Build");
  build.add(params, "height", 1.4, 3, 0.05).name("Height").onChange(rebuild);
  build.add(params, "armLength", 0.5, 2, 0.05).name("Wall Length").onChange(rebuild);
  build.add(params, "pierWidth", 0.25, 1.2, 0.01).name("Pier Width").onChange(rebuild);
  build.add(params, "thickness", 0.06, 0.3, 0.01).name("Wall Thickness").onChange(rebuild);
  build.add(params, "showBase").name("Base / Plinth").onChange(rebuild);
  build.add(params, "showAbacus").name("Abacus").onChange(rebuild);
  build.add(params, "separation", 1.6, 5, 0.05).name("Separation").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.open();

  // Read-only: consequences of the angle, not knobs. These are the three numbers the study exists to
  // put side by side.
  const readout = gui.addFolder("Readout");
  readout.add(params, "turn").name("Turn").listen().disable();
  readout.add(params, "cut").name("Cut Angle φ").listen().disable();
  readout.add(params, "widening").name("Widening").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear(left);
    clear(right);
    for (const label of [insideLabel, outsideLabel]) {
      label.material.map?.dispose();
      label.material.dispose();
    }
    plaster.dispose();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}

import {
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeGeometry,
} from "three";
import GUI from "lil-gui";
import {
  ArchedDiamondLatticeWindow,
  archedOpeningMetrics,
  GroundGrid,
  LightningEffect,
  traceArchedOpeningOutline,
  type ArchedOpeningMetrics,
} from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Lightning",
  description:
    "Thunderstorm flashes via decaying light spikes — no timers. " +
    "A hallway wall with arched diamond-lattice windows; fog and sky panes brighten on each strike.",
};

const SKY_COLOR = new Color(0x050508);
const FLASH_COLOR = new Color(0x9ab0d8);

const WALL_WIDTH = 18;
const WALL_HEIGHT = 8;
const WALL_THICKNESS = 0.5;
/** Room-facing (camera-side, +Z) face of the wall. */
const WALL_FACE_Z = -6.9;

// Shared arched opening — the wall hole, the window prefab, and the sky pane all
// derive their silhouette from these three numbers so nothing drifts out of line.
const OPENING = { width: 2.4, rectHeight: 3.4, archHeight: 1.2 };
const SILL_Y = 1.4;
const OPENING_CENTER_Y = SILL_Y + (OPENING.rectHeight + OPENING.archHeight) / 2;
const WINDOW_X = [-5.5, 0, 5.5];

const LEAD_THICKNESS = 0.05;
const LEAD_DEPTH = 0.11;

/**
 * Trace the arched opening outline into a hole `Path`, offset to `cx` along the
 * wall. `traceArchedOpeningOutline` centers x on 0, so a thin adapter shifts each
 * emitted coordinate — the arc center included — to place the opening.
 */
function archHolePath(cx: number, metrics: ArchedOpeningMetrics): Path {
  const path = new Path();
  traceArchedOpeningOutline(
    {
      moveTo: (x, y) => path.moveTo(x + cx, y),
      lineTo: (x, y) => path.lineTo(x + cx, y),
      absarc: (x, y, r, a0, a1, cw) => path.absarc(x + cx, y, r, a0, a1, cw),
      closePath: () => path.closePath(),
    },
    metrics,
    { hole: true },
  );
  return path;
}

/** One solid slab, extruded +Z, with an arched opening punched per window. */
function buildWall() {
  const wallMaterial = new MeshStandardMaterial({
    color: 0x2a3038,
    roughness: 0.92,
    metalness: 0.04,
  });

  const halfW = WALL_WIDTH / 2;
  const shape = new Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW, WALL_HEIGHT);
  shape.lineTo(-halfW, WALL_HEIGHT);
  shape.closePath();

  // Punch the hole on the true opening outline — same silhouette as the window's
  // frame ring, so the aperture lines up with the frame's outer edge and the whole
  // ring stays visible, with the slab thickness reading as a reveal behind it.
  const metrics = archedOpeningMetrics({ ...OPENING, centerY: OPENING_CENTER_Y });
  for (const x of WINDOW_X) shape.holes.push(archHolePath(x, metrics));

  const geo = new ExtrudeGeometry(shape, { depth: WALL_THICKNESS, bevelEnabled: false });
  const wall = new Mesh(geo, wallMaterial);
  // Extrusion runs local z 0 → thickness; land the thickness face on the room side.
  wall.position.z = WALL_FACE_Z - WALL_THICKNESS;
  wall.castShadow = true;
  wall.receiveShadow = true;

  return { wall, wallMaterial, metrics };
}

function disposeWindow(window: ArchedDiamondLatticeWindow): void {
  window.lattice.geometry.dispose();
  window.lattice.material.dispose();
  window.frame.geometry.dispose();
  (window.frame.material as MeshStandardMaterial).dispose();
}

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: SKY_COLOR.clone(),
    cameraPosition: [0, 3.5, 10],
  });

  const fog = new Fog(SKY_COLOR.clone(), 6, 32);
  scene.fog = fog;

  controls.target.set(0, 3.2, -6);
  controls.update();

  const floor = new GroundGrid({ size: 24 });
  scene.add(floor);

  // Cheap emissive glass: a flat arched pane behind each opening, backlighting the
  // lattice. No transmission / physical material, so it costs nothing on the GPU
  // while still pumping brightness on every strike.
  const skyMaterial = new MeshStandardMaterial({
    color: 0x0b101a,
    emissive: 0x1a2848,
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0,
    side: DoubleSide,
  });

  const architecture = new Group();
  const { wall, wallMaterial, metrics } = buildWall();
  architecture.add(wall);

  // One arched pane geometry (centered x, opening height baked in via centerY),
  // reused across every opening by positioning each mesh at its own x.
  const paneShape = new Shape();
  traceArchedOpeningOutline(paneShape, metrics);
  const paneGeo = new ShapeGeometry(paneShape, 48);
  const exteriorZ = WALL_FACE_Z - WALL_THICKNESS;
  const windowZ = WALL_FACE_Z - WALL_THICKNESS / 2;

  const windows: ArchedDiamondLatticeWindow[] = [];
  for (const x of WINDOW_X) {
    const pane = new Mesh(paneGeo, skyMaterial);
    pane.position.set(x, 0, exteriorZ + 0.01);
    architecture.add(pane);

    const window = new ArchedDiamondLatticeWindow({
      ...OPENING,
      cellsX: 6,
      cellsY: 10,
      leadThickness: LEAD_THICKNESS,
      leadDepth: LEAD_DEPTH,
      glass: false,
    });
    window.position.set(x, OPENING_CENTER_Y, windowZ);
    architecture.add(window);
    windows.push(window);
  }

  scene.add(architecture);

  const configureBoltShadow = (bolt: DirectionalLight) => {
    bolt.castShadow = true;
    bolt.shadow.mapSize.set(2048, 2048);
    bolt.shadow.bias = -0.0003;
    bolt.shadow.normalBias = 0.02;
    const cam = bolt.shadow.camera;
    cam.left = -22;
    cam.right = 22;
    cam.top = 15;
    cam.bottom = -7;
    cam.near = 0.5;
    cam.far = 55;
    cam.updateProjectionMatrix();
  };

  const createBolt = (x: number, z: number) => {
    const bolt = new DirectionalLight(0xcdd8ff, 0);
    bolt.position.set(x, 12, z);
    bolt.target.position.set(0, 3, -4);
    configureBoltShadow(bolt);
    scene.add(bolt, bolt.target);
    return bolt;
  };

  const params = {
    enabled: true,
    peak1: 14,
    peak2: 8,
    minGap: 1,
    maxGap: 5,
    fogFlash: 0.6,
    windowFlash: 1.4,
    showReference: true,
  };

  const bolt1 = createBolt(8, -14);
  const bolt2 = createBolt(-6, -12);

  let storm1 = new LightningEffect({ light: bolt1, peak: params.peak1, minGap: params.minGap, maxGap: params.maxGap });
  let storm2 = new LightningEffect({ light: bolt2, peak: params.peak2, minGap: params.minGap * 0.85, maxGap: params.maxGap * 0.85 });

  const rebuild = () => {
    storm1 = new LightningEffect({ light: bolt1, peak: params.peak1, minGap: params.minGap, maxGap: params.maxGap });
    storm2 = new LightningEffect({
      light: bolt2,
      peak: params.peak2,
      minGap: params.minGap * 0.85,
      maxGap: params.maxGap * 0.85,
    });
  };

  onFrame((delta) => {
    let flash = 0;
    if (params.enabled) {
      storm1.update(delta);
      storm2.update(delta);
      flash = Math.max(storm1.level, storm2.level);
    } else {
      storm1.quiet();
      storm2.quiet();
    }

    const t = Math.min(1, flash * params.fogFlash);
    (scene.background as Color).copy(SKY_COLOR).lerp(FLASH_COLOR, t * 0.85);
    fog.color.copy(SKY_COLOR).lerp(FLASH_COLOR, t);
    skyMaterial.emissiveIntensity = 0.15 + flash * params.windowFlash;
  });

  const gui = new GUI();
  gui.title("Lightning Effect");
  gui.add(params, "enabled").name("Enabled");
  gui.add(params, "peak1", 1, 30, 0.5).name("Peak A").onChange(rebuild);
  gui.add(params, "peak2", 1, 30, 0.5).name("Peak B").onChange(rebuild);
  gui.add(params, "minGap", 0.5, 12, 0.1).name("Min Gap (s)").onChange(rebuild);
  gui.add(params, "maxGap", 1, 20, 0.1).name("Max Gap (s)").onChange(rebuild);
  gui.add(params, "fogFlash", 0, 1.5, 0.01).name("Fog Flash");
  gui.add(params, "windowFlash", 0, 3, 0.05).name("Window Flash");
  gui
    .add(params, "showReference")
    .name("Ground / Wall")
    .onChange((visible: boolean) => {
      floor.visible = visible;
      architecture.visible = visible;
    });

  return () => {
    gui.destroy();
    floor.dispose();
    for (const window of windows) disposeWindow(window);
    wall.geometry.dispose();
    wallMaterial.dispose();
    paneGeo.dispose();
    skyMaterial.dispose();
    dispose();
  };
}

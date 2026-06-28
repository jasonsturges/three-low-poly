import {
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import GUI from "lil-gui";
import { LightningEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Lightning",
  description:
    "Thunderstorm flashes via decaying light spikes — no timers. " +
    "A hallway wall with windows; fog and sky panes brighten on each strike.",
};

const SKY_COLOR = new Color(0x050508);
const FLASH_COLOR = new Color(0x9ab0d8);

interface WindowOpening {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Thick back wall with cutouts and emissive sky panes behind each opening. */
function createHallwayWall({
  width,
  height,
  thickness,
  z,
  windows,
  skyMaterial,
}: {
  width: number;
  height: number;
  thickness: number;
  z: number;
  windows: WindowOpening[];
  skyMaterial: MeshStandardMaterial;
}) {
  const wall = new Group();
  const wallMaterial = new MeshStandardMaterial({
    color: 0x2a3038,
    roughness: 0.92,
    metalness: 0.04,
  });
  const frameMaterial = new MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.75,
    metalness: 0.2,
  });

  const sorted = [...windows].sort((a, b) => a.x - b.x);
  const halfW = width / 2;

  const addPanel = (panelW: number, panelH: number, x: number, y: number) => {
    if (panelW <= 0.01 || panelH <= 0.01) return;
    const panel = new Mesh(new BoxGeometry(panelW, panelH, thickness), wallMaterial);
    panel.position.set(x, y + panelH / 2, z);
    panel.castShadow = true;
    panel.receiveShadow = true;
    wall.add(panel);
  };

  const lowestBottom = Math.min(...sorted.map((win) => win.y - win.h / 2));
  const highestTop = Math.max(...sorted.map((win) => win.y + win.h / 2));

  addPanel(width, height - highestTop, 0, highestTop);
  addPanel(width, lowestBottom, 0, 0);

  let cursor = -halfW;
  for (const win of sorted) {
    const left = win.x - win.w / 2;
    addPanel(left - cursor, win.h, (cursor + left) / 2, win.y - win.h / 2);
    cursor = win.x + win.w / 2;
  }
  addPanel(halfW - cursor, sorted[sorted.length - 1].h, (cursor + halfW) / 2, sorted[sorted.length - 1].y - sorted[sorted.length - 1].h / 2);

  // Sky pane closes the back of each opening (just inside the exterior face)
  // so the wall cavity does not read as a floating gap when orbiting.
  const exteriorZ = z - thickness / 2;
  const frameDepth = thickness * 0.35;

  for (const win of windows) {
    const sky = new Mesh(new PlaneGeometry(win.w, win.h), skyMaterial);
    sky.position.set(win.x, win.y, exteriorZ + 0.002);
    wall.add(sky);

    const sill = new Mesh(new BoxGeometry(win.w + 0.18, 0.08, frameDepth), frameMaterial);
    sill.position.set(win.x, win.y - win.h / 2 - 0.04, z + thickness / 2 - frameDepth / 2);
    sill.castShadow = true;
    wall.add(sill);

    const lintel = new Mesh(new BoxGeometry(win.w + 0.18, 0.08, frameDepth), frameMaterial);
    lintel.position.set(win.x, win.y + win.h / 2 + 0.04, z + thickness / 2 - frameDepth / 2);
    lintel.castShadow = true;
    wall.add(lintel);
  }

  return { wall, wallMaterial, frameMaterial };
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

  const groundSize = 24;

  const ground = new Mesh(
    new PlaneGeometry(groundSize, groundSize),
    new MeshStandardMaterial({ color: 0x1a2430, roughness: 1, metalness: 0, side: DoubleSide }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(groundSize, groundSize, 0x334455, 0x223344);
  scene.add(grid);

  const skyMaterial = new MeshStandardMaterial({
    color: 0x0b101a,
    emissive: 0x1a2848,
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0,
    side: DoubleSide,
  });

  const hallwayWindows: WindowOpening[] = [
    { x: -5.5, y: 3.8, w: 1.65, h: 4.2 },
    { x: 0, y: 3.8, w: 1.65, h: 4.2 },
    { x: 5.5, y: 3.8, w: 1.65, h: 4.2 },
  ];

  const wallZ = -7;
  const wallThickness = 0.4;

  const { wall, wallMaterial, frameMaterial } = createHallwayWall({
    width: 18,
    height: 8,
    thickness: wallThickness,
    z: wallZ,
    windows: hallwayWindows,
    skyMaterial,
  });
  scene.add(wall);

  const hallwayFloorMaterial = new MeshStandardMaterial({
    color: 0x1e2832,
    roughness: 0.95,
    metalness: 0,
  });
  const hallwayDepth = 16;
  const hallwayFloor = new Mesh(new BoxGeometry(18, 0.06, hallwayDepth), hallwayFloorMaterial);
  hallwayFloor.position.set(0, -0.03, wallZ + hallwayDepth / 2);
  hallwayFloor.receiveShadow = true;
  scene.add(hallwayFloor);

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
    minGap: 3,
    maxGap: 9,
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
      ground.visible = visible;
      grid.visible = visible;
      hallwayFloor.visible = visible;
      wall.visible = visible;
    });

  return () => {
    gui.destroy();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    hallwayFloor.geometry.dispose();
    hallwayFloorMaterial.dispose();
    wall.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
      }
    });
    wallMaterial.dispose();
    frameMaterial.dispose();
    skyMaterial.dispose();
    dispose();
  };
}
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  GridHelper,
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
    "Fog and sky brighten in sync with each strike.",
};

const SKY_COLOR = new Color(0x050508);
const FLASH_COLOR = new Color(0x9ab0d8);

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: SKY_COLOR.clone(),
    cameraPosition: [0, 5, 14],
  });

  const fog = new Fog(SKY_COLOR.clone(), 4, 28);
  scene.fog = fog;

  controls.target.set(0, 1.5, 0);
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

  const monolith = new Mesh(
    new BoxGeometry(2, 5, 1.2),
    new MeshStandardMaterial({ color: 0x2a3340, roughness: 0.9, metalness: 0 }),
  );
  monolith.position.set(0, 2.5, -2);
  monolith.castShadow = true;
  monolith.receiveShadow = true;
  scene.add(monolith);

  const windowMaterial = new MeshStandardMaterial({
    color: 0x0a1020,
    emissive: 0x1a2848,
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0,
    side: DoubleSide,
  });
  const windowPane = new Mesh(new PlaneGeometry(3.5, 2.2), windowMaterial);
  windowPane.position.set(0, 3.2, -6.5);
  scene.add(windowPane);

  const createBolt = (x: number, z: number) => {
    const bolt = new DirectionalLight(0xcdd8ff, 0);
    bolt.position.set(x, 12, z);
    bolt.target.position.set(0, 2, 0);
    bolt.castShadow = true;
    bolt.shadow.mapSize.set(2048, 2048);
    const cam = bolt.shadow.camera;
    cam.left = -12;
    cam.right = 12;
    cam.top = 12;
    cam.bottom = -12;
    cam.near = 0.5;
    cam.far = 40;
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

  const bolt1 = createBolt(6, -10);
  const bolt2 = createBolt(-5, -8);

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
    windowMaterial.emissiveIntensity = 0.15 + flash * params.windowFlash;
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
    .name("Ground / Props")
    .onChange((visible: boolean) => {
      ground.visible = visible;
      grid.visible = visible;
      monolith.visible = visible;
      windowPane.visible = visible;
    });

  return () => {
    gui.destroy();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    monolith.geometry.dispose();
    (monolith.material as MeshStandardMaterial).dispose();
    windowPane.geometry.dispose();
    windowMaterial.dispose();
    dispose();
  };
}
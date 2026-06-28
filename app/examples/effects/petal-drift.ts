import { DoubleSide, Fog, GridHelper, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { PetalDriftEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Petal Drift",
  description:
    "Soft petals drifting downward with gentle flutter — cherry-blossom float, not stiff tumble.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: 0x1a1420,
    cameraPosition: [0, 4, 14],
  });

  scene.fog = new Fog(0x1a1420, 8, 28);

  controls.target.set(0, 2, 0);
  controls.update();

  const groundSize = 24;
  const ground = new Mesh(
    new PlaneGeometry(groundSize, groundSize),
    new MeshStandardMaterial({ color: 0x2a3038, roughness: 1, metalness: 0, side: DoubleSide }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(groundSize, groundSize, 0x443344, 0x332233);
  scene.add(grid);

  const params = {
    count: 100,
    width: 14,
    height: 8,
    depth: 14,
    fallSpeedMin: 0.12,
    fallSpeedMax: 0.28,
    driftMin: 0.04,
    driftMax: 0.14,
    flutter: 0.35,
    showReference: true,
  };

  const createPetals = () =>
    new PetalDriftEffect({
      count: params.count,
      width: params.width,
      height: params.height,
      depth: params.depth,
      fallSpeedMin: params.fallSpeedMin,
      fallSpeedMax: params.fallSpeedMax,
      driftMin: params.driftMin,
      driftMax: params.driftMax,
      flutter: params.flutter,
      color: [0xffd6f0, 0xfff5fa, 0xf0b8d0, 0xf8dce8],
    });

  let petals = createPetals();
  scene.add(petals);

  const rebuild = () => {
    scene.remove(petals);
    petals.dispose();
    petals = createPetals();
    scene.add(petals);
  };

  onFrame((dt) => petals.update(dt));

  const gui = new GUI();
  gui.title("Petal Drift");
  gui.add(params, "count", 10, 400, 1).name("Count").onChange(rebuild);
  gui.add(params, "width", 4, 24, 0.5).name("Width").onChange(rebuild);
  gui.add(params, "height", 2, 16, 0.5).name("Height").onChange(rebuild);
  gui.add(params, "depth", 4, 24, 0.5).name("Depth").onChange(rebuild);
  gui.add(params, "fallSpeedMin", 0.02, 0.8, 0.01).name("Fall Min").onChange(rebuild);
  gui.add(params, "fallSpeedMax", 0.02, 1.2, 0.01).name("Fall Max").onChange(rebuild);
  gui.add(params, "driftMin", 0, 0.4, 0.01).name("Drift Min").onChange(rebuild);
  gui.add(params, "driftMax", 0, 0.5, 0.01).name("Drift Max").onChange(rebuild);
  gui.add(params, "flutter", 0, 1, 0.01).name("Flutter").onChange(rebuild);
  gui
    .add(params, "showReference")
    .name("Ground / Grid")
    .onChange((visible: boolean) => {
      ground.visible = visible;
      grid.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(petals);
    petals.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    dispose();
  };
}
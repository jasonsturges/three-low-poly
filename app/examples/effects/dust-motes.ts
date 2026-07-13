import { MeshBasicMaterial } from "three";
import GUI from "lil-gui";
import { DustMotesEffect, GroundGrid } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Dust Motes",
  description:
    "Fine additive dust settling and wafting through a lit volume — the specks that sell " +
    "a light shaft as volumetric. Each mote twinkles as it catches the light.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: 0x05060a,
    cameraPosition: [0, 4, 12],
  });

  controls.target.set(0, 4, 0);
  controls.update();

  const floor = new GroundGrid({ size: 24 });
  scene.add(floor);

  const params = {
    count: 150,
    width: 8,
    height: 9,
    depth: 8,
    color: "#aebfe6",
    radius: 0.02,
    opacity: 0.9,
    settleMin: 0.1,
    settleMax: 0.35,
    waft: 0.08,
    scaleMin: 0.6,
    scaleMax: 1.2,
    showReference: true,
  };

  const createDust = () =>
    new DustMotesEffect({
      count: params.count,
      width: params.width,
      height: params.height,
      depth: params.depth,
      color: params.color,
      radius: params.radius,
      opacity: params.opacity,
      settleMin: params.settleMin,
      settleMax: params.settleMax,
      waft: params.waft,
      scaleMin: params.scaleMin,
      scaleMax: params.scaleMax,
    });

  let dust = createDust();
  scene.add(dust);

  const rebuild = () => {
    scene.remove(dust);
    dust.dispose();
    dust = createDust();
    scene.add(dust);
  };

  onFrame((delta) => dust.update(delta));

  const gui = new GUI();
  gui.title("Dust Motes Effect");
  gui.add(params, "count", 20, 600, 10).name("Count").onChange(rebuild);

  const volumeFolder = gui.addFolder("Volume");
  volumeFolder.add(params, "width", 2, 20, 0.5).name("Width").onChange(rebuild);
  volumeFolder.add(params, "height", 2, 20, 0.5).name("Height").onChange(rebuild);
  volumeFolder.add(params, "depth", 2, 20, 0.5).name("Depth").onChange(rebuild);

  const specFolder = gui.addFolder("Speck");
  specFolder
    .addColor(params, "color")
    .name("Color")
    .onChange((value: string) => {
      const mat = dust.material;
      if (!Array.isArray(mat)) (mat as MeshBasicMaterial).color.set(value);
    });
  specFolder.add(params, "radius", 0.005, 0.06, 0.001).name("Radius").onChange(rebuild);
  specFolder.add(params, "opacity", 0.1, 1, 0.01).name("Opacity").onChange(rebuild);
  specFolder.add(params, "scaleMin", 0.1, 1.5, 0.05).name("Twinkle Min").onChange(rebuild);
  specFolder.add(params, "scaleMax", 0.2, 2.5, 0.05).name("Twinkle Max").onChange(rebuild);

  const motionFolder = gui.addFolder("Motion");
  motionFolder.add(params, "settleMin", 0.02, 0.6, 0.01).name("Settle Min").onChange(rebuild);
  motionFolder.add(params, "settleMax", 0.05, 0.8, 0.01).name("Settle Max").onChange(rebuild);
  motionFolder.add(params, "waft", 0, 0.4, 0.01).name("Waft").onChange(rebuild);
  motionFolder.open();

  gui
    .add(params, "showReference")
    .name("Ground / Grid")
    .onChange((visible: boolean) => {
      floor.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(dust);
    dust.dispose();
    floor.dispose();
    dispose();
  };
}

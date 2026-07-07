import { Fog } from "three";
import GUI from "lil-gui";
import { RainEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { GroundGrid } from "../../framework/GroundGrid";

export const meta = {
  title: "Rain",
  description:
    "Instanced misty rainfall — vertical gradient streaks with optional wind drift. " +
    "Intensity scales density, speed, and opacity.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: 0x050508,
    cameraPosition: [0, 5, 14],
  });

  scene.fog = new Fog(0x050508, 4, 28);

  controls.target.set(0, 1.5, 0);
  controls.update();

  const floor = new GroundGrid({ size: 24 });
  scene.add(floor);

  const params = {
    count: 1400,
    area: 12,
    height: 16,
    intensity: 0.45,
    opacity: 0.3,
    width: 0.009,
    windDirection: 0.8,
    windStrength: 0,
    showReference: true,
  };

  const createRain = () =>
    new RainEffect({
      count: params.count,
      area: params.area,
      height: params.height,
      opacity: params.opacity,
      width: params.width,
      windDirection: params.windDirection,
      windStrength: params.windStrength,
      intensity: params.intensity,
    });

  let rain = createRain();
  scene.add(rain);

  const rebuild = () => {
    scene.remove(rain);
    rain.dispose();
    rain = createRain();
    scene.add(rain);
  };

  onFrame((delta) => {
    rain.intensity = params.intensity;
    rain.update(delta);
  });

  const gui = new GUI();
  gui.title("Rain Effect");
  gui.add(params, "intensity", 0, 1, 0.01).name("Intensity");
  gui.add(params, "count", 200, 4000, 100).name("Count").onChange(rebuild);
  gui.add(params, "area", 4, 24, 0.5).name("Area").onChange(rebuild);
  gui.add(params, "height", 4, 30, 0.5).name("Height").onChange(rebuild);
  gui.add(params, "opacity", 0.02, 0.5, 0.01).name("Opacity").onChange(rebuild);
  gui.add(params, "width", 0.003, 0.03, 0.001).name("Streak Width").onChange(rebuild);
  const windFolder = gui.addFolder("Wind");
  windFolder
    .add(params, "windStrength", 0, 0.35, 0.01)
    .name("Strength")
    .onChange(rebuild);
  windFolder
    .add(params, "windDirection", 0, Math.PI * 2, 0.01)
    .name("Direction")
    .onChange(rebuild);
  windFolder.open();
  gui
    .add(params, "showReference")
    .name("Ground / Grid")
    .onChange((visible: boolean) => {
      floor.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(rain);
    rain.dispose();
    floor.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import { Burst, BurstGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Burst" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    points: 5,
    rotation: 0,
    innerRadius: 0.5,
    outerRadius: 1.0,
    depth: 0.25,
  };

  const burst = new Burst(params);
  scene.add(burst);

  const rebuild = () => {
    burst.geometry.dispose();
    burst.geometry = new BurstGeometry(params);
  };

  const gui = new GUI();
  gui.title("Burst");
  gui.add(params, "points", 2, 32, 1).name("Points").onChange(rebuild);
  gui.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    burst.geometry.dispose();
    dispose();
  };
}
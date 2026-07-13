import GUI from "lil-gui";
import { centerObject, WoodPicket, WoodPicketGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wood Picket" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6ea8d8 });

  const params = {
    width: 0.35,
    height: 1.2,
    thickness: 0.04,
    pointHeight: 0.18,
  };

  const picket = new WoodPicket(params);
  scene.add(picket);
  centerObject(picket);

  const rebuild = () => {
    picket.geometry.dispose();
    picket.geometry = new WoodPicketGeometry(params);
    centerObject(picket);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.1, 0.8, 0.01).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.3, 2.5, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "thickness", 0.01, 0.2, 0.005).name("Thickness").onChange(rebuild);
  gui.add(params, "pointHeight", 0, 0.6, 0.01).name("Point Height").onChange(rebuild);

  return () => {
    gui.destroy();
    picket.geometry.dispose();
    picket.material.dispose();
    dispose();
  };
}

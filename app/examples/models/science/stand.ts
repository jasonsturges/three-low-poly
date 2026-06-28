import GUI from "lil-gui";
import { Stand, StandGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Stand" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 0.3,
    height: 0.4,
    count: 3,
    thickness: 0.03,
    radialSegments: 16,
  };

  const stand = new Stand(params);
  scene.add(stand);
  centerObject(stand);

  const rebuild = () => {
    stand.geometry.dispose();
    stand.geometry = new StandGeometry(params);
    centerObject(stand);
  };

  const gui = new GUI();
  gui.title("Stand");
  gui.add(params, "radius", 0.1, 1).name("Radius").step(0.01).onChange(rebuild);
  gui.add(params, "height", 0.1, 1).name("Height").step(0.01).onChange(rebuild);
  gui.add(params, "count", 1, 8).name("Leg Count").step(1).onChange(rebuild);
  gui.add(params, "thickness", 0.01, 0.1).name("Thickness").step(0.005).onChange(rebuild);
  gui.add(params, "radialSegments", 3, 64).name("Radial Segments").step(1).onChange(rebuild);

  return () => {
    gui.destroy();
    stand.geometry.dispose();
    dispose();
  };
}
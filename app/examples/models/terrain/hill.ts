import GUI from "lil-gui";
import { Hill, HillGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hill" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 3,
    height: 0.6,
    widthSegments: 64,
    heightSegments: 16,
    phiStart: 0,
    phiLength: Math.PI * 2,
  };

  const hill = new Hill(params);
  scene.add(hill);

  const rebuild = () => {
    hill.geometry.dispose();
    hill.geometry = new HillGeometry(params);
  };

  const gui = new GUI();
  gui.add(params, "radius", 1, 10).name("Radius").step(0.1).onChange(rebuild);
  gui.add(params, "height", 1, 10).name("Height").step(0.1).onChange(rebuild);
  gui.add(params, "widthSegments", 8, 128, 1).name("Width Segments").step(1).onChange(rebuild);
  gui.add(params, "heightSegments", 8, 64, 1).name("Height Segments").step(1).onChange(rebuild);
  gui.add(params, "phiStart", 0, Math.PI * 2).name("Phi Start").step(0.01).onChange(rebuild);
  gui.add(params, "phiLength", 0, Math.PI * 2).name("Phi Length").step(0.01).onChange(rebuild);

  return () => {
    gui.destroy();
    hill.geometry.dispose();
    dispose();
  };
}
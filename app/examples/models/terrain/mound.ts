import GUI from "lil-gui";
import { Mound, MoundGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mound" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radius: 5,
    widthSegments: 64,
    heightSegments: 32,
    phiStart: 0,
    phiLength: Math.PI * 2,
    thetaLength: Math.PI / 10,
  };

  const mound = new Mound(params);
  scene.add(mound);

  const rebuild = () => {
    mound.geometry.dispose();
    mound.geometry = new MoundGeometry(params);
  };

  const gui = new GUI();
  gui.add(params, "radius", 1, 20).name("Radius").step(0.1).onChange(rebuild);
  gui.add(params, "widthSegments", 8, 128, 1).name("Width Segments").step(1).onChange(rebuild);
  gui.add(params, "heightSegments", 8, 64, 1).name("Height Segments").step(1).onChange(rebuild);
  gui.add(params, "phiStart", 0, Math.PI * 2).name("Phi Start").step(0.01).onChange(rebuild);
  gui.add(params, "phiLength", 0, Math.PI * 2).name("Phi Length").step(0.01).onChange(rebuild);
  gui.add(params, "thetaLength", 0.1, Math.PI / 2).name("Theta Length").step(0.01).onChange(rebuild);

  return () => {
    gui.destroy();
    mound.geometry.dispose();
    dispose();
  };
}
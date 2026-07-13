import GUI from "lil-gui";
import { centerObject, WroughtIronPicket, WroughtIronPicketGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wrought Iron Picket" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const params = {
    height: 2.0,
    radius: 0.05,
    finialHeight: 0.3,
    finialRadius: 0.075,
    finialScaleZ: 1.0,
    radialSegments: 8,
  };

  const picket = new WroughtIronPicket(params);
  scene.add(picket);
  centerObject(picket);

  const rebuild = () => {
    picket.geometry.dispose();
    picket.geometry = new WroughtIronPicketGeometry(params);
    centerObject(picket);
  };

  const gui = new GUI();
  gui.add(params, "height", 0.1, 5, 0.1).name("Height").onChange(rebuild);
  gui.add(params, "radius", 0.01, 0.3, 0.005).name("Radius").onChange(rebuild);
  gui.add(params, "finialHeight", 0.01, 0.5, 0.005).name("Finial Height").onChange(rebuild);
  gui.add(params, "finialRadius", 0.01, 0.3, 0.005).name("Finial Radius").onChange(rebuild);
  gui.add(params, "finialScaleZ", 0.1, 1, 0.01).name("Finial Scale Z").onChange(rebuild);
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    picket.geometry.dispose();
    picket.material.dispose();
    dispose();
  };
}

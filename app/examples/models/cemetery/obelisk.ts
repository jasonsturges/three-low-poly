import GUI from "lil-gui";
import { centerObject, Obelisk, ObeliskGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Obelisk" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    baseWidth: 0.5,
    topWidth: 0.34,
    shaftHeight: 2.2,
    capHeight: 0.45,
  };

  const obelisk = new Obelisk(params);
  scene.add(obelisk);

  const rebuild = () => {
    obelisk.geometry.dispose();
    obelisk.geometry = new ObeliskGeometry(params);
    centerObject(obelisk);
  };

  const gui = new GUI();
  gui.title("Obelisk");
  gui.add(params, "baseWidth", 0.1, 1.5, 0.01).name("Base Width").onChange(rebuild);
  // Take this to the base width and the taper vanishes — the shaft becomes a plain square column.
  gui.add(params, "topWidth", 0.05, 1.5, 0.01).name("Top Width").onChange(rebuild);
  gui.add(params, "shaftHeight", 0.2, 5, 0.05).name("Shaft Height").onChange(rebuild);
  gui.add(params, "capHeight", 0.05, 2, 0.05).name("Cap Height").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    obelisk.geometry.dispose();
    obelisk.material.dispose();
    dispose();
  };
}

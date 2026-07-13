import GUI from "lil-gui";
import { centerObject, Spade, SpadeGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Spade" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x35654d });

  const params = {
    size: 1,
    width: 1.9,
    height: 1,
    stemWidth: 0.6,
    stemDepth: 0.75,
    depth: 0.25,
  };

  const spade = new Spade(params);
  scene.add(spade);

  const rebuild = () => {
    spade.geometry.dispose();
    spade.geometry = new SpadeGeometry(params);
    centerObject(spade);
  };

  const gui = new GUI();
  gui.title("Spade");
  gui.add(params, "size", 1, 5, 0.1).name("Size").onChange(rebuild);
  gui.add(params, "width", 0.5, 4, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.3, 3, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "stemWidth", 0.1, 1.5, 0.05).name("Stem Width").onChange(rebuild);
  gui.add(params, "stemDepth", 0.1, 2, 0.05).name("Stem Depth").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.05).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    spade.geometry.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import { centerObject, Diamond, DiamondGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Diamond" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x35654d });

  const params = {
    size: 1,
    width: 1.6,
    height: 2.2,
    concavity: 0.15,
    depth: 0.25,
  };

  const diamond = new Diamond(params);
  scene.add(diamond);

  const rebuild = () => {
    diamond.geometry.dispose();
    diamond.geometry = new DiamondGeometry(params);
    centerObject(diamond);
  };

  const gui = new GUI();
  gui.title("Diamond");
  gui.add(params, "size", 1, 5, 0.1).name("Size").onChange(rebuild);
  gui.add(params, "width", 0.5, 4, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.5, 4, 0.05).name("Height").onChange(rebuild);
  // 0 is a plain rhombus; higher bows the sides inward, the card-diamond `)` curve.
  gui.add(params, "concavity", 0, 0.5, 0.01).name("Side Curve").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.05).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    diamond.geometry.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import { Flame, FlameGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Flame" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    height: 0.25,
    radius: 0.05,
    segmentsU: 16,
    segmentsV: 16,
  };

  const flame = new Flame(params);
  scene.add(flame);
  centerObject(flame);

  const rebuild = () => {
    flame.geometry.dispose();
    flame.geometry = new FlameGeometry(params);
    centerObject(flame);
  };

  const gui = new GUI();
  gui.title("Flame");
  gui.add(params, "height", 0.1, 5, 0.01).name("Height").onChange(rebuild);
  gui.add(params, "radius", 0.1, 2, 0.01).name("Flame Height").onChange(rebuild);
  gui.add(params, "segmentsU", 3, 32, 1).name("Segments U").onChange(rebuild);
  gui.add(params, "segmentsV", 3, 32, 1).name("Segments V").onChange(rebuild);

  return () => {
    gui.destroy();
    flame.geometry.dispose();
    dispose();
  };
}
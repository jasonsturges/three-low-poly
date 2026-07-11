import GUI from "lil-gui";
import { Polygon, PolygonGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Polygon" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    sides: 6,
    radius: 1,
    rotation: 0,
    depth: 0.01,
  };

  const polygon = new Polygon(params);
  scene.add(polygon);

  const rebuild = () => {
    polygon.geometry.dispose();
    polygon.geometry = new PolygonGeometry(params);
  };

  const gui = new GUI();
  gui.title("Polygon");
  gui.add(params, "sides", 3, 32, 1).name("Sides").onChange(rebuild);
  gui.add(params, "radius", 0.1, 2, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "depth", 0, 1, 0.01).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    polygon.geometry.dispose();
    dispose();
  };
}

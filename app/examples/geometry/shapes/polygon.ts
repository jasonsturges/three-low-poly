import GUI from "lil-gui";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { PolygonGeometry } from "three-low-poly";
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

  // The material the `Polygon` prefab used to hard-code. It lives here now, so the colour is a control
  // rather than a constant.
  const colors = { polygon: "#ffffff" };
  const material = new MeshStandardMaterial({
    color: new Color(colors.polygon),
    emissive: new Color("#ffffff"),
    emissiveIntensity: 0.1,
    metalness: 0.1,
    roughness: 0.3,
    flatShading: true,
  });

  const polygon = new Mesh(new PolygonGeometry(params), material);
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

  // No rebuild — geometry is untouched by the colour.
  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(colors, "polygon").name("Color").onChange(() => material.color.set(colors.polygon));

  return () => {
    gui.destroy();
    polygon.geometry.dispose();
    material.dispose();
    dispose();
  };
}

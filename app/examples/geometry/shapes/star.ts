import GUI from "lil-gui";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { StarGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Star" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    points: 5,
    rotation: 0,
    innerRadius: 0.5,
    outerRadius: 1.0,
    depth: 0.25,
  };

  // The material the `Star` prefab used to hard-code. It lives here now, so the colour is a control
  // rather than a constant.
  const colors = { star: "#ffff00" };
  const material = new MeshStandardMaterial({
    color: new Color(colors.star),
    emissive: new Color("#ffd700"),
    emissiveIntensity: 0.25,
    metalness: 0.1,
    roughness: 0.3,
    flatShading: true,
  });

  const star = new Mesh(new StarGeometry(params), material);
  scene.add(star);

  const rebuild = () => {
    star.geometry.dispose();
    star.geometry = new StarGeometry(params);
  };

  const gui = new GUI();
  gui.title("Star");
  gui.add(params, "points", 2, 32, 1).name("Points").onChange(rebuild);
  gui.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  // No rebuild — geometry is untouched by the colour.
  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(colors, "star").name("Color").onChange(() => material.color.set(colors.star));

  return () => {
    gui.destroy();
    star.geometry.dispose();
    material.dispose();
    dispose();
  };
}
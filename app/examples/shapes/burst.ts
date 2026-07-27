import GUI from "lil-gui";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { BurstGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Burst" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    points: 5,
    rotation: 0,
    innerRadius: 0.5,
    outerRadius: 1.0,
    depth: 0.25,
  };

  // The material the `Burst` prefab used to hard-code. It lives here now, so the colour is a control
  // rather than a constant.
  const colors = { burst: "#ffff00" };
  const material = new MeshStandardMaterial({
    color: new Color(colors.burst),
    emissive: new Color("#ffd700"),
    emissiveIntensity: 0.25,
    metalness: 0.1,
    roughness: 0.3,
    flatShading: true,
  });

  const burst = new Mesh(new BurstGeometry(params), material);
  scene.add(burst);

  const rebuild = () => {
    burst.geometry.dispose();
    burst.geometry = new BurstGeometry(params);
  };

  const gui = new GUI();
  gui.title("Burst");
  gui.add(params, "points", 2, 32, 1).name("Points").onChange(rebuild);
  gui.add(params, "rotation", -Math.PI, Math.PI, 0.01).name("Rotation").onChange(rebuild);
  gui.add(params, "innerRadius", 0.1, 5.0, 0.1).name("Inner Radius").onChange(rebuild);
  gui.add(params, "outerRadius", 0.1, 5.0, 0.1).name("Outer Radius").onChange(rebuild);
  gui.add(params, "depth", 0, 5.0, 0.1).name("Depth").onChange(rebuild);

  rebuild();

  // No rebuild — geometry is untouched by the colour.
  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(colors, "burst").name("Color").onChange(() => material.color.set(colors.burst));

  return () => {
    gui.destroy();
    burst.geometry.dispose();
    material.dispose();
    dispose();
  };
}
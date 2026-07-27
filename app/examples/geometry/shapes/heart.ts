import GUI from "lil-gui";
import { Color, DirectionalLight, Mesh, MeshStandardMaterial } from "three";
import { HeartGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Heart" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x35654d });

  // A flat card faces the camera (+Z); the default rig lights it only at a graze. A front fill lights
  // the face straight on, local to this example.
  const fill = new DirectionalLight(0xffffff, 0.9);
  fill.position.set(0, 1, 4);
  scene.add(fill);

  const params = {
    size: 1,
    width: 1.8,
    height: 1.7,
    depth: 0.25,
  };

  // The material the `Heart` prefab used to hard-code. It lives here now, so the colour is a control
  // rather than a constant.
  const colors = { heart: "#e0392b" };
  const material = new MeshStandardMaterial({
    color: new Color(colors.heart),
    metalness: 0.1,
    roughness: 0.35,
    flatShading: true,
  });

  const heart = new Mesh(new HeartGeometry(params), material);
  scene.add(heart);

  const rebuild = () => {
    heart.geometry.dispose();
    heart.geometry = new HeartGeometry(params);
    centerObject(heart);
  };

  const gui = new GUI();
  gui.title("Heart");
  gui.add(params, "size", 1, 5, 0.1).name("Size").onChange(rebuild);
  gui.add(params, "width", 0.5, 4, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.5, 4, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.05).name("Depth").onChange(rebuild);

  rebuild();

  // No rebuild — geometry is untouched by the colour.
  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(colors, "heart").name("Color").onChange(() => material.color.set(colors.heart));

  return () => {
    gui.destroy();
    heart.geometry.dispose();
    material.dispose();
    dispose();
  };
}
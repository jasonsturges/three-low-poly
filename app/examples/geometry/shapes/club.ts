import GUI from "lil-gui";
import { Color, DirectionalLight, Mesh, MeshStandardMaterial } from "three";
import { centerObject, ClubGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Club" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x35654d });

  // A flat card faces the camera (+Z); the default rig lights it only at a graze. A front fill lights
  // the face straight on, local to this example.
  const fill = new DirectionalLight(0xffffff, 0.9);
  fill.position.set(0, 1, 4);
  scene.add(fill);

  const params = {
    size: 1,
    width: 1.84,
    height: 1,
    stemWidth: 0.56,
    stemDepth: 0.85,
    stemConcavity: 0.18,
    depth: 0.25,
  };

  // The material the `Club` prefab used to hard-code. It lives here now, so the colour is a control
  // rather than a constant.
  const colors = { club: "#1c1c1c" };
  const material = new MeshStandardMaterial({
    color: new Color(colors.club),
    metalness: 0.1,
    roughness: 0.35,
    flatShading: true,
  });

  const club = new Mesh(new ClubGeometry(params), material);
  scene.add(club);

  const rebuild = () => {
    club.geometry.dispose();
    club.geometry = new ClubGeometry(params);
    centerObject(club);
  };

  const gui = new GUI();
  gui.title("Club");
  gui.add(params, "size", 1, 5, 0.1).name("Size").onChange(rebuild);
  gui.add(params, "width", 0.5, 4, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.3, 3, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "stemWidth", 0.1, 1.5, 0.05).name("Stem Width").onChange(rebuild);
  gui.add(params, "stemDepth", 0.1, 2, 0.05).name("Stem Depth").onChange(rebuild);
  gui.add(params, "stemConcavity", 0, 0.5, 0.01).name("Stem Concavity").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.05).name("Depth").onChange(rebuild);

  rebuild();

  // No rebuild — geometry is untouched by the colour.
  const materialFolder = gui.addFolder("Material");
  materialFolder.addColor(colors, "club").name("Color").onChange(() => material.color.set(colors.club));

  return () => {
    gui.destroy();
    club.geometry.dispose();
    material.dispose();
    dispose();
  };
}

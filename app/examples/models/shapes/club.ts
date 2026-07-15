import GUI from "lil-gui";
import { centerObject, Club, ClubGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Club" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x35654d });

  const params = {
    size: 1,
    width: 1.84,
    height: 1,
    stemWidth: 0.56,
    stemDepth: 0.85,
    stemConcavity: 0.18,
    depth: 0.25,
  };

  const club = new Club(params);
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
  gui.add(params, "stemConcavity", 0, 0.5, 0.01).name("Stem Curve").onChange(rebuild);
  gui.add(params, "depth", 0, 2, 0.05).name("Depth").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    club.geometry.dispose();
    dispose();
  };
}

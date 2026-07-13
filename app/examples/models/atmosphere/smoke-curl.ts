import GUI from "lil-gui";
import { centerObject, SmokeCurl, SmokeCurlGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Smoke Curl" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x1e2430 });

  const params = {
    swirl: 0.7,
    height: 3,
    turns: 1.25,
    radius: 0.22,
    taper: 0.04,
    segments: 80,
    sides: 8,
  };

  const curl = new SmokeCurl(params);
  scene.add(curl);

  const rebuild = () => {
    curl.geometry.dispose();
    curl.geometry = new SmokeCurlGeometry(params);
    centerObject(curl);
  };

  const gui = new GUI();
  gui.title("Smoke Curl");
  gui.add(params, "swirl", 0, 2, 0.05).name("Swirl").onChange(rebuild);
  gui.add(params, "height", 0.5, 6, 0.1).name("Height").onChange(rebuild);
  // Wind this up and the curl leaves its plane entirely — the case a Frenet frame corkscrews on.
  gui.add(params, "turns", 0, 4, 0.05).name("Turns").onChange(rebuild);
  gui.add(params, "segments", 8, 200, 1).name("Segments").onChange(rebuild);

  const section = gui.addFolder("Section");
  section.add(params, "radius", 0.02, 0.6, 0.01).name("Root Radius").onChange(rebuild);
  // Drive this to 0.01 and the trail dissolves to a point.
  section.add(params, "taper", 0.01, 1, 0.01).name("Taper").onChange(rebuild);
  // 4 is a hard-edged ribbon; 16 a round wisp. The low-poly knob, on the cross-section.
  section.add(params, "sides", 3, 24, 1).name("Sides").onChange(rebuild);
  section.open();

  rebuild();

  return () => {
    gui.destroy();
    curl.geometry.dispose();
    curl.material.dispose();
    dispose();
  };
}

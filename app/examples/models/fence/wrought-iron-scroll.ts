import GUI from "lil-gui";
import { centerObject, WroughtIronScroll, WroughtIronScrollGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Wrought Iron Scroll" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container, { frustumSize: 3, background: 0xdedede });

  const params = {
    startRadius: 1.4,
    turns: 1.6,
    tightness: 0.22,
    barWidth: 0.16,
    barThickness: 0.05,
    taper: 0.45,
    segments: 96,
  };

  const scroll = new WroughtIronScroll(params);
  scene.add(scroll);

  const rebuild = () => {
    scroll.geometry.dispose();
    scroll.geometry = new WroughtIronScrollGeometry(params);
    centerObject(scroll);
  };

  const gui = new GUI();
  gui.title("Wrought Iron Scroll");
  gui.add(params, "startRadius", 0.3, 3, 0.05).name("Start Radius").onChange(rebuild);
  gui.add(params, "turns", 0.25, 4, 0.05).name("Turns").onChange(rebuild);
  gui.add(params, "tightness", 0, 0.6, 0.01).name("Tightness").onChange(rebuild);
  gui.add(params, "segments", 8, 256, 1).name("Segments").onChange(rebuild);

  const bar = gui.addFolder("Bar");
  bar.add(params, "barWidth", 0.02, 0.5, 0.01).name("Width").onChange(rebuild);
  bar.add(params, "barThickness", 0.01, 0.3, 0.005).name("Thickness").onChange(rebuild);
  // Drag to 0.1 and the bar draws down to a fine point, the way a smith tapers a scroll.
  bar.add(params, "taper", 0.05, 1, 0.01).name("Taper").onChange(rebuild);
  bar.open();

  rebuild();

  return () => {
    gui.destroy();
    scroll.geometry.dispose();
    dispose();
  };
}

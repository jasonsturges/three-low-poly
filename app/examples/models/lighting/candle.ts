import GUI from "lil-gui";
import { Candle, CandleGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Candle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    radiusTop: 0.2,
    radiusBottom: 0.2,
    height: 1,
    flameHeight: 0.25,
    flameRadius: 0.05,
    segments: 16,
  };

  const candle = new Candle(params);
  scene.add(candle);
  centerObject(candle);

  const rebuild = () => {
    candle.geometry.dispose();
    candle.geometry = new CandleGeometry(params);
    centerObject(candle);
  };

  const gui = new GUI();
  gui.title("Candle");
  gui.add(params, "radiusTop", 0, 1, 0.01).name("Radius Top").onChange(rebuild);
  gui.add(params, "radiusBottom", 0, 1, 0.01).name("Radius Bottom").onChange(rebuild);
  gui.add(params, "height", 0.1, 5, 0.01).name("Height").onChange(rebuild);
  gui.add(params, "flameHeight", 0.1, 2, 0.01).name("Flame Height").onChange(rebuild);
  gui.add(params, "flameRadius", 0.01, 0.5, 0.01).name("Flame Radius").onChange(rebuild);
  gui.add(params, "segments", 3, 32, 1).name("Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    candle.geometry.dispose();
    dispose();
  };
}
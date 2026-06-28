import GUI from "lil-gui";
import { ErlenmeyerFlask, ErlenmeyerFlaskGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Erlenmeyer Flask" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    flaskRadius: 1,
    neckRadius: 0.3,
    height: 2.5,
    neckHeight: 1,
    radialSegments: 16,
  };

  const flask = new ErlenmeyerFlask(params);
  scene.add(flask);
  centerObject(flask);

  const rebuild = () => {
    flask.geometry.dispose();
    flask.geometry = new ErlenmeyerFlaskGeometry(params);
    centerObject(flask);
  };

  const gui = new GUI();
  gui.title("Erlenmeyer Flask");
  gui.add(params, "flaskRadius", 0.1, 2).name("Flask Radius").step(0.01).onChange(rebuild);
  gui.add(params, "neckRadius", 0.1, 2).name("Neck Radius").step(0.01).onChange(rebuild);
  gui.add(params, "height", 0.1, 5).name("Height").step(0.01).onChange(rebuild);
  gui.add(params, "neckHeight", 0.1, 5).name("Neck Height").step(0.01).onChange(rebuild);
  gui.add(params, "radialSegments", 3, 64).name("Radial Segments").step(1).onChange(rebuild);

  return () => {
    gui.destroy();
    flask.geometry.dispose();
    dispose();
  };
}
import GUI from "lil-gui";
import { WroughtIronBar, WroughtIronBarGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wrought Iron Bar" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const params = {
    barHeight: 2.0,
    barRadius: 0.05,
    spikeHeight: 0.3,
    spikeRadius: 0.075,
    spikeScaleZ: 1.0,
    radialSegments: 8,
  };

  const wroughtIronBar = new WroughtIronBar(params);
  scene.add(wroughtIronBar);
  centerObject(wroughtIronBar);

  const rebuild = () => {
    wroughtIronBar.geometry.dispose();
    wroughtIronBar.geometry = new WroughtIronBarGeometry(params);
    centerObject(wroughtIronBar);
  };

  const gui = new GUI();
  gui.add(params, "barHeight", 0.1, 5).name("Bar Height").step(0.1).onChange(rebuild);
  gui.add(params, "barRadius", 0.01, 0.3).name("Bar Radius").step(0.005).onChange(rebuild);
  gui.add(params, "spikeHeight", 0.01, 0.5).name("Spike Height").step(0.005).onChange(rebuild);
  gui.add(params, "spikeRadius", 0.01, 0.3).name("Spike Radius").step(0.005).onChange(rebuild);
  gui.add(params, "spikeScaleZ", 0.1, 1).name("Spike Scale Z").step(0.01).onChange(rebuild);
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").step(1).onChange(rebuild);

  return () => {
    gui.destroy();
    wroughtIronBar.geometry.dispose();
    dispose();
  };
}
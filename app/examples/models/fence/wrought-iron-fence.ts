import GUI from "lil-gui";
import { centerObject, WroughtIronFence, WroughtIronFenceGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Wrought Iron Fence" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const params = {
    count: 10,
    spacing: 0.4,
    barHeight: 2.0,
    barRadius: 0.05,
    spikeHeight: 0.3,
    spikeRadius: 0.075,
    spikeScaleZ: 1.0,
    railHeight: 0.1,
    railDepth: 0.05,
    railOffset: 0.0,
    radialSegments: 8,
  };

  const fence = new WroughtIronFence(params);
  scene.add(fence);
  centerObject(fence);

  const rebuild = () => {
    fence.geometry.dispose();
    fence.geometry = new WroughtIronFenceGeometry(params);
    centerObject(fence);
  };

  const gui = new GUI();
  gui.add(params, "count", 1, 24, 1).name("Count").onChange(rebuild);
  gui.add(params, "spacing", 0.1, 1, 0.01).name("Spacing").onChange(rebuild);
  gui.add(params, "barHeight", 0.1, 3, 0.01).name("Bar Height").onChange(rebuild);
  gui.add(params, "barRadius", 0.01, 0.3, 0.005).name("Bar Radius").onChange(rebuild);
  gui.add(params, "spikeHeight", 0.01, 0.5, 0.005).name("Spike Height").onChange(rebuild);
  gui.add(params, "spikeRadius", 0.01, 0.3, 0.005).name("Spike Radius").onChange(rebuild);
  gui.add(params, "spikeScaleZ", 0.1, 1, 0.01).name("Spike Scale Z").onChange(rebuild);
  gui.add(params, "railHeight", 0.01, 0.5, 0.01).name("Rail Height").onChange(rebuild);
  gui.add(params, "railDepth", 0.01, 0.5, 0.01).name("Rail Depth").onChange(rebuild);
  gui.add(params, "railOffset", 0.0, 0.5, 0.01).name("Rail Offset").onChange(rebuild);
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    fence.geometry.dispose();
    dispose();
  };
}

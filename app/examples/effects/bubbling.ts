import { MeshStandardMaterial, SphereGeometry } from "three";
import GUI from "lil-gui";
import { BubblingEffect, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Bubbling" };

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container);

  // Shared geometry/material — reused across rebuilds, disposed once at cleanup.
  const bubbleGeometry = new SphereGeometry(0.1, 6, 6);
  const bubbleMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    metalness: 0.3,
  });

  const params = { count: 20, height: 3, width: 1.75, depth: 1.75 };

  let effect = new BubblingEffect({ geometry: bubbleGeometry, material: bubbleMaterial, ...params });
  scene.add(effect);
  centerObject(effect);

  // Register the per-frame tick ONCE. The closure reads the current `effect`, so
  // rebuilds never re-wire it — and createScene's dispose() clears every onFrame
  // handler and stops the loop, so the animation tears down for free on navigate.
  onFrame(() => effect.update());

  const rebuild = () => {
    scene.remove(effect);
    effect.dispose();
    effect = new BubblingEffect({ geometry: bubbleGeometry, material: bubbleMaterial, ...params });
    scene.add(effect);
    centerObject(effect);
  };

  const gui = new GUI();
  gui.title("Bubbling Effect");
  gui.add(params, "count", 3, 250, 1).name("Count").onChange(rebuild);
  gui.add(params, "height", 0.5, 10, 0.001).name("Height").onChange(rebuild);
  gui.add(params, "width", 0.1, 10, 0.001).name("Width").onChange(rebuild);
  gui.add(params, "depth", 0.1, 10, 0.001).name("Depth").onChange(rebuild);

  return () => {
    gui.destroy();
    effect.dispose();
    bubbleGeometry.dispose();
    bubbleMaterial.dispose();
    dispose();
  };
}

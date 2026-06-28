import { DoubleSide, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { EllipticLeafGeometry, LeafEffect, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Leaf" };

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container);

  const params = {
    count: 200,
    width: 20,
    height: 10,
    depth: 20,
  };

  const leafGeometry = new EllipticLeafGeometry();
  const leafMaterial = new MeshStandardMaterial({
    color: 0x88aa33,
    side: DoubleSide,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
  });

  let leafEffect = new LeafEffect({
    geometry: leafGeometry,
    material: leafMaterial,
    ...params,
  });
  scene.add(leafEffect);
  centerObject(leafEffect);

  onFrame(() => leafEffect.update());

  const update = () => {
    scene.remove(leafEffect);
    leafEffect = new LeafEffect({
      geometry: leafGeometry,
      material: leafMaterial,
      count: params.count,
      height: params.height,
      width: params.width,
      depth: params.depth,
    });
    scene.add(leafEffect);
    centerObject(leafEffect);
  };

  const gui = new GUI();
  gui.title("Leaf Effect");
  gui.add(params, "count", 1, 1000, 1).name("Count").onChange(update);
  gui.add(params, "height", 0.5, 20, 0.001).name("Height").onChange(update);
  gui.add(params, "width", 0.1, 20, 0.001).name("Width").onChange(update);
  gui.add(params, "depth", 0.1, 20, 0.001).name("Depth").onChange(update);

  return () => {
    gui.destroy();
    scene.remove(leafEffect);
    leafGeometry.dispose();
    leafMaterial.dispose();
    dispose();
  };
}
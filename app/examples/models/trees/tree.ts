import GUI from "lil-gui";
import { Tree } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Tree" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const parameters = {
    trunkRadiusTop: 0.25,
    trunkRadiusBottom: 0.4,
    trunkHeight: 2.5,
    trunkSegments: 14,
    trunkColor: 0x8b4513,
    leafSize: 0.8,
    leafCount: 6,
    leafDetail: 0,
    leafSpreadRadius: 1.5,
    leafColor: 0x228b22,
  };

  let tree: Tree;

  const rebuild = () => {
    if (tree) {
      scene.remove(tree);
      tree.geometry.dispose();
      tree.material.forEach((m) => m.dispose());
    }

    tree = new Tree({
      trunkRadiusTop: parameters.trunkRadiusTop,
      trunkRadiusBottom: parameters.trunkRadiusBottom,
      trunkHeight: parameters.trunkHeight,
      trunkSegments: parameters.trunkSegments,
      trunkColor: parameters.trunkColor,
      leafSize: parameters.leafSize,
      leafCount: parameters.leafCount,
      leafDetail: parameters.leafDetail,
      leafSpreadRadius: parameters.leafSpreadRadius,
      leafColor: parameters.leafColor,
    });
    tree.position.y = -2;
    scene.add(tree);
  };

  const gui = new GUI();
  gui.title("Tree");
  gui.add(parameters, "trunkRadiusTop", 0.05, 0.5).step(0.1).onChange(rebuild);
  gui.add(parameters, "trunkRadiusBottom", 0.05, 0.5).step(0.1).onChange(rebuild);
  gui.add(parameters, "trunkHeight", 1, 5).step(0.1).onChange(rebuild);
  gui.add(parameters, "trunkSegments", 3, 32).step(1).onChange(rebuild);
  gui.addColor(parameters, "trunkColor").name("Trunk Color").onChange(rebuild);
  gui.add(parameters, "leafSize", 0.5, 2).step(0.1).onChange(rebuild);
  gui.add(parameters, "leafCount", 1, 16).step(1).onChange(rebuild);
  gui.add(parameters, "leafDetail", 0, 8).step(1).onChange(rebuild);
  gui.add(parameters, "leafSpreadRadius", 0.5, 2).step(0.1).onChange(rebuild);
  gui.addColor(parameters, "leafColor").name("Leaf Color").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    tree.geometry.dispose();
    tree.material.forEach((m) => m.dispose());
    dispose();
  };
}
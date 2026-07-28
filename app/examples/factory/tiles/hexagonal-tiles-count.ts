import { InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createHexagonalTilesByCount } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hexagonal Tiles (by Count)" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });

  const material = new MeshStandardMaterial({ color: 0xffffff });
  const params = {
    width: 10,
    depth: 10,
    height: 0.01,
    count: 24,
    gap: 0.01,
  };

  let tiles: InstancedMesh | undefined;
  const rebuild = () => {
    if (tiles) {
      scene.remove(tiles);
      tiles.geometry.dispose();
    }
    tiles = createHexagonalTilesByCount({ ...params, material });
    scene.add(tiles);
  };

  const gui = new GUI();
  gui.title("Hexagonal Tile");
  gui.add(params, "width", 5, 20, 0.01).name("Width").onChange(rebuild);
  gui.add(params, "depth", 5, 20, 0.01).name("Depth").onChange(rebuild);
  gui.add(params, "height", 0.01, 1, 0.01).name("Tile Height").onChange(rebuild);
  gui.add(params, "count", 1, 128, 1).name("Tile Count").onChange(rebuild);
  gui.add(params, "gap", 0, 0.1, 0.001).name("Tile Gap").onChange(rebuild);

  rebuild();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    material.dispose();
    dispose();
  };
}

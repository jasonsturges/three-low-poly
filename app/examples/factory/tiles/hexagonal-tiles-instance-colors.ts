import { Color, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createHexagonalTilesByCount } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hexagonal Tiles (Instance Colors)" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });

  // White base so the per-instance color reads directly (standard materials
  // multiply the base color by instanceColor via native USE_INSTANCING_COLOR).
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });

  const params = {
    count: 127,
    interval: 24,
  };

  const highlight = new Color(0x000f89);
  const base = new Color(0.8, 0.8, 0.8);

  let tiles: InstancedMesh | undefined;

  const update = () => {
    if (tiles) {
      scene.remove(tiles);
      tiles.geometry.dispose();
    }

    tiles = createHexagonalTilesByCount({
      width: 10,
      depth: 10,
      height: 0.01,
      count: params.count,
      gap: 0.01,
      material,
    });
    scene.add(tiles);

    // Native per-instance color — setColorAt lazily allocates instanceColor.
    for (let i = 0; i < tiles.count; i++) {
      tiles.setColorAt(i, i % params.interval === 0 ? highlight : base);
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };

  const gui = new GUI();
  gui.title("Hexagonal Tile");
  gui.add(params, "count", 2, 128, 1).name("Count").onChange(update);
  gui.add(params, "interval", 0, 360, 1).name("Interval").onChange(update);

  update();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    material.dispose();
    dispose();
  };
}

import { InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { addInstanceColor, createHexagonalTilesByCount, getAnalogousColors } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Hexagonal Tiles (Analogous Colors)" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 5] });

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.25,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });
  addInstanceColor(material);

  const params = {
    count: 24,
    hue: 0,
  };

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

    const colors = new Float32Array(tiles.count * 3);
    for (let i = 0; i < tiles.count; i++) {
      getAnalogousColors(params.hue).forEach((color, index) => {
        colors[i * 3 + index] = color / 0xff;
      });
    }

    tiles.geometry.setAttribute("instanceColor", new InstancedBufferAttribute(colors, 3));
  };

  const gui = new GUI();
  gui.title("Analogous Colors");
  gui.add(params, "count", 2, 128, 1).name("Count").onChange(update);
  gui.add(params, "hue", 0, 360, 1).name("Hue").onChange(update);

  update();

  return () => {
    gui.destroy();
    tiles?.geometry.dispose();
    material.dispose();
    dispose();
  };
}

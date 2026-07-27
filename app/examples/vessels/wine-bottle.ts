import { Mesh, MeshPhysicalMaterial } from "three";
import { centerObject, WineBottleGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Wine Bottle" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xaecbe8 });

  // Translucent green glass: transmission carries the light through, clearcoat gives the sheen.
  const glass = new MeshPhysicalMaterial({
    color: 0x556b2f,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 0.2,
    metalness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const wineBottle = new Mesh(new WineBottleGeometry(), glass);
  scene.add(wineBottle);
  centerObject(wineBottle);

  return () => {
    wineBottle.geometry.dispose();
    glass.dispose();
    dispose();
  };
}

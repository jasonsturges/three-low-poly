import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { JarGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Jar" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  // Group 0 is the jar, group 1 the cork. `depthWrite: false` on the glass keeps the cork and the
  // jar's own far wall from being culled by it.
  const materials = [
    new MeshStandardMaterial({
      color: 0x88ccaa,
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.5,
      side: DoubleSide,
    }),
    new MeshStandardMaterial({ color: 0x8b4513, roughness: 1.0 }),
  ];

  const jar = new Mesh(new JarGeometry(), materials);
  scene.add(jar);
  centerObject(jar);

  return () => {
    jar.geometry.dispose();
    jar.material.forEach((m) => m.dispose());
    dispose();
  };
}
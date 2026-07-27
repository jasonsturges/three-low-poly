import { DoubleSide, Mesh, MeshPhysicalMaterial } from "three";
import { FlorenceFlaskGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Florence Flask" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0xe64d4d });

  const glass = new MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    depthWrite: false,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
    reflectivity: 0.8,
    transmission: 0.9,
    side: DoubleSide,
  });

  const florenceFlask = new Mesh(new FlorenceFlaskGeometry(), glass);
  scene.add(florenceFlask);
  centerObject(florenceFlask);

  return () => {
    florenceFlask.geometry.dispose();
    glass.dispose();
    dispose();
  };
}
import { Mesh, MeshStandardMaterial } from "three";
import { JarGeometry } from "../../geometry/bottles/JarGeometry";

/**
 * Material indices
 * 0. Jar
 * 1. Cork
 */
export class Jar extends Mesh<JarGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(new JarGeometry(), [
      new MeshStandardMaterial({
        color: 0x88ccaa,
        transparent: true,
        depthWrite: false,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.5,
      }),
      new MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 1.0,
      }),
    ]);
  }
}

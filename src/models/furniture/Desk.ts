import { Mesh, MeshStandardMaterial } from "three";
import { DeskGeometry } from "../../geometry/furniture/DeskGeometry";

/**
 * Material indices:
 * 0. Desk surface
 * 1. Desk legs
 */
export class Desk extends Mesh<DeskGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(new DeskGeometry(), [
      new MeshStandardMaterial({ color: 0x8b5a2b }), // Desk surface
      new MeshStandardMaterial({ color: 0x4b3621 }), // Desk legs
    ]);
  }
}

import { Mesh, MeshStandardMaterial } from "three";
import { DeskGeometry } from "../../geometry/furniture/DeskGeometry";

export class Desk extends Mesh {
  public geometry: DeskGeometry;
  public material: MeshStandardMaterial[];

  constructor() {
    super();

    this.geometry = new DeskGeometry();
    this.material = [
      new MeshStandardMaterial({ color: 0x8b5a2b }), // Desk surface
      new MeshStandardMaterial({ color: 0x4b3621 }), // Desk legs
    ];
  }
}

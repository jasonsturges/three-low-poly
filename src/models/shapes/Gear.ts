import { Mesh, MeshStandardMaterial } from "three";
import { GearGeometry } from "../../geometry/shapes/GearGeometry";

export class Gear extends Mesh {
  constructor({ sides = 5, innerRadius = 0.5, outerRadius = 1, holeSides = 5, holeRadius = 0.25, depth = 0.25 } = {}) {
    super(
      new GearGeometry(sides, innerRadius, outerRadius, holeSides, holeRadius, depth),
      new MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.8,
        roughness: 0.2,
      }),
    );
  }
}

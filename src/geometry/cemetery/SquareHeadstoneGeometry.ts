import { BoxGeometry, BufferGeometry } from "three";

export class SquareHeadstoneGeometry extends BufferGeometry {
  constructor(width = 0.5, height = 0.8, depth = 0.15) {
    super();

    // Create a rectangular slab
    const slabGeometry = new BoxGeometry(width, height, depth);
    slabGeometry.translate(0, height / 2, 0);

    this.copy(slabGeometry);
  }
}

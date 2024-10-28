import { BoxGeometry, BufferGeometry } from "three";

class SquareHeadstoneGeometry extends BufferGeometry {
  constructor(width = 0.5, height = 0.8, depth = 0.15) {
    super();

    // Create a rectangular slab
    const slabGeometry = new BoxGeometry(width, height, depth);
    slabGeometry.translate(0, height / 2, 0); // Shift up to stand on the ground

    this.copy(slabGeometry);
  }
}
export { SquareHeadstoneGeometry };

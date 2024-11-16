import { BoxGeometry, BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

class CrossHeadstoneGeometry extends BufferGeometry {
  constructor(width: number = 0.4, height: number = 1.2, depth: number = 0.2) {
    super();

    // Create the vertical part of the cross
    const verticalHeight = height * 0.6;
    const verticalGeometry = new BoxGeometry(width / 2, verticalHeight, depth);
    verticalGeometry.translate(0, verticalHeight / 2, 0);

    // Create the horizontal part of the cross
    const horizontalWidth = width * 1.5;
    const horizontalGeometry = new BoxGeometry(horizontalWidth, width / 4, depth);
    horizontalGeometry.translate(0, verticalHeight * 0.75, 0);

    // Merge both parts into a cross
    this.copy(mergeBufferGeometries([verticalGeometry, horizontalGeometry], false) as BufferGeometry);
    this.computeVertexNormals();
  }
}

export { CrossHeadstoneGeometry };

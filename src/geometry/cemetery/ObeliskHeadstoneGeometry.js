import { BoxGeometry, BufferGeometry, ConeGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

class ObeliskHeadstoneGeometry extends BufferGeometry {
  constructor(totalHeight = 1.75, baseWidth = 0.75) {
    super();

    // Define height proportions relative to the total height
    const baseHeight = totalHeight * 0.05;
    const lowerSegmentHeight = totalHeight * 0.15;
    const middleSegmentHeight = totalHeight * 0.15;
    const topSegmentHeight = totalHeight * 0.75;

    let currentHeight = 0;

    // Base of the Headstone (a wide box)
    const baseGeometry = new BoxGeometry(baseWidth, baseHeight, baseWidth);
    baseGeometry.translate(0, currentHeight + baseHeight / 2, 0);
    currentHeight += baseHeight;

    // Lower Segment (a slightly narrower box)
    const lowerSegmentGeometry = new BoxGeometry(baseWidth * 0.8, lowerSegmentHeight, baseWidth * 0.8);
    lowerSegmentGeometry.translate(0, currentHeight + lowerSegmentHeight / 2, 0);
    currentHeight += lowerSegmentHeight;

    // Middle Segment (an even narrower box)
    const middleSegmentGeometry = new BoxGeometry(baseWidth * 0.6, middleSegmentHeight, baseWidth * 0.6);
    middleSegmentGeometry.translate(0, currentHeight + middleSegmentHeight / 2, 0);
    currentHeight += middleSegmentHeight;

    // Top Segment (a tall, thin box to form the obelisk shape)
    const topSegmentGeometry = new BoxGeometry(baseWidth * 0.4, topSegmentHeight, baseWidth * 0.4);
    topSegmentGeometry.translate(0, currentHeight + topSegmentHeight / 2, 0);
    currentHeight += topSegmentHeight;

    // Pyramid Top (a cone to form the pointed top of the obelisk)
    const pyramidGeometry = new ConeGeometry((baseWidth * 0.4) / Math.sqrt(2), 0.1, 4, 1, false, Math.PI / 4);
    pyramidGeometry.translate(0, currentHeight + 0.1 / 2, 0);

    this.copy(
      mergeGeometries([baseGeometry, lowerSegmentGeometry, middleSegmentGeometry, topSegmentGeometry, pyramidGeometry], false),
    );
  }
}

export { ObeliskHeadstoneGeometry };

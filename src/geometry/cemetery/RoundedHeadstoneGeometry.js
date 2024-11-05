import { BoxGeometry, BufferGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

class RoundedHeadstoneGeometry extends BufferGeometry {
  constructor(width = 0.6, height = 1.0, depth = 0.2) {
    super();

    // Create the base of the headstone (a box)
    const baseHeight = height * 0.7;
    const baseGeometry = new BoxGeometry(width, baseHeight, depth);
    baseGeometry.translate(0, baseHeight / 2, 0);

    // Create the rounded top part (a half cylinder with caps)
    const topHeight = height - baseHeight;
    const topGeometry = new CylinderGeometry(width / 2, width / 2, depth, 16, 1, false, 0, Math.PI);
    topGeometry.rotateY(Math.PI / 2);
    topGeometry.rotateX(Math.PI / 2);
    topGeometry.translate(0, baseHeight + topHeight / 2 - depth / 2 - 0.05, 0);

    // Merge base and top into a single geometry
    this.copy(mergeGeometries([baseGeometry, topGeometry], false));
    this.computeVertexNormals();
  }
}

export { RoundedHeadstoneGeometry };

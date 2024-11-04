import { Vector3 } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { Direction } from "../constants/Direction.js";

export function randomTransformVertices(geometry, direction = Direction.XYZ, minScale = 0.5, maxScale = 2.0) {
  // Delete unnecessary attributes
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry = mergeVertices(geometry);
  geometry.computeVertexNormals();

  // Get position attribute
  const positionAttribute = geometry.getAttribute("position");

  // Loop through each vertex
  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new Vector3().fromBufferAttribute(positionAttribute, i);

    // Randomly scale the displacement along the given direction
    const randomScale = Math.random() * (maxScale - minScale) + minScale;
    const displacement = direction.clone().multiplyScalar(randomScale);

    // Apply the displacement to the vertex
    vertex.add(displacement);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // Notify Three.js that the position attribute has been updated
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

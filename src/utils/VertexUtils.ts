import { Axis } from "../constants/Axis";
import { BufferGeometry, Vector3 } from "three";
import { mergeVertices } from "three-stdlib";

export function randomTransformVertices<T extends BufferGeometry>(geometry:T, axis = Axis.XYZ, minScale = 0.5, maxScale = 2.0) {
  // Delete unnecessary attributes
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry = mergeVertices(geometry) as T;
  geometry.computeVertexNormals();

  // Get position attribute
  const positionAttribute = geometry.getAttribute("position");

  // Loop through each vertex
  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new Vector3().fromBufferAttribute(positionAttribute, i);

    // Randomly scale the displacement along the given axis
    const randomScale = Math.random() * (maxScale - minScale) + minScale;
    const displacement = axis.clone().multiplyScalar(randomScale);

    // Apply the displacement to the vertex
    vertex.add(displacement);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // Notify Three.js that the position attribute has been updated
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

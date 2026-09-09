import { Axis } from "../../constants/Axis";
import { BufferGeometry, Vector3 } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Deletes input UVs/normals, then returns a welded geometry displaced by axis × randomScale per vertex.
 * Recomputes output normals; the input attribute deletion is a side effect. */
export function randomTransformVertices<T extends BufferGeometry>(geometry:T, axis = Axis.XYZ, minScale = 0.5, maxScale = 2.0) {

  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry = mergeVertices(geometry) as T;
  geometry.computeVertexNormals();

  const positionAttribute = geometry.getAttribute("position");

  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new Vector3().fromBufferAttribute(positionAttribute, i);

    const randomScale = Math.random() * (maxScale - minScale) + minScale;
    const displacement = axis.clone().multiplyScalar(randomScale);

    vertex.add(displacement);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

import { Mesh, Vector3 } from "three";

/**
 * Select the nearest stored vertex using geometry-local distances, then return it in world space.
 *
 * `point` must be in the mesh geometry's local coordinate space. This searches the position
 * attribute only; it does not find the closest point on triangle faces or edges. Under nonuniform
 * world scaling, the selected vertex need not be the nearest vertex by world-space distance.
 * An empty position attribute returns the mesh's local origin transformed to world space.
 *
 * @example
 * ```ts
 * const localPoint = new Vector3(5, 2, 1);
 * const worldVertex = findClosestPoint(localPoint, targetMesh);
 * ```
 */
export function findClosestPoint(point: Vector3, mesh: Mesh) {
  if (!mesh.geometry.isBufferGeometry) {
    throw new Error("Mesh must have a BufferGeometry.");
  }

  const geometry = mesh.geometry;
  const positionAttribute = geometry.getAttribute("position");
  const closestPoint = new Vector3();
  const tempPoint = new Vector3();
  let minDistance = Infinity;

  for (let i = 0; i < positionAttribute.count; i++) {
    tempPoint.fromBufferAttribute(positionAttribute, i);
    const distance = tempPoint.distanceTo(point);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint.copy(tempPoint);
    }
  }

  // Transform the closest point to world space (if the mesh is transformed)
  mesh.localToWorld(closestPoint);

  return closestPoint;
}

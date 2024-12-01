import { Mesh, Vector3 } from "three";

/**
 * Get the closest point on a mesh to a specified point.
 *
 * Example usage:
 * ```ts
 * const point = new Vector3(5, 2, 1); // The point to check against the mesh
 * const closestPoint = getClosestPointOnMesh(point, targetMesh);
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

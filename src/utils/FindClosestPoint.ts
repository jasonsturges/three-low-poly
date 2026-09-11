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

  for (let i = 0; i < (positionAttribute?.count ?? 0); i++) {
    tempPoint.fromBufferAttribute(positionAttribute, i);
    const distance = tempPoint.distanceToSquared(point);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint.copy(tempPoint);
    }
  }

  // Transform the closest point to world space (if the mesh is transformed)
  mesh.localToWorld(closestPoint);

  return closestPoint;
}

/** Nearest stored base-geometry vertex by world-space distance; null for empty geometry.
 * Query and result are world-space. Does not query faces, instances, morphs, or skinning.
 */
export function findClosestVertexWorld(point: Vector3, mesh: Mesh): Vector3 | null {
  if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error("Expected a finite query point.");
  mesh.updateWorldMatrix(true, false);
  const attribute = mesh.geometry.getAttribute("position");
  let result: Vector3 | null = null;
  let best = Infinity;
  const vertex = new Vector3();
  for (let i = 0; i < (attribute?.count ?? 0); i++) {
    vertex.fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrixWorld);
    const distance = vertex.distanceToSquared(point);
    if (distance < best) {
      best = distance;
      result = vertex.clone();
    }
  }
  return result;
}

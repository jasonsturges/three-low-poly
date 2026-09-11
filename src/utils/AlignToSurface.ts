import { BufferGeometry, InstancedMesh, Matrix4, Object3D, Vector3 } from "three";
import { finiteVector, inverseWorld, placementBounds, translateWorld } from "./internal/Placement";

/** Move the world AABB bottom center to targetPosition + offset, both world-space.
 * Translation only: does not query terrain, orient to normals, or test footprint contact.
 */
export function alignObjectToSurface(object: Object3D, targetPosition: Vector3, offset = new Vector3()): void {
  finiteVector(targetPosition);
  finiteVector(offset);
  const box = placementBounds(object);
  const anchor = box.getCenter(new Vector3());
  anchor.y = box.min.y;
  translateWorld(object, targetPosition.clone().add(offset).sub(anchor));
}

/** Translate vertices so the geometry-local minimum Y equals targetPositionY.
 * Mutates shared geometry. Supports interleaved attributes; empty geometry is rejected.
 */
export function alignBufferGeometryToSurface(geometry: BufferGeometry, targetPositionY: number): void {
  if (!Number.isFinite(targetPositionY)) throw new Error("Expected a finite target height.");
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty() || !Number.isFinite(box.min.y)) throw new Error("Expected nonempty finite geometry.");
  geometry.translate(0, targetPositionY - box.min.y, 0);
}

/** Move the entire batch's world AABB bottom center to targetPosition + offset.
 * This now has the same XYZ anchor semantics as alignObjectToSurface.
 */
export function alignInstancedMeshToSurface(mesh: InstancedMesh, targetPosition: Vector3, offset = new Vector3()): void {
  alignObjectToSurface(mesh, targetPosition, offset);
}

/** Move one instance's world AABB bottom center to targetPosition + offset.
 * Preserves its linear transform, updates GPU data and batch bounds. Uses the transformed
 * geometry-local box (conservative for rotated non-box shapes). Other instances stay fixed.
 */
export function alignInstancedMeshIndexToSurface(
  mesh: InstancedMesh,
  targetPosition: Vector3,
  instanceIndex: number,
  offset = new Vector3(),
): void {
  finiteVector(targetPosition);
  finiteVector(offset);
  if (!Number.isInteger(instanceIndex) || instanceIndex < 0 || instanceIndex >= mesh.count)
    throw new Error("Instance index out of range.");
  const inverse = inverseWorld(mesh);
  mesh.geometry.computeBoundingBox();
  const matrix = new Matrix4();
  mesh.getMatrixAt(instanceIndex, matrix);
  const world = new Matrix4().multiplyMatrices(mesh.matrixWorld, matrix);
  const box = mesh.geometry.boundingBox?.clone().applyMatrix4(world);
  if (!box || box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite))
    throw new Error("Expected nonempty finite instance bounds.");
  const anchor = box.getCenter(new Vector3());
  anchor.y = box.min.y;
  const delta = targetPosition.clone().add(offset).sub(anchor);
  const localDelta = delta.applyMatrix4(inverse).sub(new Vector3().applyMatrix4(inverse));
  matrix.elements[12] += localDelta.x;
  matrix.elements[13] += localDelta.y;
  matrix.elements[14] += localDelta.z;
  mesh.setMatrixAt(instanceIndex, matrix);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

import { Box3, Mesh, Vector3 } from "three";

/**
 * Centers the given mesh at the origin (0, 0, 0) of the scene by adjusting its position.
 * The mesh is moved so that its bounding box center is placed at the origin.
 */
export function centerMesh<T extends Mesh>(mesh: T): void {
  const box = new Box3().setFromObject(mesh);
  const center = box.getCenter(new Vector3());

  mesh.translateX(-center.x);
  mesh.translateY(-center.y);
  mesh.translateZ(-center.z);
  mesh.updateMatrixWorld(true);
}

/**
 * Centers a Mesh at the specified target position.
 */
export function centerMeshAtTarget<T extends Mesh>(mesh: T, target = new Vector3(0, 0, 0)) {
  const box = new Box3().setFromObject(mesh);
  const currentCenter = new Vector3();
  box.getCenter(currentCenter);

  const offset = new Vector3().subVectors(target, currentCenter);
  mesh.position.add(offset);
}

/**
 * Centers the geometry of the Mesh at the local origin (0, 0, 0) by modifying the geometry vertices.
 * This method moves the geometry itself so that its center is at the local origin,
 * without affecting the position, rotation, or scale of the mesh.
 */
export function centerMeshGeometry<T extends Mesh>(mesh: T): void {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    mesh.geometry.translate(-center.x, -center.y, -center.z);
  }
}

/**
 * Centers the geometry of a Mesh at the specified target position.
 */
export function centerMeshGeometryAtTarget<T extends Mesh>(mesh: T, target = new Vector3(0, 0, 0)) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    const offset = new Vector3().subVectors(target, center);
    mesh.geometry.translate(offset.x, offset.y, offset.z);
  }
}

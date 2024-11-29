import { Box3, Group, InstancedMesh, Mesh, Object3D, Vector3 } from "three";

//------------------------------
//  Object3D
//------------------------------

export function centerObject<T extends Object3D>(object: T): void {
  const box = new Box3().setFromObject(object);
  const center = box.getCenter(new Vector3());

  object.translateX(-center.x);
  object.translateY(-center.y);
  object.translateZ(-center.z);
  object.updateMatrixWorld(true);
}

//------------------------------
//  Mesh
//------------------------------

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

//------------------------------
//  Instanced Mesh
//------------------------------

export function centerInstancedMesh<T extends InstancedMesh>(mesh: T, offset: Vector3 = new Vector3(0, 0, 0)): void {
  mesh.computeBoundingBox();
  const box = mesh.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    mesh.translateX(-center.x + offset.x);
    mesh.translateY(-center.y + offset.y);
    mesh.translateZ(-center.z + offset.z);
  }
}

//------------------------------
//  Instanced Mesh
//------------------------------

export function centerGroup<T extends Group>(group: T) {
  const box = new Box3().setFromObject(group);
  const center = new Vector3();
  box.getCenter(center);
  group.position.sub(center);
}

export function centerGroupAtTarget<T extends Group>(group: T, target = new Vector3(0, 0, 0)) {
  const box = new Box3().setFromObject(group);
  const currentCenter = new Vector3();
  box.getCenter(currentCenter);

  const offset = new Vector3().subVectors(target, currentCenter);
  group.position.add(offset);
}

import { Box3, Mesh, Object3D, Vector3 } from "three";

//------------------------------
//  Object3D
//------------------------------

/**
 * Centers an `Object3D` relative to a specified target position with an optional offset.
 *
 * This function calculates the bounding box center of the given `Object3D` and adjusts
 * its position so that it is centered at the specified target position, with an optional
 * offset applied. The centering respects the object's current transformation, including
 * its scale and rotation.
 */
export function centerObject<T extends Object3D>(object: T, target = new Vector3(0, 0, 0), offset = new Vector3(0, 0, 0)) {
  const box = new Box3().setFromObject(object);
  const center = box.getCenter(new Vector3());
  const totalOffset = new Vector3().addVectors(target, offset);
  const adjustment = new Vector3().subVectors(totalOffset, center);

  object.position.add(adjustment);
}

/**
 * Centers the geometry of an `Object3D` relative to a target position with an optional offset.
 *
 * This function calculates the bounding box center of the given `Object3D` and adjusts its
 * geometry's position by translating it such that the geometry is centered at the specified
 * target position, with an optional offset applied. Unlike modifying the `position` property,
 * this function directly translates the geometry within the object's local space.
 */
export function centerObjectGeometry<T extends Object3D>(
  object: T,
  target: Vector3 = new Vector3(0, 0, 0),
  offset: Vector3 = new Vector3(0, 0, 0),
): void {
  const box = new Box3().setFromObject(object);
  const center = box.getCenter(new Vector3());
  const totalTarget = new Vector3().addVectors(target, offset);

  object.translateX(totalTarget.x - center.x);
  object.translateY(totalTarget.y - center.y);
  object.translateZ(totalTarget.z - center.z);
  object.updateMatrixWorld(true);
}

//------------------------------
//  Mesh
//------------------------------

/**
 * Centers the geometry of a `Mesh` relative to a target position with an optional offset.
 *
 * This function calculates the bounding box center of the `Mesh` geometry and adjusts its
 * position by translating the geometry such that it is centered at the specified target
 * position, with an optional offset applied. The function modifies the geometry directly,
 * leaving the `Mesh`'s transformation properties (`position`, `rotation`, `scale`) unchanged.
 */
export function centerMeshGeometry<T extends Mesh>(
  mesh: T,
  target: Vector3 = new Vector3(0, 0, 0),
  offset: Vector3 = new Vector3(0, 0, 0),
): void {
  // Compute the bounding box for the geometry
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    const totalTarget = new Vector3().addVectors(target, offset);
    const translationOffset = new Vector3().subVectors(totalTarget, center);

    mesh.geometry.translate(translationOffset.x, translationOffset.y, translationOffset.z);
  }
}

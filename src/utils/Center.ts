import { Mesh, Object3D, Vector3 } from "three";
import { finiteVector, placementBounds, translateWorld } from "./internal/Placement";

//------------------------------
//  Object3D
//------------------------------

/**
 * Centers an `Object3D` at a world-space target position plus a world-space offset.
 *
 * This function calculates the bounding box center of the given `Object3D` and adjusts
 * its position so that it is centered at the specified target position, with an optional
 * offset applied. The centering respects the object's current transformation, including
 * its scale and rotation.
 */
export function centerObject<T extends Object3D>(object: T, target = new Vector3(0, 0, 0), offset = new Vector3(0, 0, 0)) {
  finiteVector(target);
  finiteVector(offset);
  const box = placementBounds(object);
  translateWorld(object, target.clone().add(offset).sub(box.getCenter(new Vector3())));
}

/** @deprecated Misnamed legacy alias: moves the object, never edited geometry.
 * Use centerObject for world placement or centerMeshGeometry for local vertex editing.
 */
export function centerObjectGeometry<T extends Object3D>(object: T, target = new Vector3(), offset = new Vector3()): void {
  centerObject(object, target, offset);
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
  finiteVector(target);
  finiteVector(offset);
  // Compute the bounding box for the geometry
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;

  if (!box || box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite))
    throw new Error("Expected nonempty finite geometry.");
  if (box) {
    const center = box.getCenter(new Vector3());
    const totalTarget = new Vector3().addVectors(target, offset);
    const translationOffset = new Vector3().subVectors(totalTarget, center);

    mesh.geometry.translate(translationOffset.x, translationOffset.y, translationOffset.z);
  }
}

export const Center = {
  object: centerObject,
  objectGeometry: centerObjectGeometry,
  meshGeometry: centerMeshGeometry,
};

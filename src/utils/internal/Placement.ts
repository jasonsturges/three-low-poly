import { Box3, InstancedMesh, Matrix4, Object3D, Vector3 } from "three";

export function finiteVector(value: Vector3): void {
  if (![value.x, value.y, value.z].every(Number.isFinite)) throw new Error("Expected a finite vector.");
}

export function inverseWorld(object: Object3D): Matrix4 {
  object.updateWorldMatrix(true, false);
  const determinant = object.matrixWorld.determinant();
  if (!Number.isFinite(determinant) || determinant === 0) throw new Error("Placement requires an invertible parent transform.");
  return object.matrixWorld.clone().invert();
}

/** CPU world AABB, including descendants. Refresh ancestors and instance bounds. */
export function placementBounds(object: Object3D): Box3 {
  if (!object.matrixAutoUpdate) throw new Error("Placement requires matrixAutoUpdate on the moved object.");
  if (object.parent) inverseWorld(object.parent);
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if ((child as InstancedMesh).isInstancedMesh) (child as InstancedMesh).computeBoundingBox();
  });
  const box = new Box3().setFromObject(object, true);
  if (box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)) {
    throw new Error("Placement requires nonempty, finite geometry bounds.");
  }
  return box;
}

/** Convert world positions through the parent, rather than transforming a displacement as a point. */
export function translateWorld(object: Object3D, delta: Vector3): void {
  finiteVector(delta);
  const position = object.getWorldPosition(new Vector3()).add(delta);
  if (object.parent) position.applyMatrix4(inverseWorld(object.parent));
  object.position.copy(position);
  object.updateWorldMatrix(false, true);
}

export function independentObjects(objects: readonly Object3D[]): void {
  const selected = new Set(objects);
  if (selected.size !== objects.length) throw new Error("Placement objects must be unique.");
  for (const object of objects) {
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (selected.has(parent)) throw new Error("Placement objects must not contain ancestors and descendants.");
    }
  }
}

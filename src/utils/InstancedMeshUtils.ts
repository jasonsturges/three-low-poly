import { InstancedMesh, Vector3 } from "three";

export function centerInstancedMesh<T extends InstancedMesh>(mesh: T) {
  mesh.computeBoundingBox();
  const box = mesh.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    mesh.translateX(-center.x);
    mesh.translateY(-center.y);
    mesh.translateZ(-center.z);
  }
}

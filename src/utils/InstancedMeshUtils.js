import { Vector3 } from "three";

export function centerInstancedMesh(mesh) {
  mesh.computeBoundingBox();
  const box = mesh.boundingBox;
  const center = box.getCenter(new Vector3());

  mesh.translateX(-center.x);
  mesh.translateY(-center.y);
  mesh.translateZ(-center.z);
}

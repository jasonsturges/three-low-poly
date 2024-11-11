import { Box3, Vector3 } from "three";

export function centerGroup(group) {
  const box = new Box3().setFromObject(group);
  const center = new Vector3();
  box.getCenter(center);
  group.position.sub(center);
}

export function centerGroupAtTarget(group, target = new Vector3(0, 0, 0)) {
  const box = new Box3().setFromObject(group);
  const currentCenter = new Vector3();
  box.getCenter(currentCenter);

  const offset = new Vector3().subVectors(target, currentCenter);
  group.position.add(offset);
}

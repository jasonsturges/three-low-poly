import { BoxGeometry, Quaternion, Vector3 } from "three";

const Y_AXIS = new Vector3(0, 1, 0);

/** Thin box aligned between two points — for open iron lantern cages. */
export function barBetween(from: Vector3, to: Vector3, thickness: number): BoxGeometry {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const geometry = new BoxGeometry(thickness, length, thickness);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(Y_AXIS, direction.normalize()));
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}
import { Direction } from "../constants/Direction";
import { Object3D, Vector3 } from "three";
import { finiteVector, independentObjects, placementBounds, translateWorld } from "./internal/Placement";

/** Lay out independent objects in input order along a world-space line.
 * The first projected AABB interval starts at `origin`; centers lie on the line.
 * `gap` is the nonnegative distance between projected world AABBs (conservative on diagonals).
 * Uses CPU bounds, including hidden descendants; does not rotate objects or solve collisions.
 */
export function alignToRow<T extends Object3D>(
  objects: T[],
  direction: Vector3 = Direction.RIGHT,
  gap = 0,
  origin = new Vector3(),
): void {
  finiteVector(direction);
  finiteVector(origin);
  if (direction.length() === 0 || !Number.isFinite(direction.length()))
    throw new Error("Row direction must have a finite nonzero length.");
  if (!Number.isFinite(gap) || gap < 0) throw new Error("Row gap must be finite and nonnegative.");
  independentObjects(objects);
  const boxes = objects.map(placementBounds);
  const unit = direction.clone().normalize();
  const absolute = new Vector3(Math.abs(unit.x), Math.abs(unit.y), Math.abs(unit.z));
  let distance = 0;
  objects.forEach((object, i) => {
    const box = boxes[i];
    const width = box.getSize(new Vector3()).dot(absolute);
    const target = origin.clone().addScaledVector(unit, distance + width / 2);
    translateWorld(object, target.sub(box.getCenter(new Vector3())));
    distance += width + gap;
  });
}

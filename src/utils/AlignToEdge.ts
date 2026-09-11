import { Object3D, Vector3 } from "three";
import { BoxSide } from "../constants/BoxSide";
import { independentObjects, placementBounds, translateWorld } from "./internal/Placement";

/** Align world AABB faces to the outermost selected face. Empty selections are a no-op.
 * Objects must be independent (no duplicates or selected ancestors). Hidden descendants count.
 */
export function alignToEdge<T extends Object3D>(objects: T[], side: BoxSide): void {
  const sides = {
    left: ["x", "min"],
    right: ["x", "max"],
    bottom: ["y", "min"],
    top: ["y", "max"],
    back: ["z", "min"],
    front: ["z", "max"],
  } as const;
  if (!Object.prototype.hasOwnProperty.call(sides, side)) throw new Error(`Unsupported side: ${side}`);
  independentObjects(objects);
  const [axis, end] = sides[side];
  const boxes = objects.map(placementBounds);
  const reference = boxes.reduce(
    (value, box) => (end === "min" ? Math.min(value, box[end][axis]) : Math.max(value, box[end][axis])),
    end === "min" ? Infinity : -Infinity,
  );
  objects.forEach((object, i) => {
    const delta = new Vector3();
    delta[axis] = reference - boxes[i][end][axis];
    translateWorld(object, delta);
  });
}

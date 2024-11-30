import { Mesh, Vector3 } from "three";
import { BoxSide } from "../constants/BoxSide";

/**
 * Aligns an array of Mesh objects (or subclasses) to a specified side
 * (left, right, top, bottom, front, or back) based on their world-space bounding boxes.
 */
export function alignObjectsToEdge<T extends Mesh>(objects: T[], side: BoxSide): void {
  if (objects.length === 0) {
    throw new Error("No objects provided for alignment.");
  }

  // Compute the reference alignment value based on the specified side
  const referenceValue = objects.reduce(
    (acc, object) => {
      object.geometry.computeBoundingBox();
      const boundingBox = object.geometry.boundingBox;

      if (!boundingBox) {
        throw new Error("Bounding box computation failed.");
      }

      const worldPosition = new Vector3();
      object.getWorldPosition(worldPosition);

      switch (side) {
        case BoxSide.LEFT:
          return Math.min(acc, worldPosition.x + boundingBox.min.x);
        case BoxSide.RIGHT:
          return Math.max(acc, worldPosition.x + boundingBox.max.x);
        case BoxSide.BOTTOM:
          return Math.min(acc, worldPosition.y + boundingBox.min.y);
        case BoxSide.TOP:
          return Math.max(acc, worldPosition.y + boundingBox.max.y);
        case BoxSide.BACK:
          return Math.min(acc, worldPosition.z + boundingBox.min.z);
        case BoxSide.FRONT:
          return Math.max(acc, worldPosition.z + boundingBox.max.z);
        default:
          throw new Error(`Unsupported side type: ${side}`);
      }
    },
    side === BoxSide.RIGHT || side === BoxSide.TOP || side === BoxSide.FRONT ? -Infinity : Infinity,
  );

  // Align each object to the computed reference value
  objects.forEach((object) => {
    object.geometry.computeBoundingBox();
    const boundingBox = object.geometry.boundingBox;

    if (!boundingBox) {
      throw new Error("Bounding box computation failed.");
    }

    const worldPosition = new Vector3();
    object.getWorldPosition(worldPosition); // Get the object's position in world space

    switch (side) {
      case BoxSide.LEFT:
        object.position.x += referenceValue - (worldPosition.x + boundingBox.min.x);
        break;
      case BoxSide.RIGHT:
        object.position.x += referenceValue - (worldPosition.x + boundingBox.max.x);
        break;
      case BoxSide.BOTTOM:
        object.position.y += referenceValue - (worldPosition.y + boundingBox.min.y);
        break;
      case BoxSide.TOP:
        object.position.y += referenceValue - (worldPosition.y + boundingBox.max.y);
        break;
      case BoxSide.BACK:
        object.position.z += referenceValue - (worldPosition.z + boundingBox.min.z);
        break;
      case BoxSide.FRONT:
        object.position.z += referenceValue - (worldPosition.z + boundingBox.max.z);
        break;
    }
  });
}

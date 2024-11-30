import { Box3, Object3D, Vector3 } from "three";
import { BoxSide } from "../constants/BoxSide";

/**
 * Aligns an array of Object3D objects (or subclasses) to a specified side
 * (left, right, top, bottom, front, or back) based on their world-space bounding boxes.
 */
export function alignObjectsToEdge<T extends Object3D>(objects: T[], side: BoxSide): void {
  if (objects.length === 0) {
    throw new Error("No objects provided for alignment.");
  }

  const worldBoundingBox = new Box3();
  const worldPosition = new Vector3();

  // Precompute world-space bounding boxes and positions for all objects
  const objectData = objects.map((object) => {
    worldBoundingBox.setFromObject(object); // Accounts for scale and rotation
    object.getWorldPosition(worldPosition);

    return {
      object,
      boundingBox: worldBoundingBox.clone(), // Clone to avoid overwriting
      worldPosition: worldPosition.clone(),
    };
  });

  // Compute the reference alignment value based on the specified side
  const referenceValue = objectData.reduce(
    (acc, { boundingBox }) => {
      switch (side) {
        case BoxSide.LEFT:
          return Math.min(acc, boundingBox.min.x);
        case BoxSide.RIGHT:
          return Math.max(acc, boundingBox.max.x);
        case BoxSide.BOTTOM:
          return Math.min(acc, boundingBox.min.y);
        case BoxSide.TOP:
          return Math.max(acc, boundingBox.max.y);
        case BoxSide.BACK:
          return Math.min(acc, boundingBox.min.z);
        case BoxSide.FRONT:
          return Math.max(acc, boundingBox.max.z);
        default:
          throw new Error(`Unsupported side type: ${side}`);
      }
    },
    side === BoxSide.RIGHT || side === BoxSide.TOP || side === BoxSide.FRONT ? -Infinity : Infinity,
  );

  // Align each object to the computed reference value
  objectData.forEach(({ object, boundingBox }) => {
    switch (side) {
      case BoxSide.LEFT:
        object.position.x += referenceValue - boundingBox.min.x;
        break;
      case BoxSide.RIGHT:
        object.position.x += referenceValue - boundingBox.max.x;
        break;
      case BoxSide.BOTTOM:
        object.position.y += referenceValue - boundingBox.min.y;
        break;
      case BoxSide.TOP:
        object.position.y += referenceValue - boundingBox.max.y;
        break;
      case BoxSide.BACK:
        object.position.z += referenceValue - boundingBox.min.z;
        break;
      case BoxSide.FRONT:
        object.position.z += referenceValue - boundingBox.max.z;
        break;
    }
  });
}

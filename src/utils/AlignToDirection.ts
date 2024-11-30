import { Direction } from "../constants/Direction";
import { Mesh, Vector3, Box3 } from "three";

/**
 * Aligns an array of `Object3D` objects along a specified direction with optional spacing.
 */
export function alignObjectsInDirection<T extends Mesh>(
  objects: T[],
  direction: Vector3 = Direction.RIGHT,
  spacing: number = 0,
): void {
  // Ensure the direction vector is normalized
  const alignmentDirection = direction.clone().normalize();

  // Start the position tracker for alignment
  let currentPosition = new Vector3();
  const worldBoundingBox = new Box3();

  // Align each object
  objects.forEach((object) => {
    // Compute the world-space bounding box
    worldBoundingBox.setFromObject(object); // Accounts for scale and rotation

    // Calculate the object's size along the alignment direction
    const sizeVector = new Vector3(
      worldBoundingBox.max.x - worldBoundingBox.min.x,
      worldBoundingBox.max.y - worldBoundingBox.min.y,
      worldBoundingBox.max.z - worldBoundingBox.min.z,
    );
    const size = sizeVector.dot(alignmentDirection);

    // Compute the object's center in world space
    const objectCenter = new Vector3();
    worldBoundingBox.getCenter(objectCenter);

    // Adjust the object's position so its center aligns with the current position
    const offset = alignmentDirection.clone().multiplyScalar(size / 2);
    object.position.copy(currentPosition.clone().add(offset).sub(objectCenter).add(object.position));

    // Update the position tracker for the next object
    currentPosition.add(alignmentDirection.clone().multiplyScalar(size + spacing));
  });
}

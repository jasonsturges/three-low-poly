import { BufferGeometry, Quaternion, Vector3 } from "three";
import { Direction } from "../constants/Direction";
import { Falloff } from "../constants/Falloff";

/**
 * Applies a twisting force to the vertices, rotating them around the direction defined by the target position.
 */
export const twistBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  strength: number,
  direction: Vector3 = Direction.UP,
  falloffFn: (distance: number, radius: number) => number = Falloff.LINEAR
): void => {
  const positions = geometry.attributes.position;
  const quaternion = new Quaternion();

  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      // Calculate falloff and rotation angle
      const falloff = falloffFn(distance, radius);
      const angle = falloff * strength;

      // Create quaternion for rotation around the axis
      quaternion.setFromAxisAngle(direction, angle);

      // Apply twist rotation
      vertex.sub(position).applyQuaternion(quaternion).add(position);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

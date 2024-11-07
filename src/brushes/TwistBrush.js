import { Quaternion, Vector3 } from "three";
import { Direction } from "../constants/Direction.js";
import { Falloff } from "../constants/Falloff.js";

/**
 * Applies a twisting force to the vertices, rotating them around the direction defined by the target position.
 */
export const twistBrush = (geometry, position, radius, strength, direction = Direction.UP, falloffFn = Falloff.LINEAR) => {
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

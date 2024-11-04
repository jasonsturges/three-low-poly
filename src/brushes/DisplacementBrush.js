import { Vector3 } from "three";
import { Direction } from "../constants/Direction.js";
import { Falloff } from "../constants/Falloff.js";

/**
 * Moves vertices within a specified radius around a target position along a given direction
 */
export const displacementBrush = (geometry, position, radius, strength, axis = Direction.UP, falloffFn = Falloff.LINEAR) => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);

    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      // Calculate falloff
      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength;

      // Apply the effect (e.g., pulling the vertex upwards)
      vertex.add(axis.clone().multiplyScalar(influence));

      // Update the vertex position
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

import { BufferGeometry, Vector3 } from "three";
import { Direction } from "../constants/Direction";
import { Falloff } from "../constants/Falloff";

/**
 * Moves vertices within a specified radius around a target position along a given direction
 */
export const displacementBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  strength: number,
  direction: Vector3 = Direction.UP,
  falloffFn: (distance: number, radius: number) => number = Falloff.linear,
): void => {
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
      vertex.add(direction.clone().multiplyScalar(influence));

      // Update the vertex position
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

import { BufferGeometry, Vector3 } from "three";
import { Falloff } from "../constants/Falloff";

/**
 * Creates spikes or depressions centered on the target position, pushing vertices away or pulling them towards the center.
 */
export const spikeBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  strength: number,
  inward: boolean = false,
  falloffFn: (distance: number, radius: number) => number = Falloff.LINEAR
): void => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      // Calculate falloff
      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength * (inward ? -1 : 1);

      // Move the vertex along the direction from the center
      const direction = vertex.clone().sub(position).normalize();
      vertex.add(direction.multiplyScalar(influence));

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

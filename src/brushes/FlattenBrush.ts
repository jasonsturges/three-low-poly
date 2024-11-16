import { BufferGeometry, Vector3 } from "three";
import { Direction } from "../constants/Direction";
import { Falloff } from "../constants/Falloff";

/**
 * Flattens vertices to a given plane defined by a target height or normal direction.
 */
export const flattenBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  targetHeight: number,
  strength: number,
  direction: Vector3 = Direction.UP,
  falloffFn: (distance: number, radius: number) => number = Falloff.LINEAR
): void => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength;

      // Project vertex onto flatten plane
      const projectedHeight = vertex.dot(direction.normalize());
      const delta = targetHeight - projectedHeight;

      vertex.add(direction.clone().multiplyScalar(delta * influence));
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

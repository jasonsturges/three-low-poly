import { BufferGeometry, Vector3 } from "three";
import { Direction } from "../../constants/Direction";
import { Falloff } from "../../constants/Falloff";

/** Move positions toward dot(vertex, direction) = targetHeight; normalizes the supplied direction in place.
 * Normals and bounds remain stale. */
export const flattenBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  targetHeight: number,
  strength: number,
  direction: Vector3 = Direction.UP,
  falloffFn: (distance: number, radius: number) => number = Falloff.linear
): void => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength;

      const projectedHeight = vertex.dot(direction.normalize());
      const delta = targetHeight - projectedHeight;

      vertex.add(direction.clone().multiplyScalar(delta * influence));
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

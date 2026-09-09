import { BufferGeometry, Quaternion, Vector3 } from "three";
import { Direction } from "../../constants/Direction";
import { Falloff } from "../../constants/Falloff";

/** Rotate positions in place about a unit direction through the target; strength is radians before falloff.
 * Normals and bounds remain stale. */
export const twistBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  strength: number,
  direction: Vector3 = Direction.UP,
  falloffFn: (distance: number, radius: number) => number = Falloff.linear
): void => {
  const positions = geometry.attributes.position;
  const quaternion = new Quaternion();

  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {

      const falloff = falloffFn(distance, radius);
      const angle = falloff * strength;

      quaternion.setFromAxisAngle(direction, angle);

      vertex.sub(position).applyQuaternion(quaternion).add(position);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

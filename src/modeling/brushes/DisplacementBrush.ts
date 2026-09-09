import { BufferGeometry, Vector3 } from "three";
import { Direction } from "../../constants/Direction";
import { Falloff } from "../../constants/Falloff";

/** Displace positions in place within radius; direction magnitude scales strength. Normals and bounds remain stale. */
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

      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength;

      vertex.add(direction.clone().multiplyScalar(influence));

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

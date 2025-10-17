import { BufferGeometry, MathUtils, Vector3 } from "three";
import { Direction } from "../constants/Direction";
import { Falloff } from "../constants/Falloff";

/**
 * Adds random noise to the vertices within the specified radius to create a more rugged or natural look.
 */
export const noiseBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
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
      const noiseStrength = strength * falloff;

      // Generate random noise in the direction specified
      const noise = direction.clone().normalize();
      vertex.x += MathUtils.randFloatSpread(noiseStrength) * noise.x;
      vertex.y += MathUtils.randFloatSpread(noiseStrength) * noise.y;
      vertex.z += MathUtils.randFloatSpread(noiseStrength) * noise.z;

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

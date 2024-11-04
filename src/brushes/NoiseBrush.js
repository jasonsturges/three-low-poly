import { MathUtils, Vector3 } from "three";
import { Direction } from "../constants/Direction.js";
import { Falloff } from "../constants/Falloff.js";

/**
 * Adds random noise to the vertices within the specified radius to create a more rugged or natural look.
 */
export const noiseBrush = (geometry, position, radius, strength, direction = Direction.UP, falloffFn = Falloff.LINEAR) => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      const falloff = falloffFn(distance, radius);
      const noiseStrength = strength * falloff;

      // Generate random noise, but only in the direction specified
      const noise = direction.clone().normalize();
      if (noise.x !== 0) {
        vertex.x += MathUtils.randFloatSpread(noiseStrength) * noise.x;
      }
      if (noise.y !== 0) {
        vertex.y += MathUtils.randFloatSpread(noiseStrength) * noise.y;
      }
      if (noise.z !== 0) {
        vertex.z += MathUtils.randFloatSpread(noiseStrength) * noise.z;
      }

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};
import {Direction} from "../constants/Direction.js";
import {Vector3} from "three";
import {Falloff} from "../constants/Falloff.js";

/**
 * Flattens vertices to a given plane defined by a target height or normal direction.
 */
export const flattenBrush = (geometry, position, radius, targetHeight, strength, axis = Direction.UP, falloffFn = Falloff.LINEAR) => {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      const falloff = falloffFn(distance, radius);
      const influence = falloff * strength;

      // Project vertex onto flatten plane
      const projectedHeight = vertex.dot(axis.normalize());
      const delta = targetHeight - projectedHeight;

      vertex.add(axis.clone().multiplyScalar(delta * influence));
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  positions.needsUpdate = true;
};

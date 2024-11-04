import { Vector3 } from "three";

/**
 * Smooths out the vertices by averaging their positions with neighboring vertices within a given radius.
 */
export const smoothBrush = (geometry, position, radius, strength) => {
  const positions = geometry.attributes.position;
  const tempPosition = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      let averagePosition = new Vector3();
      let count = 0;

      // Average position of nearby vertices
      for (let j = 0; j < positions.count; j++) {
        tempPosition.fromBufferAttribute(positions, j);
        if (tempPosition.distanceTo(vertex) < radius) {
          averagePosition.add(tempPosition);
          count++;
        }
      }

      if (count > 0) {
        averagePosition.divideScalar(count);
        vertex.lerp(averagePosition, strength); // Blend between current and average
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }
  }
  positions.needsUpdate = true;
};

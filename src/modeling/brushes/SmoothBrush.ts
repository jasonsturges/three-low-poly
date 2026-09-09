import { BufferGeometry, Vector3 } from "three";

/** Average positions in place within radius; sequential updates make results vertex-order dependent.
 * Normals and bounds remain stale; neighbor search is O(n²). */
export const smoothBrush = <T extends BufferGeometry>(
  geometry: T,
  position: Vector3,
  radius: number,
  strength: number
): void => {
  const positions = geometry.attributes.position;
  const tempPosition = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.distanceTo(position);

    if (distance < radius) {
      let averagePosition = new Vector3();
      let count = 0;

      for (let j = 0; j < positions.count; j++) {
        tempPosition.fromBufferAttribute(positions, j);
        if (tempPosition.distanceTo(vertex) < radius) {
          averagePosition.add(tempPosition);
          count++;
        }
      }

      if (count > 0) {
        averagePosition.divideScalar(count);
        vertex.lerp(averagePosition, strength);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }
  }
  positions.needsUpdate = true;
};

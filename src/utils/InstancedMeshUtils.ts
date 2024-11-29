import { Box3, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

export function centerInstancedMesh<T extends InstancedMesh>(mesh: T, offset: Vector3 = new Vector3(0, 0, 0)): void {
  mesh.computeBoundingBox();
  const box = mesh.boundingBox;

  if (box) {
    const center = box.getCenter(new Vector3());
    mesh.translateX(-center.x + offset.x);
    mesh.translateY(-center.y + offset.y);
    mesh.translateZ(-center.z + offset.z);
  }
}

/**
 * Align an entire InstancedMesh to a surface by adjusting its position.
 */
export function alignInstancedMeshToSurface(
  instancedMesh: InstancedMesh,
  targetPosition: Vector3,
  offset: Vector3 = new Vector3(0, 0, 0),
): void {
  // Compute the bounding box for the entire InstancedMesh
  const boundingBox = new Box3().setFromObject(instancedMesh);

  if (!boundingBox.isEmpty()) {
    // Find the bottom Y coordinate of the bounding box
    const minY = boundingBox.min.y;

    // Compute the adjustment needed to align the bottom of the InstancedMesh to the target position
    const adjustment = new Vector3(0, targetPosition.y - minY, 0).add(offset);

    // Apply the adjustment to the InstancedMesh position
    instancedMesh.position.add(adjustment);
  } else {
    console.warn("The InstancedMesh has no geometry or is not visible.");
  }
}

/**
 * Align a specific instance in an InstancedMesh to a surface.
 */
export function alignInstancedMeshIndexToSurface(
  instancedMesh: InstancedMesh,
  targetPosition: Vector3,
  instanceIndex: number,
  offset: Vector3 = new Vector3(0, 0, 0),
): void {
  const boundingBox = new Box3().setFromObject(instancedMesh);

  if (!boundingBox.isEmpty()) {
    const minY = boundingBox.min.y;

    // Get the instance's current transformation matrix
    const matrix = new Matrix4();
    instancedMesh.getMatrixAt(instanceIndex, matrix);

    // Decompose the matrix to extract position, rotation, and scale
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    matrix.decompose(position, quaternion, scale);

    // Adjust the position of the instance
    position.y = targetPosition.y - minY + offset.y;

    // Recompose the matrix and update the instance
    matrix.compose(position, quaternion, scale);
    instancedMesh.setMatrixAt(instanceIndex, matrix);

    // Mark the instance matrix as needing an update
    instancedMesh.instanceMatrix.needsUpdate = true;
  } else {
    console.warn("The instanced mesh has invalid geometry.");
  }
}

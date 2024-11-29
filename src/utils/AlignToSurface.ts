import { Box3, BufferGeometry, Float32BufferAttribute, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from "three";

//------------------------------
//  Object3D
//------------------------------

/**
 * Align an Object3D to a surface by adjusting its position.
 */
export function alignObjectToSurface(object: Object3D, targetPosition: Vector3, offset: Vector3 = new Vector3(0, 0, 0)): void {
  const boundingBox = new Box3().setFromObject(object);

  if (!boundingBox.isEmpty()) {
    const min = boundingBox.min;

    // Compute bottom center
    const bottomCenter = new Vector3((min.x + boundingBox.max.x) / 2, min.y, (min.z + boundingBox.max.z) / 2);

    // Calculate adjustment vector
    const adjustment = targetPosition.clone().sub(bottomCenter).add(offset);

    // Apply adjustment to object
    object.position.add(adjustment);
  } else {
    console.warn("The object has no geometry or is not visible.");
  }
}

//------------------------------
//  Buffer Geometry
//------------------------------

/**
 * Align a BufferGeometry to a surface by adjusting its vertices.
 */
export function alignBufferGeometryToSurface(geometry: BufferGeometry, targetPositionY: number): void {
  const boundingBox = new Box3().setFromBufferAttribute(new Float32BufferAttribute(geometry.attributes.position.array, 3));

  if (!boundingBox.isEmpty()) {
    const minY = boundingBox.min.y;

    // Translate the geometry to align the bottom to the target position
    geometry.translate(0, targetPositionY - minY, 0);
  } else {
    console.warn("The geometry is empty or invalid.");
  }
}

//------------------------------
//  Instanced Mesh
//------------------------------

/**
 * Align an InstancedMesh to a surface.
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

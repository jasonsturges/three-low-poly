import { DoubleSide, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from "three";
import { EllipticLeafGeometry } from "../geometry/leafs/EllipticLeafGeometry";

export class LeafEffect extends InstancedMesh {
  private dummyMatrix: Matrix4;
  private leafVelocities: Vector3[];

  constructor(numLeaves: number = 200) {
    const leafGeometry = new EllipticLeafGeometry();
    const leafMaterial = new MeshStandardMaterial({
      color: 0x88aa33,
      side: DoubleSide, // Leaves should be visible from both sides
      flatShading: true,
      metalness: 0.1,
      roughness: 0.8,
    });

    // Call the InstancedMesh constructor
    super(leafGeometry, leafMaterial, numLeaves);

    // Set up transformation matrices and velocities
    this.dummyMatrix = new Matrix4();
    this.leafVelocities = [];

    for (let i = 0; i < numLeaves; i++) {
      // Random position for each leaf
      const x = (Math.random() - 0.5) * 20;
      const y = Math.random() * 9 + 0.5;
      const z = (Math.random() - 0.5) * 20;

      // Random rotation
      const rotationX = (Math.random() - 0.5) * Math.PI;
      const rotationY = (Math.random() - 0.5) * Math.PI;
      const rotationZ = (Math.random() - 0.5) * Math.PI;

      // Set position and rotation for the instance
      this.dummyMatrix.makeRotationFromEuler(new Euler(rotationX, rotationY, rotationZ));
      this.dummyMatrix.setPosition(x, y, z);

      // Apply the transformation to the instance
      this.setMatrixAt(i, this.dummyMatrix);

      // Store velocity for animation purposes
      const velocity = new Vector3(
        (Math.random() - 0.5) * 0.01, // SpeedX
        -0.005, // SpeedY
        (Math.random() - 0.5) * 0.01, // SpeedZ
      );
      this.leafVelocities.push(velocity);
    }

    // Mark instance matrices as needing an update
    this.instanceMatrix.needsUpdate = true;
  }

  // Method to update leaf positions (e.g., for animation purposes)
  update(): void {
    for (let i = 0; i < this.count; i++) {
      const matrix = new Matrix4();
      this.getMatrixAt(i, matrix);

      const position = new Vector3();
      position.setFromMatrixPosition(matrix);

      // Update position using velocity
      const velocity = this.leafVelocities[i];
      position.add(velocity);

      // Reset leaf if it falls below the ground
      if (position.y < 0) {
        position.set((Math.random() - 0.5) * 20, Math.random() * 9 + 0.5, (Math.random() - 0.5) * 20);

        // Update velocity for new variability
        velocity.set((Math.random() - 0.5) * 0.01, -0.005, (Math.random() - 0.5) * 0.01);
      }

      // Set the updated position back to the matrix
      matrix.setPosition(position);
      this.setMatrixAt(i, matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

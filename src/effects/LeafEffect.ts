import { DoubleSide, Euler, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from "three";
import { EllipticLeafGeometry } from "../geometry/leafs/EllipticLeafGeometry";

export class LeafEffect extends Group {
  private leafGeometry: EllipticLeafGeometry;
  private leafMaterial: MeshStandardMaterial;
  private numLeaves: number;
  private leavesMesh: InstancedMesh;
  private dummyMatrix: Matrix4;
  private leafVelocities: Vector3[];

  constructor(numLeaves: number = 200) {
    super();

    // Create Leaf Geometry and Material
    this.leafGeometry = new EllipticLeafGeometry();
    this.leafMaterial = new MeshStandardMaterial({
      color: 0x88aa33,
      side: DoubleSide, // Leaves should be visible from both sides
      flatShading: true,
      metalness: 0.1,
      roughness: 0.8,
    });

    // Number of leaves to instance
    this.numLeaves = numLeaves;

    // Create an InstancedMesh
    this.leavesMesh = new InstancedMesh(this.leafGeometry, this.leafMaterial, this.numLeaves);

    // Set up transformation matrices for each instance
    this.dummyMatrix = new Matrix4();
    this.leafVelocities = []; // To store velocity data for each leaf

    for (let i = 0; i < this.numLeaves; i++) {
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
      this.leavesMesh.setMatrixAt(i, this.dummyMatrix);

      // Store velocity for animation purposes
      const velocity = new Vector3(
        (Math.random() - 0.5) * 0.01, // SpeedX
        -0.005, // SpeedY
        (Math.random() - 0.5) * 0.01, // SpeedZ
      );
      this.leafVelocities.push(velocity);
    }

    // Add the InstancedMesh to the group
    this.add(this.leavesMesh);
  }

  // Method to update leaf positions (e.g., for animation purposes)
  update(): void {
    for (let i = 0; i < this.numLeaves; i++) {
      const matrix = new Matrix4();
      this.leavesMesh.getMatrixAt(i, matrix);

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
      this.leavesMesh.setMatrixAt(i, matrix);
    }
    this.leavesMesh.instanceMatrix.needsUpdate = true;
  }
}

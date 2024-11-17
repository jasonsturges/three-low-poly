import { BufferGeometry, DoubleSide, Euler, InstancedMesh, Material, Matrix4, MeshStandardMaterial, Vector3 } from "three";
import { EllipticLeafGeometry } from "../geometry/leafs/EllipticLeafGeometry";

export interface LeafEffectOptions {
  geometry?: BufferGeometry;
  material?: Material;
  count?: number;
  width?: number;
  height?: number;
  depth?: number;
}

export class LeafEffect extends InstancedMesh {
  private dummyMatrix: Matrix4;
  private velocities: Vector3[];
  private width: number;
  private height: number;
  private depth: number;

  constructor(options: LeafEffectOptions = {}) {
    const {
      count = 200,
      width = 20,
      height = 10,
      depth = 20,
      geometry = new EllipticLeafGeometry(),
      material = new MeshStandardMaterial({
        color: 0x88aa33,
        metalness: 0.1,
        roughness: 0.8,
        flatShading: true,
        side: DoubleSide,
      }),
    } = options;

    super(geometry, material, count);

    this.dummyMatrix = new Matrix4();
    this.velocities = [];
    this.width = width;
    this.height = height;
    this.depth = depth;

    // Initialize instances
    for (let i = 0; i < count; i++) {
      // Random position within specified area
      const x = (Math.random() - 0.5) * width;
      const y = Math.random() * (height - 1) + 0.5;
      const z = (Math.random() - 0.5) * depth;

      // Random rotation
      const rotationX = (Math.random() - 0.5) * Math.PI;
      const rotationY = (Math.random() - 0.5) * Math.PI;
      const rotationZ = (Math.random() - 0.5) * Math.PI;

      // Set position and rotation
      this.dummyMatrix.makeRotationFromEuler(new Euler(rotationX, rotationY, rotationZ));
      this.dummyMatrix.setPosition(x, y, z);

      this.setMatrixAt(i, this.dummyMatrix);

      // Store velocity for animation
      const velocity = new Vector3((Math.random() - 0.5) * 0.01, -0.005, (Math.random() - 0.5) * 0.01);
      this.velocities.push(velocity);
    }

    this.instanceMatrix.needsUpdate = true;
  }

  public update(): void {
    for (let i = 0; i < this.count; i++) {
      const matrix = new Matrix4();
      this.getMatrixAt(i, matrix);

      const position = new Vector3();
      position.setFromMatrixPosition(matrix);

      // Update position
      const velocity = this.velocities[i];
      position.add(velocity);

      // Reset position if below ground
      if (position.y < 0) {
        position.set(
          (Math.random() - 0.5) * this.width,
          Math.random() * (this.height - 1) + 0.5,
          (Math.random() - 0.5) * this.depth,
        );

        // Update velocity
        velocity.set((Math.random() - 0.5) * 0.01, -0.005, (Math.random() - 0.5) * 0.01);
      }

      matrix.setPosition(position);
      this.setMatrixAt(i, matrix);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

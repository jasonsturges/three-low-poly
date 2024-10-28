import { BufferGeometry, Float32BufferAttribute } from "three";

class SimpleLeafGeometry extends BufferGeometry {
  constructor(size = 0.1) {
    super();

    const vertices = [];
    const indices = [];

    // Define vertices to approximate a simple, elongated, oval leaf shape
    const leafPoints = [
      [0, 1],         // Top point
      [0.5, 0.75],    // Right upper middle
      [0.75, 0.25],   // Right lower middle
      [0.5, -0.5],    // Right bottom middle
      [0, -1],        // Bottom point
      [-0.5, -0.5],   // Left bottom middle
      [-0.75, 0.25],  // Left lower middle
      [-0.5, 0.75],   // Left upper middle
    ];

    // Add vertices to the geometry, scaling them with the `size` parameter
    for (let i = 0; i < leafPoints.length; i++) {
      const [x, y] = leafPoints[i];
      vertices.push(x * size, y * size, 0);
    }

    // Define indices to form triangular faces of the leaf
    // Create a fan-like structure connecting the top vertex (index 0) to other neighboring vertices
    for (let i = 1; i < leafPoints.length - 1; i++) {
      indices.push(0, i, i + 1);
    }
    // Close the fan with the last triangle
    indices.push(0, leafPoints.length - 1, 1);

    // Convert the vertices and indices to buffer attributes
    const positionAttribute = new Float32BufferAttribute(vertices, 3);
    this.setAttribute('position', positionAttribute);
    this.setIndex(indices);

    this.computeVertexNormals();
  }
}

export { SimpleLeafGeometry };

import { BufferGeometry, Float32BufferAttribute } from "three";

class DioramaGeometry extends BufferGeometry {
  constructor(width = 5, height = 3, depth = 5, wallThickness = 0.2) {
    super();

    // Vertices array (each set of 3 numbers represents x, y, z of a vertex)
    const vertices = [
      // Floor vertices
      -width / 2, 0, -depth / 2,  // 0
      width / 2, 0, -depth / 2,  // 1
      width / 2, 0,  depth / 2,  // 2
      -width / 2, 0,  depth / 2,  // 3

      // Back wall vertices
      -width / 2, 0, -depth / 2,  // 4
      width / 2, 0, -depth / 2,  // 5
      width / 2, height, -depth / 2,  // 6
      -width / 2, height, -depth / 2,  // 7

      // Left wall vertices
      -width / 2, 0, -depth / 2,  // 8
      -width / 2, 0,  depth / 2,  // 9
      -width / 2, height,  depth / 2,  // 10
      -width / 2, height, -depth / 2,  // 11
    ];

    // Indices array (each set of 3 numbers represents a triangle)
    const indices = [
      // Floor
      0, 1, 2,
      0, 2, 3,

      // Back wall
      4, 5, 6,
      4, 6, 7,

      // Left wall
      8, 9, 10,
      8, 10, 11,
    ];

    // Create BufferAttribute for vertices and indices
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals(); // Compute normals for proper lighting
  }
}

export { DioramaGeometry }

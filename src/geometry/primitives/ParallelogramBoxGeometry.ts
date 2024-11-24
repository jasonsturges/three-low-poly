import { BufferAttribute, BufferGeometry } from "three";

/**
 * Prismatic parallelogram, with horizontal skew (offset in X for the slant).
 */
export class ParallelogramBoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 2, depth = 0.5, angle = Math.PI / 6) {
    super();

    const s = height * Math.tan(angle); // skew
    const w = width;
    const h = height;
    const d = depth;

    // Bottom face vertices (X, Y, Z)
    const vertices = [
      -w / 2, -h / 2, d / 2,              // Bottom-left
      w / 2, -h / 2, d / 2,               // Bottom-right
      w / 2 + s / 2, h / 2, d / 2,        // Top-right
      -w / 2 + s / 2, h / 2, d / 2,       // Top-left

      w / 2, -h / 2, -d / 2,              // Back face
      -w / 2, -h / 2, -d / 2,
      -w / 2 + s / 2, h / 2, -d / 2,
      w / 2 + s / 2, h / 2, -d / 2,

      -w / 2, -h / 2, -d / 2,             // Left face
      -w / 2, -h / 2, d / 2,
      -w / 2 + s / 2, h / 2, d / 2,
      -w / 2 + s / 2, h / 2, -d / 2,

      w / 2, -h / 2, d / 2,               // Right face
      w / 2, -h / 2, -d / 2,
      w / 2 + s / 2, h / 2, -d / 2,
      w / 2 + s / 2, h / 2, d / 2,

      -w / 2 + s / 2, h / 2, d / 2,       // Top face
      w / 2 + s / 2, h / 2, d / 2,
      w / 2 + s / 2, h / 2, -d / 2,
      -w / 2 + s / 2, h / 2, -d / 2,

      -w / 2, -h / 2, -d / 2,             // Bottom face
      w / 2, -h / 2, -d / 2,
      w / 2, -h / 2, d / 2,
      -w / 2, -h / 2, d / 2,
    ];

    const normals = [
      0, 0, 1,    0, 0, 1,     0, 0, 1,    0, 0, 1,   // Front face
      0, 0, -1,   0, 0, -1,    0, 0, -1,   0, 0, -1,  // Back face
      -1, 0, 0,   -1, 0, 0,   -1, 0, 0,   -1, 0, 0,   // Left face
      1, 0, 0,    1, 0, 0,     1, 0, 0,    1, 0, 0,   // Right face
      0, 1, 0,    0, 1, 0,     0, 1, 0,    0, 1, 0,   // Top face
      0, -1, 0,   0, -1, 0,    0, -1, 0,   0, -1, 0,  // Bottom face
    ]

    // Define indices for faces (triangles)
    const indices = [
      0, 1, 2,      2, 3, 0,     // Front face
      4, 5, 6,      6, 7, 4,     // Back face
      8, 9, 10,     10, 11, 8,   // Left face
      12, 13, 14,   14, 15, 12,  // Right face
      16, 17, 18,   18, 19, 16,  // Top face
      20, 21, 22,   22, 23, 20,  // Bottom face
    ];

    // Define UV coordinates
    const uvs = new Float32Array([
      0, 0,   1, 0,   1, 1,   0, 1,  // Front face UVs
      0, 0,   1, 0,   1, 1,   0, 1,  // Back face UVs
      0, 0,   1, 0,   1, 1,   0, 1,  // Left face UVs
      0, 0,   1, 0,   1, 1,   0, 1,  // Right face UVs
      0, 0,   1, 0,   1, 1,   0, 1,  // Top face UVs
      0, 0,   1, 0,   1, 1,   0, 1,  // Bottom face UVs
    ]);

    const positions = new Float32Array(vertices);
    const normalArray = new Float32Array(normals);
    const uvArray = new Float32Array(uvs);
    const indexArray = new Uint16Array(indices);

    this.setAttribute('position', new BufferAttribute(positions, 3));
    this.setAttribute('normal', new BufferAttribute(normalArray, 3));
    this.setAttribute('uv', new BufferAttribute(uvArray, 2));
    this.setIndex(new BufferAttribute(indexArray, 1));
  }
}

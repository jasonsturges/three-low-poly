import { BufferAttribute, BufferGeometry } from "three";

/**
 * Single brick geometry for low-poly aesthetic.
 * Default dimensions approximate standard brick proportions (in feet scale).
 */
export class BrickGeometry extends BufferGeometry {
  constructor({
    width = 0.8,
    height = 0.3,
    depth = 0.4,
  } = {}) {
    super();

    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    const positions = new Float32Array([
      // Front face
      -w, -h, d,      // 0
      w, -h, d,       // 1
      w, h, d,        // 2
      -w, h, d,       // 3

      // Back face
      -w, -h, -d,     // 4
      w, -h, -d,      // 5
      w, h, -d,       // 6
      -w, h, -d,      // 7

      // Left face
      -w, -h, -d,     // 8
      -w, -h, d,      // 9
      -w, h, d,       // 10
      -w, h, -d,      // 11

      // Right face
      w, -h, d,       // 12
      w, -h, -d,      // 13
      w, h, -d,       // 14
      w, h, d,        // 15

      // Top face
      -w, h, d,       // 16
      w, h, d,        // 17
      w, h, -d,       // 18
      -w, h, -d,      // 19

      // Bottom face
      -w, -h, d,      // 20
      w, -h, d,       // 21
      w, -h, -d,      // 22
      -w, -h, -d,     // 23
    ]);

    const normals = new Float32Array([
      // Front face
      0, 0, 1,    0, 0, 1,    0, 0, 1,    0, 0, 1,

      // Back face
      0, 0, -1,   0, 0, -1,   0, 0, -1,   0, 0, -1,

      // Left face
      -1, 0, 0,   -1, 0, 0,   -1, 0, 0,   -1, 0, 0,

      // Right face
      1, 0, 0,    1, 0, 0,    1, 0, 0,    1, 0, 0,

      // Top face
      0, 1, 0,    0, 1, 0,    0, 1, 0,    0, 1, 0,

      // Bottom face
      0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0,
    ]);

    const indices = new Uint16Array([
      // Front face
      0, 1, 2,    2, 3, 0,

      // Back face
      5, 4, 7,    7, 6, 5,

      // Left face
      9, 8, 11,   11, 10, 9,

      // Right face
      12, 13, 14,   14, 15, 12,

      // Top face
      16, 17, 18,   18, 19, 16,

      // Bottom face
      21, 20, 23,   23, 22, 21,
    ]);

    const uvs = new Float32Array([
      // Front face
      0, 0,   1, 0,   1, 1,   0, 1,

      // Back face
      0, 0,   1, 0,   1, 1,   0, 1,

      // Left face
      0, 0,   1, 0,   1, 1,   0, 1,

      // Right face
      0, 0,   1, 0,   1, 1,   0, 1,

      // Top face
      0, 0,   1, 0,   1, 1,   0, 1,

      // Bottom face
      0, 0,   1, 0,   1, 1,   0, 1,
    ]);

    this.setAttribute("position", new BufferAttribute(positions, 3));
    this.setAttribute("normal", new BufferAttribute(normals, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));
    this.setIndex(new BufferAttribute(indices, 1));
  }
}

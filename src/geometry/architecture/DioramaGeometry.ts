import { BufferAttribute, BufferGeometry } from "three";

/**
 * Geometry for a diorama with a floor and walls.
 *
 * Group indices:
 * 0: Interior walls
 * 1: Floor
 * 2: Exterior walls
 */
export class DioramaGeometry extends BufferGeometry {
  constructor({ width = 5, height = 3, depth = 5, wallThickness = 0.05 } = {}) {
    super();

    const w = width;
    const h = height;
    const d = depth;
    const t = wallThickness;

    const vertices = [
      0, 0, 0,      w, 0, 0,      w, h, 0,     0, h, 0,     // Back wall
      0, 0, d,      0, 0, 0,      0, h, 0,     0, h, d,     // Left wall
      0, 0, d,      w, 0, d,      w, 0, 0,     0, 0, 0,     // Floor
      -t, -t, d,    w, -t, d,     w, 0, d,     0, 0, d,     // Floor front
      w, -t, d,     w, -t, -t,    w, 0, 0,     w, 0, d,     // Floor side
      -t, -t, d,    0, 0, d,  0,  h, d,        -t, h, d,    // Left wall side
      w, 0, 0,      w, -t, -t,    w, h, -t,    w, h, 0,     // Back wall side
      -t, h, d,     0, h, d,      0, h, 0,     -t, h, -t,   // Ceiling left
      0, h, 0,      w, h, 0,      w, h, -t,    -t, h, -t,   // Ceiling right
      -t, -t, -t,   w, -t, -t,    w, -t, d,    -t, -t, d,   // Floor backside
      -t, -t, -t,   -t, -t, d,    -t, h, d,    -t, h, -t,   // Left wall backside
      w, -t, -t,    -t, -t, -t,   -t, h, -t,   w, h, -t,    // back wall backside
    ];

    const indices = [
      0, 1, 3,      1, 2, 3,      // Back wall
      4,  5,  7,    5,  6,  7,    // Left wall
      8,  9, 11,    9, 10, 11,    // Floor
      12, 13, 15,   13, 14, 15,   // Floor (side: front)
      16, 17, 19,   17, 18, 19,   // Floor (side: right)
      20, 21, 23,   21, 22, 23,   // Left wall (side: front)
      24, 25, 27,   25, 26, 27,   // Back wall (side: right)
      28, 29, 31,   29, 30, 31,   // Left wall (side: top)
      32, 33, 35,   33, 34, 35,   // Back wall (side: top)
      36, 37, 39,   37, 38, 39,   // Floor backside
      40, 41, 43,   41, 42, 43,   // Left wall backside
      44, 45, 47,   45, 46, 47,   // Back wall backside
    ];

    const normals = [
      0, 0, 1,    0, 0, 1,    0, 0, 1,    0, 0, 1,    // Back wall
      1, 0, 0,    1, 0, 0,    1, 0, 0,    1, 0, 0,    // Left wall
      0, 1, 0,    0, 1, 0,    0, 1, 0,    0, 1, 0,    // Floor
      0, 0, 1,    0, 0, 1,    0, 0, 1,    0, 0, 1,    // Floor (side: front)
      1, 0, 0,    1, 0, 0,    1, 0, 0,    1, 0, 0,    // Floor (side: right)
      0, 0, 1,    0, 0, 1,    0, 0, 1,    0, 0, 1,    // Left wall (side: front)
      1, 0, 0,    1, 0, 0,    1, 0, 0,    1, 0, 0,    // Back wall (side: right)
      0, 1, 0,    0, 1, 0,    0, 1, 0,    0, 1, 0,    // Left wall (side: top)
      0, 1, 0,    0, 1, 0,    0, 1, 0,    0, 1, 0,    // Back wall (side: top)
      0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0,   // Floor backside
      -1, 0, 0,   -1, 0, 0,   -1 ,0, 0,   -1, 0, 0,   // Left wall backside
      0, 0, -1,   0, 0, -1,   0, 0, -1,   0, 0, -1,   // Back wall backside
    ];

    const uvs = [
      0.5, 0,       1, 0,         1, 1,     0.5, 1,       // Back wall
      0, 0,         0.5, 0,       0.5, 1,   0, 1,         // Left wall
      0, 0,         1, 0,         1, 1,     0, 1,         // Floor
      0, 0,         1, 0,         1, t/w,   0, t/w,       // Floor (side: front)
      0, 0,         1, 0,         1, t/w,   0, t/w,       // Floor (side: right)
      0, 0,         t/w, 0,       t/w, 1,   0, 1,         // Left wall (side: front)
      1-(t/w), 0,   1, 0,         1, 1,     1-(t/w), 1,   // Back wall (side: right)
      0, 0,         t/w, 0,       t/w, 1,   0, 1,         // Left wall (side: top)
      0, 1-(t/w),   1, 1-(t/w),   1, 1,     0, 1,         // Back wall (side: top)
      0, 0,         1, 0,         1, 1,     0, 1,         // Floor backside
      0, 0,         1, 0,         1, 1,     0, 1,         // Left wall backside
      0, 0,         1, 0,         1, 1,     0, 1,         // Back wall backside
    ];

    const positions = new Float32Array(vertices);
    const normalArray = new Float32Array(normals);
    const uvArray = new Float32Array(uvs);

    this.setAttribute('position', new BufferAttribute(positions, 3));
    this.setAttribute('normal', new BufferAttribute(normalArray, 3));
    this.setAttribute('uv', new BufferAttribute(uvArray, 2));
    this.setIndex(indices);

    this.addGroup(0, 12, 0);   // Interior walls
    this.addGroup(12, 6, 1);   // Floor
    this.addGroup(18, 54, 2);  // Exterior walls
  }
}


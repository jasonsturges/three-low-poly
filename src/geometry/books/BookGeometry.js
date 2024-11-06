import { BoxGeometry, BufferAttribute, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export class BookGeometry extends BufferGeometry {
  constructor(width = 1, height = 1.5, depth = 0.5, coverThickness = 0.05, pageIndent = 0.05) {
    super();

    const w = width;
    const h = height;
    const d = depth;
    const t = coverThickness;
    const i = pageIndent;

    const vertices = [
      // Front cover
      0, 0, 0,
      w, 0, 0,
      w, h, 0,
      0, h, 0,

      // Back cover
      w, 0, -d,
      0, 0, -d,
      0, h, -d,
      w, h, -d,

      // Spine
      0, 0, -d,
      0, 0,  0,
      0, h,  0,
      0, h, -d,

      // Inside front cover
      w, 0, -t,
      t, 0, -t,
      t, h, -t,
      w, h, -t,

      // Inside back cover
      t, 0, -d + t,
      w, 0, -d + t,
      w, h, -d + t,
      t, h, -d + t,

      // Inside spine
      t, 0, -t,
      t, 0, -d + t,
      t, h, -d + t,
      t, h, -t,

      // Front cover top
      0, h,  0,
      w, h,  0,
      w, h, -t,
      t, h, -t,

      // Back cover top
      0, h, -d,
      t, h, -d + t,
      w, h, -d + t,
      w, h, -d,

      // Spine cover top
      0, h,  0,
      t, h, -t,
      t, h, -d + t,
      0, h, -d,

      // Front cover bottom
      0, 0,  0,
      t, 0, -t,
      w, 0, -t,
      w, 0,  0,

      // Back cover bottom
      0, 0, -d,
      w, 0, -d,
      w, 0, -d + t,
      t, 0, -d + t,

      // Spine cover bottom
      0, 0,  0,
      0, 0, -d,
      t, 0, -d + t,
      t, 0, -t,

      // Front cover edge
      w, 0,  0,
      w, 0, -t,
      w, h, -t,
      w, h,  0,

      // Back cover edge
      w, 0, -d,
      w, h, -d,
      w, h, -d + t,
      w, 0, -d + t,
    ];



    const normals = [
       0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   // Front cover
       0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   // Back cover
      -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,   // Spine
       0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   // Inside front cover
       0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   // Inside back cover
       1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   // Inside spine
       0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   // Front cover top
       0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   // Back cover top
       0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   // Spine cover top
       0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   // Front cover bottom
       0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   // Back cover bottom
       0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   // Spine cover bottom
       1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   // Front cover edge
       1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   // Back cover edge
    ];

    const u1 = width / ((width * 2) + depth);
    const u2 = (width + depth) / ((width * 2) + depth);

    const uvs = [
      u2,0,   1,0,   1,1,  u2,1,   // Front cover
       0,0,  u1,0,  u1,1,   0,1,   // Back cover
      u1,0,  u2,0,  u2,1,  u1,1,   // Spine
       1,0,  u2,0,  u2,1,   1,1,   // Inside front cover
      u1,0,   0,0,   0,1,  u1,1,   // Inside back cover
      u2,0,  u1,0,  u1,1,  u2,1,   // Inside spine
      u2,0,   1,0,   1,1,  u2,1,   // Front cover top
       0,0,   1,0,   1,1,   0,1,   // Back cover top
       0,0,   1,0,   1,1,   0,1,   // Spine cover top
       0,0,   1,0,   1,1,   0,1,   // Front cover bottom
       0,0,   1,0,   1,1,   0,1,   // Back cover bottom
       0,0,   1,0,   1,1,   0,1,   // Spine cover bottom
       0,0,   1,0,   1,1,   0,1,   // Front cover edge
       0,0,   1,0,   1,1,   0,1,   // Back cover edge
    ];

    const indices = [
       0,  1,  2,   0,  2,  3,  // Front cover face
       4,  5,  6,   4,  6,  7,  // Back cover face
       8,  9, 10,   8, 10, 11,  // Spine face
      12, 13, 14,  12, 14, 15,  // Inside front cover
      16, 17, 18,  16, 18, 19,  // Inside back cover
      20, 21, 22,  20, 22, 23,  // Inside spine
      24, 25, 26,  24, 26, 27,  // Front cover top
      28, 29, 30,  28, 30, 31,  // Back cover top
      32, 33, 34,  32, 34, 35,  // Spine cover top
      36, 37, 38,  36, 38, 39,  // Front cover bottom
      40, 41, 42,  40, 42, 43,  // Back cover bottom
      44, 45, 46,  44, 46, 47,  // Spine cover bottom
      48, 49, 50,  48, 50, 51,  // Front cover edge
      52, 53, 54,  52, 54, 55,  // Back cover edge
    ];

    const positions = new Float32Array(vertices);
    const normalArray = new Float32Array(normals);
    const uvArray = new Float32Array(uvs);
    const indexArray = new Uint16Array(indices);

    const coverGeometry = new BufferGeometry();
    coverGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    coverGeometry.setAttribute('normal', new BufferAttribute(normalArray, 3));
    coverGeometry.setAttribute('uv', new BufferAttribute(uvArray, 2));
    coverGeometry.setIndex(new BufferAttribute(indexArray, 1));

    const pagesGeometry = new BoxGeometry(width - t - i, h - i * 2, d - t * 2);
    pagesGeometry.translate((width - t - i) / 2 + t, h / 2, -d / 2 );
    this.copy(mergeGeometries([coverGeometry, pagesGeometry], true));
  }
}

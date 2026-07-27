import { BufferGeometry, Float32BufferAttribute } from "three";

export interface LeafGeometryOptions {
  /** Overall leaf scale. Defaults to `0.13`. */
  size?: number;
  /** Midrib rise above the rim as a fraction of size. Defaults to `0.22`. */
  lift?: number;
}

/**
 * Low-poly folded leaf — a pointed ellipse with a gently raised midrib so it
 * catches rim light instead of reading as a flat sliver. Spine vertices sit
 * slightly above the mirrored rim outline, giving a soft V cross-section under
 * flat shading.
 *
 * Local frame: tip at +Y, base at −Y, fold rises along +Z.
 */
export class LeafGeometry extends BufferGeometry {
  readonly size: number;
  readonly lift: number;

  constructor({ size = 0.13, lift = 0.22 }: LeafGeometryOptions = {}) {
    super();

    this.size = size;
    this.lift = lift;

    // Outline pairs (rim) running tip → base down each side, plus a raised spine.
    const half: [number, number][] = [
      [0.0, 1.0],
      [0.34, 0.55],
      [0.42, 0.05],
      [0.3, -0.45],
      [0.0, -1.0],
    ];

    const verts: number[] = [];
    const idx: number[] = [];

    const spine: number[] = [];
    for (let i = 0; i < half.length; i++) {
      const [, y] = half[i];
      spine.push(verts.length / 3);
      verts.push(0, y * size, lift * size * (1 - Math.abs(y)));
    }

    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < half.length; i++) {
      const [x, y] = half[i];
      right.push(verts.length / 3);
      verts.push(x * size, y * size, 0);
      left.push(verts.length / 3);
      verts.push(-x * size, y * size, 0);
    }

    for (let i = 0; i < half.length - 1; i++) {
      idx.push(spine[i], right[i], right[i + 1], spine[i], right[i + 1], spine[i + 1]);
      idx.push(spine[i], spine[i + 1], left[i + 1], spine[i], left[i + 1], left[i]);
    }

    this.setAttribute("position", new Float32BufferAttribute(verts, 3));
    this.setIndex(idx);
    this.computeVertexNormals();
    this.computeBoundingSphere();
  }
}
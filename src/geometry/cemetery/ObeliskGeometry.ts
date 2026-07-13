import { BufferGeometry } from "three";
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec3 } from "../../utils/GeometryBuffers";

export interface ObeliskGeometryOptions {
  /** Width of the shaft at its foot. Defaults to `0.5`. */
  baseWidth?: number;
  /** Width of the shaft at the shoulder, where the cap begins — the taper. Defaults to `0.34`. */
  topWidth?: number;
  /** Height of the shaft, below the cap. Defaults to `2.2`. */
  shaftHeight?: number;
  /** Height of the pyramidion. Defaults to `0.45`. */
  capHeight?: number;
}

/**
 * Obelisk — a tapered four-sided shaft rising to a pyramidion. The tall Victorian monument that stands
 * over a family plot.
 *
 * Three rings of vertices, and that is the whole model:
 *
 * ```text
 *                    apex            1 vertex
 *                   /    \
 *                  /      \          4 CAP TRIANGLES
 *                 /________\
 *                |          |        shoulder — 4 vertices
 *                |          |
 *                |          |        4 SIDE QUADS (trapezoids: the taper)
 *                |          |
 *                |__________|        base — 4 vertices
 * ```
 *
 * Fourteen triangles, counting the closed foot. The cap faces are triangles because they close to a single point — a quad would
 * need the apex twice.
 *
 * The side UVs INSET at the top by exactly the ratio the geometry tapers. A triangle interpolates UVs
 * linearly, so the four (position → uv) pairs must lie on ONE affine map, or the quad's two triangles
 * solve for different maps and the texture creases visibly along the diagonal. Stretching a trapezoid
 * to fill a 0–1 square is a projective transform, which triangles cannot represent.
 *
 * Distinct from {@link ObeliskHeadstoneGeometry}, which is a *stepped* stack of boxes. This one is a
 * single tapered shaft.
 *
 * Local frame: base on Y=0, centered on X/Z.
 *
 * @example
 * ```ts
 * const geometry = new ObeliskGeometry({ shaftHeight: 2.6 });
 * ```
 */
export class ObeliskGeometry extends BufferGeometry {
  readonly totalHeight: number;
  readonly baseWidth: number;

  constructor({
    baseWidth = 0.5,
    topWidth = 0.34,
    shaftHeight = 2.2,
    capHeight = 0.45,
  }: ObeliskGeometryOptions = {}) {
    super();

    this.baseWidth = baseWidth;
    this.totalHeight = shaftHeight + capHeight;

    const buffers = createGeometryBuffers();

    const b = baseWidth / 2;
    const t = topWidth / 2;

    // Walk the four corners in one consistent direction around the shaft. Every face is then built the
    // same way — corner i, corner i+1 — and the winding comes out right without thinking about it.
    const corners: [number, number][] = [
      [+1, +1],
      [+1, -1],
      [-1, -1],
      [-1, +1],
    ];

    const base: Vec3[] = corners.map(([sx, sz]) => [sx * b, 0, sz * b]);
    const shoulder: Vec3[] = corners.map(([sx, sz]) => [sx * t, shaftHeight, sz * t]);
    const apex: Vec3 = [0, shaftHeight + capHeight, 0];

    // How far the top edge of a side pulls in from the bottom, as a fraction of the bottom's width.
    const inset = (1 - topWidth / baseWidth) / 2;

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;

      // A trapezoid, wider at the foot than the shoulder. The normal is deliberately left undefined:
      // a tapered face is slanted, so there is no axis-aligned normal to hand over, and `pushQuad`
      // derives it from the winding — exactly the case `faceNormal` exists for.
      pushQuad(
        buffers,
        [base[i]!, base[next]!, shoulder[next]!, shoulder[i]!],
        undefined,
        [
          [0, 0],
          [1, 0],
          [1 - inset, 1],
          [inset, 1],
        ],
      );

      // The cap closes to the apex, so its UV sits at the top center — the texture converges to a
      // point the way the geometry does.
      pushTriangle(
        buffers,
        [shoulder[i]!, shoulder[next]!, apex],
        undefined,
        [
          [0, 0],
          [1, 0],
          [0.5, 1],
        ],
      );
    }

    // The foot is closed. A monument standing on flat ground never shows its underside — but the
    // headstone factory LEANS and sinks its stones, and a leaning obelisk with an open base is a
    // hole you can see straight up. Two triangles is cheaper than a rule about how it may be used.
    pushQuad(buffers, [base[0]!, base[3]!, base[2]!, base[1]!], undefined);

    this.copy(toBufferGeometry(buffers));
  }
}

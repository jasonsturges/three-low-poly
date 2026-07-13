import {
  ColorRepresentation,
  DoubleSide,
  GridHelper,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";

export interface GroundGridOptions {
  /** Square extent of the floor and grid, in world units. Defaults to `24`. */
  size?: number;
  /** Grid divisions across `size`. Defaults to `size` (one cell per unit). */
  divisions?: number;
  /** Solid floor tint. Defaults to `0x1a2430`. */
  planeColor?: ColorRepresentation;
  /** Grid line color. Defaults to `0x223344`. */
  gridColor?: ColorRepresentation;
  /** Center cross-line color. Defaults to `0x334455`. */
  centerColor?: ColorRepresentation;
  /** World Y of the floor. Defaults to `0`. */
  y?: number;
}

/**
 * A reference floor — a shadow-receiving plane with a coplanar {@link GridHelper}, ready to
 * `scene.add()`. A development aid for placing and scaling objects, not scene content.
 *
 * **The grid and the plane are exactly coplanar and do not z-fight.** Put a `GridHelper` on a plane at
 * the same Y and the depth buffer cannot separate them: the two surfaces round to the same depth and
 * the lines tear and shimmer as the camera moves. The usual workaround is to lift the grid by some
 * epsilon, which trades one bug for a subtler one — the lines float, visibly so at grazing angles, and
 * the epsilon has to be retuned every time the scene changes scale.
 *
 * The real fix is to bias the DEPTH rather than the position. The plane's material sets
 * `polygonOffset`, which pushes its fill back in the depth buffer *without moving it in space* — and
 * polygon offset does not apply to lines, so the grid stays exactly where it is and simply wins the
 * depth test. Perfectly coplanar, no tearing, no geometric lift, at any scale.
 *
 * A {@link Group}, because a `Mesh` and a `GridHelper` cannot merge into one object. Shadow receipt is
 * configured on the plane, where it belongs.
 *
 * @example
 * ```ts
 * const floor = new GroundGrid({ size: 16, planeColor: 0x1c2428 });
 * scene.add(floor);
 * // toggle both together: floor.visible = false;
 * // release GPU resources:  floor.dispose();
 * ```
 */
export class GroundGrid extends Group {
  readonly plane: Mesh<PlaneGeometry, MeshStandardMaterial>;
  readonly grid: GridHelper;

  constructor({
    size = 24,
    divisions = size,
    planeColor = 0x1a2430,
    gridColor = 0x223344,
    centerColor = 0x334455,
    y = 0,
  }: GroundGridOptions = {}) {
    super();

    this.plane = new Mesh(
      new PlaneGeometry(size, size),
      new MeshStandardMaterial({
        color: planeColor,
        roughness: 1,
        metalness: 0,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.receiveShadow = true;
    this.add(this.plane);

    this.grid = new GridHelper(size, divisions, centerColor, gridColor);
    this.add(this.grid);

    this.position.y = y;
  }

  /** Dispose the plane and grid geometry/material. */
  dispose(): void {
    this.plane.geometry.dispose();
    this.plane.material.dispose();
    this.grid.geometry.dispose();
    const gridMaterial = this.grid.material as Material | Material[];
    (Array.isArray(gridMaterial) ? gridMaterial : [gridMaterial]).forEach((m) => m.dispose());
  }
}

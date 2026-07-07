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
 * Reference floor for example scenes — a shadow-receiving plane with a coplanar
 * {@link GridHelper}, ready to `scene.add()`.
 *
 * The plane's material uses `polygonOffset` so its fill is biased back in the
 * depth buffer while the grid lines (which polygon offset does not affect) sit
 * cleanly in front. The two stay perfectly coplanar with no z-fighting and no
 * geometric lift — the correct fix for coplanar opaque overlays.
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

import { BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import {
  buildDiamondLatticeParts,
  diamondLatticeGridFromCells,
  type DiamondLatticeGrid,
} from "./diamondLattice";

export interface DiamondLatticeWindowGeometryOptions {
  /** Opening width (world units). */
  width?: number;
  /** Opening height (world units). */
  height?: number;
  /** Lead came thickness (cross-section). Defaults to `0.055`. */
  leadThickness?: number;
  /** Lead depth (Z extent). Defaults to `0.11`. */
  leadDepth?: number;
  /** Quarrels spanning east–west across the opening. Defaults to `10`. */
  cellsX?: number;
  /** Quarrels spanning north–south across the opening. Defaults to `10`. */
  cellsY?: number;
  /** Vertical center of the opening in local geometry space. Defaults to `0`. */
  centerY?: number;
}

/**
 * Diamond lattice window — outer frame plus diagonal cames.
 * Quarrel tips align to the vertical and horizontal axes (`<>`).
 * Built in the XY plane facing +Z.
 *
 * Glass is a separate pane on {@link DiamondLatticeWindow} — this geometry is
 * lead and frame only (casts shadow; glass typically does not).
 */
export class DiamondLatticeWindowGeometry extends BufferGeometry {
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: DiamondLatticeGrid;

  constructor({
    width = 4.5,
    height = 5.5,
    leadThickness = 0.055,
    leadDepth = 0.11,
    cellsX = 10,
    cellsY = 10,
    centerY = 0,
  }: DiamondLatticeWindowGeometryOptions = {}) {
    super();

    this.cellsX = Math.max(1, Math.round(cellsX));
    this.cellsY = Math.max(1, Math.round(cellsY));
    this.fittedGrid = diamondLatticeGridFromCells(width, height, this.cellsX, this.cellsY);

    const parts = buildDiamondLatticeParts({
      width,
      height,
      centerY,
      grid: this.fittedGrid,
      leadThickness,
      leadDepth,
    });

    const merged = mergeBufferGeometries(parts);
    if (!merged) throw new Error("DiamondLatticeWindowGeometry: merge failed");

    this.copy(merged);
    merged.dispose();
    for (const part of parts) part.dispose();
  }
}
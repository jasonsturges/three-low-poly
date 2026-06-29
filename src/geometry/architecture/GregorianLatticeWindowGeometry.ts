import { BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import {
  buildGregorianLatticeParts,
  gregorianLatticeGridFromCells,
  type GregorianLatticeGrid,
} from "./gregorianLattice";

export interface GregorianLatticeWindowGeometryOptions {
  /** Opening width (world units). */
  width?: number;
  /** Opening height (world units). */
  height?: number;
  /** Mullion thickness (cross-section). Defaults to `0.055`. */
  mullionThickness?: number;
  /** Mullion depth (Z extent). Defaults to `0.11`. */
  mullionDepth?: number;
  /** Rectangular panes across the opening width. Defaults to `4`. */
  cellsX?: number;
  /** Rectangular panes up the opening height. Defaults to `6`. */
  cellsY?: number;
  /** Vertical center of the opening in local geometry space. Defaults to `0`. */
  centerY?: number;
}

/**
 * Gregorian lattice window — outer frame plus orthogonal mullions in a rectangular grid.
 * Built in the XY plane facing +Z.
 */
export class GregorianLatticeWindowGeometry extends BufferGeometry {
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: GregorianLatticeGrid;

  constructor({
    width = 4.5,
    height = 5.5,
    mullionThickness = 0.055,
    mullionDepth = 0.11,
    cellsX = 4,
    cellsY = 6,
    centerY = 0,
  }: GregorianLatticeWindowGeometryOptions = {}) {
    super();

    this.cellsX = Math.max(1, Math.round(cellsX));
    this.cellsY = Math.max(1, Math.round(cellsY));
    this.fittedGrid = gregorianLatticeGridFromCells(width, height, this.cellsX, this.cellsY);

    const parts = buildGregorianLatticeParts({
      width,
      height,
      centerY,
      cellsX: this.cellsX,
      cellsY: this.cellsY,
      mullionThickness,
      mullionDepth,
    });

    const merged = mergeBufferGeometries(parts);
    if (!merged) throw new Error("GregorianLatticeWindowGeometry: merge failed");

    this.copy(merged);
    merged.dispose();
    for (const part of parts) part.dispose();
  }
}
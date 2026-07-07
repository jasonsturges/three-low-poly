import { BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import {
  archedOpeningMetrics,
  buildArchedDiamondLatticeCameParts,
  diamondLatticeGridFromCells,
  type ArchedOpeningMetrics,
  type DiamondLatticeGrid,
} from "./diamondLattice";

export interface ArchedDiamondLatticeWindowGeometryOptions {
  /** Opening width (world units). */
  width?: number;
  /** Height of the straight-sided lower section. */
  rectHeight?: number;
  /** Arch rise from the spring line to the apex. Defaults to `width / 2`. */
  archHeight?: number;
  /** Lead came thickness (cross-section). Defaults to `0.055`. */
  leadThickness?: number;
  /** Lead depth (Z extent). Defaults to `0.11`. */
  leadDepth?: number;
  /** Quarrels spanning east–west across the bounding opening. Defaults to `10`. */
  cellsX?: number;
  /** Quarrels spanning north–south across the bounding opening. Defaults to `12`. */
  cellsY?: number;
  /** Vertical center of the full opening. Defaults to `0`. */
  centerY?: number;
}

/**
 * Diamond cames analytically clipped to the arched (rect-plus-Tudor-head)
 * opening — real trimmed geometry, no stencil, so it shadows and raycasts
 * correctly. Frame is a separate extruded ring on {@link ArchedDiamondLatticeWindow}.
 */
export class ArchedDiamondLatticeWindowGeometry extends BufferGeometry {
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: DiamondLatticeGrid;
  readonly opening: ArchedOpeningMetrics;

  constructor({
    width = 4.5,
    rectHeight = 4,
    archHeight,
    leadThickness = 0.055,
    leadDepth = 0.11,
    cellsX = 10,
    cellsY = 12,
    centerY = 0,
  }: ArchedDiamondLatticeWindowGeometryOptions = {}) {
    super();

    this.cellsX = Math.max(1, Math.round(cellsX));
    this.cellsY = Math.max(1, Math.round(cellsY));
    this.opening = archedOpeningMetrics({ width, rectHeight, archHeight, centerY });
    this.fittedGrid = diamondLatticeGridFromCells(
      width,
      this.opening.totalHeight,
      this.cellsX,
      this.cellsY,
    );

    const parts = buildArchedDiamondLatticeCameParts({
      width,
      rectHeight,
      archHeight,
      centerY,
      grid: this.fittedGrid,
      leadThickness,
      leadDepth,
      // Frame ring occupies `leadThickness` around the perimeter. End the cames
      // half a ring-width in so their tips overlap under the frame (no gap at the
      // crown) while their end-caps stay inside the outer silhouette (no spikes).
      clipInset: leadThickness * 0.5,
    });

    const merged = mergeBufferGeometries(parts);
    if (!merged) throw new Error("ArchedDiamondLatticeWindowGeometry: merge failed");

    this.copy(merged);
    merged.dispose();
    for (const part of parts) part.dispose();
  }
}
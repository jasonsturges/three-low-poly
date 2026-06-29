import { BoxGeometry } from "three";

/** Pane dimensions derived from opening size and cell counts. */
export interface GeorgianGrid {
  /** Width of each rectangular pane. */
  paneWidth: number;
  /** Height of each rectangular pane. */
  paneHeight: number;
}

/**
 * Derive pane size from cell counts.
 *
 * `cellsX` panes span the opening width; `cellsY` span the height. Mullions
 * divide the opening evenly so every segment is a full rectangle.
 */
export function georgianGridFromCells(
  width: number,
  height: number,
  cellsX: number,
  cellsY: number,
): GeorgianGrid {
  const cx = Math.max(1, Math.round(cellsX));
  const cy = Math.max(1, Math.round(cellsY));
  return {
    paneWidth: width / cx,
    paneHeight: height / cy,
  };
}

export interface GeorgianGridPartOptions {
  width: number;
  height: number;
  /** Center Y of the opening in local space. Defaults to `0`. */
  centerY?: number;
  cellsX: number;
  cellsY: number;
  mullionThickness: number;
  mullionDepth: number;
}

/**
 * Build merged box geometries for the outer frame and interior mullions.
 * Orthogonal grid — no clipping required; counts guarantee full panes.
 */
export function buildGeorgianGridParts({
  width,
  height,
  centerY = 0,
  cellsX,
  cellsY,
  mullionThickness: barT,
  mullionDepth: barD,
}: GeorgianGridPartOptions): BoxGeometry[] {
  const hw = width / 2;
  const hh = height / 2;
  const parts: BoxGeometry[] = [
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY - hh, 0),
    new BoxGeometry(width + barT, barT, barD).translate(0, centerY + hh, 0),
    new BoxGeometry(barT, height + barT, barD).translate(-hw, centerY, 0),
    new BoxGeometry(barT, height + barT, barD).translate(hw, centerY, 0),
  ];

  const { paneWidth, paneHeight } = georgianGridFromCells(width, height, cellsX, cellsY);

  for (let col = 1; col < cellsX; col++) {
    const x = -hw + paneWidth * col;
    parts.push(new BoxGeometry(barT, height + barT, barD).translate(x, centerY, 0));
  }

  for (let row = 1; row < cellsY; row++) {
    const y = centerY - hh + paneHeight * row;
    parts.push(new BoxGeometry(width + barT, barT, barD).translate(0, y, 0));
  }

  return parts;
}
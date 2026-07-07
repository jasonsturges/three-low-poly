import { BoxGeometry, BufferGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export interface BookshelfGeometryOptions {
  /** Overall width. Defaults to `5`. */
  width?: number;
  /** Overall height. Defaults to `8`. */
  height?: number;
  /** Shelf depth. Defaults to `1`. */
  depth?: number;
  /** Number of interior shelves. Defaults to `4`. */
  shelves?: number;
  /** Frame board thickness. Defaults to `0.1`. */
  frameThickness?: number;
  /** Omit the back panel when `true`. Defaults to `false`. */
  open?: boolean;
}

/**
 * Bookshelf frame with optional back panel and evenly spaced shelves.
 *
 * Local frame: sits on the Y=0 plane, centered on X/Z.
 */
export class BookshelfGeometry extends BufferGeometry {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly shelves: number;

  constructor({
    width = 5,
    height = 8,
    depth = 1,
    shelves = 4,
    frameThickness = 0.1,
    open = false,
  }: BookshelfGeometryOptions = {}) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;
    this.shelves = shelves;

    const sidePanelGeometry = new BoxGeometry(frameThickness, height, depth);
    const shelfGeometry = new BoxGeometry(width - 2 * frameThickness, frameThickness, depth);

    const leftPanel = sidePanelGeometry.clone();
    leftPanel.translate(-width / 2 + frameThickness / 2, height / 2, 0);

    const rightPanel = sidePanelGeometry.clone();
    rightPanel.translate(width / 2 - frameThickness / 2, height / 2, 0);

    const topPanel = shelfGeometry.clone();
    topPanel.translate(0, height - frameThickness / 2, 0);

    const bottomPanel = shelfGeometry.clone();
    bottomPanel.translate(0, frameThickness / 2, 0);

    const backPanel = new BoxGeometry(width, height, frameThickness);
    backPanel.translate(0, height / 2, -depth / 2 + frameThickness / 2);

    const shelfPanels = [];
    const shelfSpacing = (height - frameThickness) / (shelves + 1);
    for (let i = 1; i <= shelves; i++) {
      const shelfPanel = shelfGeometry.clone();
      shelfPanel.translate(0, frameThickness / 2 + i * shelfSpacing, 0);
      shelfPanels.push(shelfPanel);
    }

    this.copy(
      mergeBufferGeometries(
        [leftPanel, rightPanel, topPanel, bottomPanel, ...(open ? [] : [backPanel]), ...shelfPanels],
        false,
      ) as BufferGeometry,
    );
  }
}
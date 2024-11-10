import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export class BookshelfGeometry extends BufferGeometry {
  constructor({
    width = 5, //
    height = 8,
    depth = 1,
    shelves = 4,
    frameThickness = 0.1,
    open = false,
  } = {}) {
    super();

    // Create the outer frame of the bookshelf
    const frameHeight = height;
    const frameWidth = width;
    const frameDepth = depth;

    // Base geometries
    const sidePanelGeometry = new BoxGeometry(frameThickness, frameHeight, frameDepth);
    const shelfGeometry = new BoxGeometry(frameWidth - 2 * frameThickness, frameThickness, frameDepth);

    // Panels
    const leftPanel = sidePanelGeometry.clone();
    leftPanel.translate(-frameWidth / 2 + frameThickness / 2, frameHeight / 2, 0);

    const rightPanel = sidePanelGeometry.clone();
    rightPanel.translate(frameWidth / 2 - frameThickness / 2, frameHeight / 2, 0);

    const topPanel = shelfGeometry.clone();
    topPanel.translate(0, frameHeight - frameThickness / 2, 0);

    const bottomPanel = shelfGeometry.clone();
    bottomPanel.translate(0, frameThickness / 2, 0);

    const backPanel = new BoxGeometry(frameWidth, frameHeight, frameThickness);
    backPanel.translate(0, frameHeight / 2, -frameDepth / 2 + frameThickness / 2);

    const shelfPanels = [];
    const shelfSpacing = (frameHeight - frameThickness) / (shelves + 1);
    for (let i = 1; i <= shelves; i++) {
      const shelfPanel = shelfGeometry.clone();
      shelfPanel.translate(0, frameThickness / 2 + i * shelfSpacing, 0);
      shelfPanels.push(shelfPanel);
    }

    this.copy(mergeGeometries([
      leftPanel, //
      rightPanel,
      topPanel,
      bottomPanel,
      ...(open ? [] : [backPanel]),
      ...shelfPanels
    ], false));
  }
}

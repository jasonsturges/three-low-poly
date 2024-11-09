import { Mesh, MeshStandardMaterial } from "three";
import { BookshelfGeometry } from "../../geometry/furniture/BookshelfGeometry";

export class Bookshelf extends Mesh {
  constructor({
    width = 5, //
    height = 8,
    depth = 1,
    shelves = 4,
    frameThickness = 0.1,
  } = {}) {
    super();

    this.geometry = new BookshelfGeometry({ width, height, depth, shelves, frameThickness });
    this.material = new MeshStandardMaterial({ color: 0x8b4513 });
  }
}

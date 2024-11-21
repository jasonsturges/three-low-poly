import { Mesh, MeshStandardMaterial } from "three";
import { BookshelfGeometry } from "../../geometry/furniture/BookshelfGeometry";

export class Bookshelf extends Mesh<BookshelfGeometry, MeshStandardMaterial> {
  constructor({
    width = 5, //
    height = 8,
    depth = 1,
    shelves = 4,
    frameThickness = 0.1,
    open = false,
  } = {}) {
    super(
      new BookshelfGeometry({ width, height, depth, shelves, frameThickness, open }),
      new MeshStandardMaterial({ color: 0x8b4513 }),
    );
  }
}

import { Mesh, MeshStandardMaterial } from "three";
import { BookGeometry } from "../../geometry/books/BookGeometry.js";

export class Book extends Mesh {
  constructor({
    width = 1,
    height = 1.5,
    depth = 0.5,
    coverThickness = 0.05,
    pageIndent = 0.05,
    coverColor = 0x8b0000,
    pageColor = 0xffffff,
  } = {}) {
    super();

    this.geometry = new BookGeometry(width, height, depth, coverThickness, pageIndent);
    this.material = [
      new MeshStandardMaterial({ color: coverColor, metalness: 0.1, roughness: 0.7, flatShading: true }),
      new MeshStandardMaterial({ color: pageColor, flatShading: true }),
    ];
  }
}

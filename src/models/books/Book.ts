import { Mesh, MeshStandardMaterial } from "three";
import { BookGeometry } from "../../geometry/books/BookGeometry";
import { ColorPalette } from "../../constants/ColorPalette";

/**
 * Material Order:
 *   1. Cover
 *   2. Page
 */
export class Book extends Mesh<BookGeometry, MeshStandardMaterial[]> {
  constructor({
    width = 1,
    height = 1.5,
    depth = 0.5,
    coverThickness = 0.05,
    pageIndent = 0.05,
    coverColor = ColorPalette.DARK_RED,
    pageColor = ColorPalette.WHITE,
  } = {}) {
    super(
      new BookGeometry(width, height, depth, coverThickness, pageIndent),
      [
        new MeshStandardMaterial({ color: coverColor, metalness: 0.1, roughness: 0.7, flatShading: true }),
        new MeshStandardMaterial({ color: pageColor, flatShading: true }),
      ],
    );
  }
}

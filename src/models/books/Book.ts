import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { BookGeometry, type BookGeometryOptions } from "../../geometry/books/BookGeometry";

export interface BookOptions extends BookGeometryOptions {
  /** Cover tint. Defaults to `#8b0000`. */
  coverColor?: ColorRepresentation;
  /** Page block tint. Defaults to `#ffffff`. */
  pageColor?: ColorRepresentation;
}

/**
 * Book prefab — cover shell and page block with separate material groups.
 *
 * Local frame: spine at X=0, fore-edge at +X, sits on the Y=0 plane.
 */
export class Book extends Mesh<BookGeometry, MeshStandardMaterial[]> {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly coverThickness: number;
  readonly pageIndent: number;

  constructor({
    coverColor = "#8b0000",
    pageColor = "#ffffff",
    ...geometryOptions
  }: BookOptions = {}) {
    const geometry = new BookGeometry(geometryOptions);

    super(geometry, [
      new MeshStandardMaterial({
        color: new Color(coverColor),
        metalness: 0.1,
        roughness: 0.7,
        flatShading: true,
      }),
      new MeshStandardMaterial({
        color: new Color(pageColor),
        flatShading: true,
      }),
    ]);

    this.width = geometry.width;
    this.height = geometry.height;
    this.depth = geometry.depth;
    this.coverThickness = geometry.coverThickness;
    this.pageIndent = geometry.pageIndent;
  }
}
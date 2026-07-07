import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { BookshelfGeometry, type BookshelfGeometryOptions } from "../../geometry/furniture/BookshelfGeometry";

export interface BookshelfOptions extends BookshelfGeometryOptions {
  /** Frame tint. Defaults to `#8b4513`. */
  color?: ColorRepresentation;
}

/**
 * Bookshelf prefab — framed shelving unit.
 */
export class Bookshelf extends Mesh<BookshelfGeometry, MeshStandardMaterial> {
  readonly width: number;
  readonly height: number;

  constructor({ color = "#8b4513", ...geometryOptions }: BookshelfOptions = {}) {
    const geometry = new BookshelfGeometry(geometryOptions);

    super(geometry, new MeshStandardMaterial({ color: new Color(color) }));

    this.width = geometry.width;
    this.height = geometry.height;
  }
}
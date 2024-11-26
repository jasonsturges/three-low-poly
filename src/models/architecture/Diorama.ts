import { Mesh, MeshStandardMaterial } from "three";
import { ColorPalette } from "../../constants/ColorPalette";
import { DioramaGeometry } from "../../geometry/architecture/DioramaGeometry";

/**
 * A diorama with a floor and walls.
 *
 * Material indices:
 * 0: Interior walls
 * 1: Floor
 * 2: Exterior walls
 */
export class Diorama extends Mesh<DioramaGeometry, MeshStandardMaterial[]> {
  constructor({
    width = 5,
    height = 3,
    depth = 5,
    wallThickness = 0.05,
    interiorColor = ColorPalette.WHITE_SMOKE,
    floorColor = ColorPalette.RAW_SIENNA,
    exteriorColor = ColorPalette.GRAY,
  } = {}) {
    super(
      new DioramaGeometry({ width, height, depth, wallThickness }),
      [
        new MeshStandardMaterial({ color: interiorColor }),
        new MeshStandardMaterial({ color: floorColor }),
        new MeshStandardMaterial({ color: exteriorColor }),
      ],
    );
  }
}

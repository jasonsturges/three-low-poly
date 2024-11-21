import { Mesh, MeshStandardMaterial } from "three";
import { ColorPalette } from "../../constants/ColorPalette";
import { PotionBottleGeometry } from "../../geometry/bottles/PotionBottleGeometry";

/**
 * Potion bottle, with optional liquid fill
 *
 * Material indices
 * 0. Bottle
 * 1. Cork
 * 2. Liquid (optional)
 */
export class PotionBottle extends Mesh<PotionBottleGeometry, MeshStandardMaterial[]> {
  constructor() {
    super(new PotionBottleGeometry(), [
      new MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.3,
      }),
      new MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 1.0,
      }),
      new MeshStandardMaterial({
        color: ColorPalette.PINK_SHERBET,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      }),
    ]);
  }
}

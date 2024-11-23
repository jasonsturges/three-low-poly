import { Mesh, MeshStandardMaterial } from "three";
import { CandleGeometry } from "../../geometry/lighting/CandleGeometry";

/**
 * Material indices
 * 0: Stick
 * 1: Flame
 */
export class Candle extends Mesh<CandleGeometry, MeshStandardMaterial[]> {
  constructor({
    radiusTop = 0.2, //
    radiusBottom = 0.2,
    height = 1,
    flameHeight = 0.25,
    flameRadius = 0.05,
    segments = 16,
  }) {
    super(
      new CandleGeometry({
        radiusTop,
        radiusBottom,
        height,
        flameHeight,
        flameRadius,
        segments,
      }),
      [
        new MeshStandardMaterial({ color: 0xffffff }),
        new MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.35 }),
      ],
    );
  }
}

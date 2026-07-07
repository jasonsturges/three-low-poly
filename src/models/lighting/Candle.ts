import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { CandleGeometry, type CandleGeometryOptions } from "../../geometry/lighting/CandleGeometry";

export interface CandleOptions extends CandleGeometryOptions {
  /** Wax stick tint. Defaults to `#ffffff`. */
  stickColor?: ColorRepresentation;
  /** Flame surface tint. Defaults to `#ffd700`. */
  flameColor?: ColorRepresentation;
  /** Flame emissive tint. Defaults to `#ffa500`. */
  flameEmissive?: ColorRepresentation;
  /** Flame emissive strength. Defaults to `0.35`. */
  flameEmissiveIntensity?: number;
}

/**
 * Candle prefab — wax stick and emissive flame (separate material groups).
 */
export class Candle extends Mesh<CandleGeometry, MeshStandardMaterial[]> {
  readonly height: number;

  constructor({
    stickColor = "#ffffff",
    flameColor = "#ffd700",
    flameEmissive = "#ffa500",
    flameEmissiveIntensity = 0.35,
    ...geometryOptions
  }: CandleOptions = {}) {
    const geometry = new CandleGeometry(geometryOptions);

    super(geometry, [
      new MeshStandardMaterial({ color: new Color(stickColor), flatShading: true }),
      new MeshStandardMaterial({
        color: new Color(flameColor),
        emissive: new Color(flameEmissive),
        emissiveIntensity: flameEmissiveIntensity,
        flatShading: true,
        toneMapped: false,
      }),
    ]);

    this.height = geometry.height;
  }
}
import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { LanternGeometry, type LanternGeometryOptions } from "../../geometry/lighting/LanternGeometry";

export interface LanternOptions extends LanternGeometryOptions {
  /** Frame tint (base, roof, handle). Defaults to `#8b4513`. */
  color?: ColorRepresentation;
  /** Glass lamp tint. Defaults to `#ffd700`. */
  lampColor?: ColorRepresentation;
  /** Glass emissive strength. Defaults to `1.2`. */
  lampEmissiveIntensity?: number;
  /** Glass opacity. Defaults to `0.75`. */
  lampOpacity?: number;
}

/**
 * Tabletop lantern — frame around an emissive glass body. Geometry only; add
 * {@link GlowHalo} and {@link FlameFlickerEffect} at `lampCenterY` in the
 * scene.
 *
 * Local frame: sits on the Y=0 plane.
 */
export class Lantern extends Mesh<LanternGeometry, MeshStandardMaterial[]> {
  readonly lampCenterY: number;

  constructor(
    heightOrOptions: number | LanternOptions = {},
    baseWidth?: number,
  ) {
    const options: LanternOptions =
      typeof heightOrOptions === "number"
        ? { bodyHeight: heightOrOptions, baseWidth: baseWidth ?? 0.5 }
        : heightOrOptions;

    const {
      color = "#8b4513",
      lampColor = "#ffd700",
      lampEmissiveIntensity = 1.2,
      lampOpacity = 0.75,
      inner = true,
      ...geometryOptions
    } = options;

    const geometry = new LanternGeometry({ inner, ...geometryOptions });
    const lamp = new Color(lampColor);

    const materials: MeshStandardMaterial[] = [
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.85,
        metalness: 0.04,
        flatShading: true,
      }),
    ];

    if (inner) {
      materials.push(
        new MeshStandardMaterial({
          color: lamp,
          emissive: lamp,
          emissiveIntensity: lampEmissiveIntensity,
          transparent: lampOpacity < 1,
          opacity: lampOpacity,
          roughness: 0.35,
          metalness: 0,
          flatShading: true,
          side: DoubleSide,
          toneMapped: false,
        }),
      );
    }

    super(geometry, materials);

    this.lampCenterY = geometry.lampCenterY;
  }
}
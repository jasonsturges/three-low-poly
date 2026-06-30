import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  WallSconceGeometry,
  type WallSconceGeometryOptions,
} from "../../geometry/lighting/WallSconceGeometry";

export interface WallSconceOptions extends WallSconceGeometryOptions {
  /** Wrought-iron tint for mount and frame. Defaults to `#1c1e24`. */
  color?: ColorRepresentation;
  /** Mount iron tint (plate + bracket). Defaults to `color`. */
  mountColor?: ColorRepresentation;
  /** Frame iron tint (cap + bowl). Defaults to `color`. */
  frameColor?: ColorRepresentation;
  /** Glass chimney tint. Defaults to `#e8a058`. */
  lampColor?: ColorRepresentation;
  /** Glass emissive strength. Defaults to `1.4`. */
  lampEmissiveIntensity?: number;
  /** Glass opacity. Defaults to `0.88`. */
  lampOpacity?: number;
}

/**
 * Wall-mounted oil-lamp sconce — iron mount and cap/bowl frame around an
 * emissive glass chimney. Pair {@link GlowHalo} and {@link FlameFlickerEffect}
 * at `(lightCenterX, lightCenterY, lightCenterZ)` for bloom and flicker.
 *
 * Local frame: faces +X from a −X wall.
 */
export class WallSconce extends Mesh<WallSconceGeometry, MeshStandardMaterial[]> {
  readonly lightCenterX: number;
  readonly lightCenterY: number;
  readonly lightCenterZ: number;

  constructor({
    color = "#1c1e24",
    mountColor,
    frameColor,
    lampColor = "#e8a058",
    lampEmissiveIntensity = 1.4,
    lampOpacity = 0.88,
    inner = true,
    ...geometryOptions
  }: WallSconceOptions = {}) {
    const geometry = new WallSconceGeometry({ inner, ...geometryOptions });
    const lamp = new Color(lampColor);

    const materials: MeshStandardMaterial[] = [
      new MeshStandardMaterial({
        color: new Color(mountColor ?? color),
        metalness: 0.65,
        roughness: 0.55,
        flatShading: true,
      }),
      new MeshStandardMaterial({
        color: new Color(frameColor ?? color),
        metalness: 0.65,
        roughness: 0.55,
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

    this.lightCenterX = geometry.lightCenterX;
    this.lightCenterY = geometry.lightCenterY;
    this.lightCenterZ = geometry.lightCenterZ;
  }
}
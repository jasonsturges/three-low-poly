import { Color, ColorRepresentation, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import {
  HangingLanternGeometry,
  type HangingLanternGeometryOptions,
} from "../../geometry/lighting/HangingLanternGeometry";

export interface HangingLanternOptions extends HangingLanternGeometryOptions {
  /** Wrought-iron tint for mount and cage. Defaults to `#171a1f`. */
  color?: ColorRepresentation;
  /** Mount iron tint (chain + cap). Defaults to `color`. */
  mountColor?: ColorRepresentation;
  /** Cage strut tint. Defaults to `color`. */
  cageColor?: ColorRepresentation;
  /** Inner lamp tint (emissive octahedron). Defaults to `#ffb45a`. */
  lampColor?: ColorRepresentation;
  /** Inner lamp emissive strength. Defaults to `1.4`. */
  lampEmissiveIntensity?: number;
  /** Inner lamp opacity for a glass-pane read. Defaults to `0.88`. */
  lampOpacity?: number;
}

/**
 * Hanging wrought-iron lantern — open cage struts around a solid emissive
 * inner octahedron (glass-pane lamp). Mount, cage, and lamp use separate
 * material groups. Pair {@link GlowHalo} and {@link FlameFlickerEffect} at
 * `cageCenterY` for bloom and flicker.
 *
 * Local frame: origin at the chain top (hang point).
 */
export class HangingLantern extends Mesh<HangingLanternGeometry, MeshStandardMaterial[]> {
  readonly drop: number;
  readonly cageCenterY: number;

  constructor({
    color = "#171a1f",
    mountColor,
    cageColor,
    lampColor = "#ffb45a",
    lampEmissiveIntensity = 1.4,
    lampOpacity = 0.88,
    inner = true,
    ...geometryOptions
  }: HangingLanternOptions = {}) {
    const geometry = new HangingLanternGeometry({ inner, ...geometryOptions });
    const lamp = new Color(lampColor);

    const materials: MeshStandardMaterial[] = [
      new MeshStandardMaterial({
        color: new Color(mountColor ?? color),
        metalness: 0.7,
        roughness: 0.5,
        flatShading: true,
      }),
      new MeshStandardMaterial({
        color: new Color(cageColor ?? color),
        metalness: 0.7,
        roughness: 0.5,
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

    this.drop = geometry.drop;
    this.cageCenterY = geometry.cageCenterY;
  }
}
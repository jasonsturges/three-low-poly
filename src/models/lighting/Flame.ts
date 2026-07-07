import { Color, ColorRepresentation, Mesh, MeshStandardMaterial } from "three";
import { FlameGeometry, type FlameGeometryOptions } from "../../geometry/lighting/FlameGeometry";

export interface FlameOptions extends FlameGeometryOptions {
  /** Surface tint. Defaults to `#ffd700`. */
  color?: ColorRepresentation;
  /** Emissive tint. Defaults to `#ffa500`. */
  emissive?: ColorRepresentation;
  /** Emissive strength. Defaults to `0.35`. */
  emissiveIntensity?: number;
}

/**
 * Emissive flame prefab — parametric teardrop volume for candles and lanterns.
 *
 * Local frame: base at Y=0, tip at Y=`height`.
 */
export class Flame extends Mesh<FlameGeometry, MeshStandardMaterial> {
  readonly height: number;
  readonly radius: number;
  readonly segmentsU: number;
  readonly segmentsV: number;

  constructor({
    color = "#ffd700",
    emissive = "#ffa500",
    emissiveIntensity = 0.35,
    ...geometryOptions
  }: FlameOptions = {}) {
    const geometry = new FlameGeometry(geometryOptions);

    super(
      geometry,
      new MeshStandardMaterial({
        color: new Color(color),
        emissive: new Color(emissive),
        emissiveIntensity,
        flatShading: true,
        toneMapped: false,
      }),
    );

    this.height = geometry.height;
    this.radius = geometry.radius;
    this.segmentsU = geometry.segmentsU;
    this.segmentsV = geometry.segmentsV;
  }
}
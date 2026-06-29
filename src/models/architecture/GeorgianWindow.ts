import {
  Color,
  ColorRepresentation,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import type { GeorgianGrid } from "../../geometry/architecture/georgianGrid";
import {
  GeorgianWindowGeometry,
  type GeorgianWindowGeometryOptions,
} from "../../geometry/architecture/GeorgianWindowGeometry";

export interface GeorgianWindowOptions extends GeorgianWindowGeometryOptions {
  /** Frame + mullion tint. Defaults to `#5c4033` (wood). */
  mullionColor?: ColorRepresentation;
  /** Optional glass pane coplanar with the mullions (same Z center). */
  glass?: boolean;
  glassColor?: ColorRepresentation;
  glassEmissive?: ColorRepresentation;
  glassEmissiveIntensity?: number;
}

/**
 * Georgian window — rectangular pane grid with orthogonal mullions.
 *
 * Local frame: centered on the opening, XY plane facing +Z. Mullions and
 * optional glass share `z = 0`.
 */
export class GeorgianWindow extends Group {
  readonly mullions: Mesh<GeorgianWindowGeometry, MeshStandardMaterial>;
  readonly glass?: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: GeorgianGrid;

  constructor({
    mullionColor = "#5c4033",
    glass = false,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
    ...geometryOptions
  }: GeorgianWindowOptions = {}) {
    super();

    const geometry = new GeorgianWindowGeometry(geometryOptions);
    this.cellsX = geometry.cellsX;
    this.cellsY = geometry.cellsY;
    this.fittedGrid = geometry.fittedGrid;

    const mullionMaterial = new MeshStandardMaterial({
      color: new Color(mullionColor),
      roughness: 0.85,
      metalness: 0.05,
    });

    this.mullions = new Mesh(geometry, mullionMaterial);
    this.mullions.castShadow = true;
    this.mullions.renderOrder = 1;
    this.add(this.mullions);

    if (glass) {
      const w = geometryOptions.width ?? 4.5;
      const h = geometryOptions.height ?? 5.5;
      const glassMaterial = new MeshPhysicalMaterial({
        color: new Color(glassColor),
        emissive: glassEmissive ? new Color(glassEmissive) : new Color(0x000000),
        emissiveIntensity: glassEmissiveIntensity,
        transparent: true,
        depthWrite: false,
        roughness: 0.08,
        metalness: 0,
        transmission: glassEmissive ? 0.5 : 0.88,
        thickness: 0.02,
        side: DoubleSide,
      });
      this.glass = new Mesh(new PlaneGeometry(w, h), glassMaterial);
      this.glass.renderOrder = 0;
      this.glass.castShadow = false;
      this.glass.receiveShadow = false;
      this.add(this.glass);
    }
  }
}
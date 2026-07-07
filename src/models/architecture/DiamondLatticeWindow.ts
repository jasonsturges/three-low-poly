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
import type { DiamondLatticeGrid } from "../../geometry/architecture/diamondLattice";
import {
  DiamondLatticeWindowGeometry,
  type DiamondLatticeWindowGeometryOptions,
} from "../../geometry/architecture/DiamondLatticeWindowGeometry";

export interface DiamondLatticeWindowOptions extends DiamondLatticeWindowGeometryOptions {
  /** Lead + outer frame tint. Defaults to `#0c0f14`. */
  leadColor?: ColorRepresentation;
  /**
   * Optional glass pane centered in the lead depth (`z = 0`), visible from both sides.
   * Mad-science uses an emissive sky mesh in the scene instead.
   */
  glass?: boolean;
  glassColor?: ColorRepresentation;
  /** Glass emissive for moonlit / storm backlight. Defaults to off. */
  glassEmissive?: ColorRepresentation;
  glassEmissiveIntensity?: number;
}

/**
 * Diamond lattice window — diagonal lead cames with axis-aligned quarrels (`<>`).
 *
 * Local frame: centered on the opening, XY plane facing +Z. Lead is centered on
 * `z = 0`; optional glass sits in the same plane (both faces). Pair with
 * a scene-owned backing plane behind the wall.
 */
export class DiamondLatticeWindow extends Group {
  readonly lattice: Mesh<DiamondLatticeWindowGeometry, MeshStandardMaterial>;
  readonly glass?: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: DiamondLatticeGrid;

  constructor({
    leadColor = "#0c0f14",
    glass = false,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
    centerY = 0,
    leadDepth = 0.11,
    ...geometryOptions
  }: DiamondLatticeWindowOptions = {}) {
    super();

    const geometry = new DiamondLatticeWindowGeometry({
      centerY,
      leadDepth,
      ...geometryOptions,
    });
    this.cellsX = geometry.cellsX;
    this.cellsY = geometry.cellsY;
    this.fittedGrid = geometry.fittedGrid;

    const leadMaterial = new MeshStandardMaterial({
      color: new Color(leadColor),
      roughness: 0.7,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.lattice = new Mesh(geometry, leadMaterial);
    this.lattice.castShadow = true;
    this.lattice.renderOrder = 1;
    this.add(this.lattice);

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
        thickness: leadDepth * 0.5,
        side: DoubleSide,
      });
      this.glass = new Mesh(new PlaneGeometry(w, h), glassMaterial);
      this.glass.position.y = centerY;
      this.glass.renderOrder = 0;
      this.glass.castShadow = false;
      this.glass.receiveShadow = false;
      this.add(this.glass);
    }
  }
}
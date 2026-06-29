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
  DiamondLeadedWindowGeometry,
  type DiamondLeadedWindowGeometryOptions,
} from "../../geometry/architecture/DiamondLeadedWindowGeometry";

export interface DiamondLeadedWindowOptions extends DiamondLeadedWindowGeometryOptions {
  /** Lead + outer frame tint. Defaults to `#0c0f14`. */
  leadColor?: ColorRepresentation;
  /**
   * Optional glass pane coplanar with the lattice (same Z center).
   * Mad-science uses an emissive sky mesh in the scene instead; cathedral
   * uses glowing glass — enable for either look.
   */
  glass?: boolean;
  glassColor?: ColorRepresentation;
  /** Glass emissive for moonlit / storm backlight. Defaults to off. */
  glassEmissive?: ColorRepresentation;
  glassEmissiveIntensity?: number;
}

/**
 * Rectangular diamond leaded window — mad-science Room parity.
 *
 * Local frame: centered on the opening, XY plane facing +Z. Lead and optional
 * glass share `z = 0` so cames sit in the pane. Pair with a scene-owned backing
 * plane (storm sky, emissive) behind the wall for lightning flashes.
 *
 * Material indices on the lattice mesh: single lead/frame material.
 */
export class DiamondLeadedWindow extends Group {
  readonly lattice: Mesh<DiamondLeadedWindowGeometry, MeshStandardMaterial>;
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
    ...geometryOptions
  }: DiamondLeadedWindowOptions = {}) {
    super();

    const geometry = new DiamondLeadedWindowGeometry(geometryOptions);
    this.cellsX = geometry.cellsX;
    this.cellsY = geometry.cellsY;
    this.fittedGrid = geometry.fittedGrid;

    const leadMaterial = new MeshStandardMaterial({
      color: new Color(leadColor),
      roughness: 0.7,
      metalness: 0.35,
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
import {
  Color,
  ColorRepresentation,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
} from "three";
import {
  archedOpeningMetrics,
  buildArchedDiamondLatticeFrameGeometry,
  traceArchedOpeningOutline,
  type ArchedOpeningMetrics,
  type DiamondLatticeGrid,
} from "../../geometry/architecture/diamondLattice";
import {
  ArchedDiamondLatticeWindowGeometry,
  type ArchedDiamondLatticeWindowGeometryOptions,
} from "../../geometry/architecture/ArchedDiamondLatticeWindowGeometry";

export interface ArchedDiamondLatticeWindowOptions extends ArchedDiamondLatticeWindowGeometryOptions {
  /** Lead + outer frame tint. Defaults to `#0c0f14`. */
  leadColor?: ColorRepresentation;
  /** Optional glass pane centered in the lead depth (`z = 0`), visible from both sides. */
  glass?: boolean;
  glassColor?: ColorRepresentation;
  glassEmissive?: ColorRepresentation;
  glassEmissiveIntensity?: number;
}

const ARCHED_SHAPE_CURVE_SEGMENTS = 48;

/**
 * Arched diamond lattice window — diagonal lead cames analytically clipped to a
 * Tudor head opening, with an extruded frame ring. The lattice is real trimmed
 * geometry (no stencil mask), so it casts a correct arch-shaped shadow and any
 * collider derived from the mesh matches what's drawn.
 *
 * Local frame: centered on the opening, XY plane facing +Z. Lead is centered on
 * `z = 0`; optional glass sits in the same plane (both faces).
 */
export class ArchedDiamondLatticeWindow extends Group {
  readonly lattice: Mesh<ArchedDiamondLatticeWindowGeometry, MeshStandardMaterial>;
  readonly frame: Mesh;
  readonly glass?: Mesh<ShapeGeometry, MeshPhysicalMaterial>;
  readonly cellsX: number;
  readonly cellsY: number;
  readonly fittedGrid: DiamondLatticeGrid;
  readonly opening: ArchedOpeningMetrics;

  constructor({
    leadColor = "#0c0f14",
    glass = false,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
    width = 4.5,
    rectHeight = 4,
    archHeight,
    centerY = 0,
    leadThickness = 0.055,
    leadDepth = 0.11,
    ...geometryOptions
  }: ArchedDiamondLatticeWindowOptions = {}) {
    super();

    this.opening = archedOpeningMetrics({ width, rectHeight, archHeight, centerY });

    const geometry = new ArchedDiamondLatticeWindowGeometry({
      width,
      rectHeight,
      archHeight,
      centerY,
      leadThickness,
      leadDepth,
      ...geometryOptions,
    });
    this.cellsX = geometry.cellsX;
    this.cellsY = geometry.cellsY;
    this.fittedGrid = geometry.fittedGrid;

    const leadColorObj = new Color(leadColor);

    if (glass) {
      const openingShape = new Shape();
      traceArchedOpeningOutline(openingShape, this.opening);
      const openingGeo = new ShapeGeometry(openingShape, ARCHED_SHAPE_CURVE_SEGMENTS);
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
      this.glass = new Mesh(openingGeo, glassMaterial);
      this.glass.renderOrder = 0;
      this.glass.castShadow = false;
      this.glass.receiveShadow = false;
      this.add(this.glass);
    }

    const latticeMaterial = new MeshStandardMaterial({
      color: leadColorObj,
      roughness: 0.7,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.lattice = new Mesh(geometry, latticeMaterial);
    this.lattice.castShadow = true;
    this.lattice.renderOrder = 1;
    this.add(this.lattice);

    const frameGeo = buildArchedDiamondLatticeFrameGeometry(
      this.opening,
      leadThickness,
      leadDepth,
    );
    this.frame = new Mesh(
      frameGeo,
      new MeshStandardMaterial({
        color: leadColorObj,
        roughness: 0.7,
        metalness: 0.35,
      }),
    );
    this.frame.castShadow = true;
    this.frame.renderOrder = 2;
    this.add(this.frame);
  }
}

import {
  AlwaysStencilFunc,
  Color,
  ColorRepresentation,
  DoubleSide,
  EqualStencilFunc,
  Group,
  InstancedMesh,
  KeepStencilOp,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  ReplaceStencilOp,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import {
  buildRingLatticeFrameParts,
  createOpeningClippingPlanes,
  createRingLatticeGeometry,
  resolveRingLatticeCell,
  ringLatticeSpots,
  type RingLatticeGrid,
} from "../../geometry/architecture/ringLattice";

export interface RingLatticeWindowOptions {
  /** Opening width (world units). */
  width?: number;
  /** Opening height (world units). */
  height?: number;
  /** Uniform ring-center spacing. Overrides `cellsX` when set. Defaults to `0.55`. */
  cell?: number;
  /** Density hint — `cell = width / cellsX` when `cell` is omitted. */
  cellsX?: number;
  /** Wall thickness of each square ring profile. Defaults to `0.05`. */
  ringThickness?: number;
  /** Extrusion depth of each ring. Defaults to `0.06`. */
  ringDepth?: number;
  /** Outer frame bar thickness. Defaults to `0.055`. */
  frameThickness?: number;
  /** Outer frame depth (Z). Defaults to `0.11`. */
  frameDepth?: number;
  /** Vertical center of the opening in local space. Defaults to `0`. */
  centerY?: number;
  /** Lattice + frame tint. Defaults to `#0c0f14`. */
  latticeColor?: ColorRepresentation;
  /** Optional glass pane recessed slightly on −Z. */
  glass?: boolean;
  glassColor?: ColorRepresentation;
  glassEmissive?: ColorRepresentation;
  glassEmissiveIntensity?: number;
}

const STENCIL_REF = 1;

/**
 * Ring lattice window — overlapping square rings on a uniform grid (diaper /
 * trellis fretwork), stencil-clipped to a rectangular opening.
 */
export class RingLatticeWindow extends Group {
  readonly lattice: InstancedMesh;
  readonly frame: Mesh;
  readonly glass?: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  readonly cell: number;
  readonly fittedGrid: RingLatticeGrid;
  private readonly clipPlanesLocal: Plane[];
  private readonly clipPlanesWorld: Plane[];

  constructor({
    width = 4.5,
    height = 5.5,
    cell: cellOption,
    cellsX,
    centerY = 0,
    ringThickness = 0.05,
    ringDepth = 0.06,
    frameThickness = 0.055,
    frameDepth = 0.11,
    latticeColor = "#0c0f14",
    glass = false,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
  }: RingLatticeWindowOptions = {}) {
    super();

    this.cell = resolveRingLatticeCell(width, height, cellOption, cellsX);
    const { spots, grid } = ringLatticeSpots({
      width,
      height,
      centerY,
      cell: this.cell,
    });
    this.fittedGrid = grid;
    this.clipPlanesLocal = createOpeningClippingPlanes(width, height, centerY);
    this.clipPlanesWorld = this.clipPlanesLocal.map((plane) => plane.clone());

    if (glass) {
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
      this.glass = new Mesh(new PlaneGeometry(width, height), glassMaterial);
      this.glass.position.y = centerY;
      this.glass.position.z = -ringDepth * 0.5;
      this.glass.renderOrder = 0;
      this.add(this.glass);
    }

    const mask = new Mesh(
      new PlaneGeometry(width, height),
      new MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        depthTest: false,
        stencilWrite: true,
        stencilRef: STENCIL_REF,
        stencilFunc: AlwaysStencilFunc,
        stencilFail: KeepStencilOp,
        stencilZPass: ReplaceStencilOp,
        stencilZFail: KeepStencilOp,
      }),
    );
    mask.position.y = centerY;
    mask.renderOrder = 1;
    this.add(mask);

    const ringGeo = createRingLatticeGeometry(grid.ringOuter, ringThickness, ringDepth);
    const latticeMaterial = new MeshStandardMaterial({
      color: new Color(latticeColor),
      roughness: 0.7,
      metalness: 0.35,
      clippingPlanes: this.clipPlanesWorld,
      clipShadows: true,
      stencilWrite: true,
      stencilWriteMask: 0x00,
      stencilRef: STENCIL_REF,
      stencilFunc: EqualStencilFunc,
      stencilFail: KeepStencilOp,
      stencilZPass: KeepStencilOp,
      stencilZFail: KeepStencilOp,
    });

    this.lattice = new InstancedMesh(ringGeo, latticeMaterial, spots.length);
    this.lattice.castShadow = true;
    this.lattice.renderOrder = 2;

    const dummy = new Object3D();
    for (let i = 0; i < spots.length; i++) {
      dummy.position.set(spots[i][0], spots[i][1], 0);
      dummy.rotation.set(0, 0, Math.PI / 4);
      dummy.updateMatrix();
      this.lattice.setMatrixAt(i, dummy.matrix);
    }
    this.lattice.instanceMatrix.needsUpdate = true;
    this.lattice.onBeforeRender = () => {
      this.updateWorldMatrix(true, false);
      for (let i = 0; i < this.clipPlanesLocal.length; i++) {
        this.clipPlanesWorld[i].copy(this.clipPlanesLocal[i]).applyMatrix4(this.matrixWorld);
      }
    };
    this.add(this.lattice);

    const frameParts = buildRingLatticeFrameParts({
      width,
      height,
      centerY,
      frameThickness,
      frameDepth,
    });
    const frameGeo = mergeBufferGeometries(frameParts);
    if (!frameGeo) throw new Error("RingLatticeWindow: frame merge failed");
    for (const part of frameParts) part.dispose();

    this.frame = new Mesh(
      frameGeo,
      new MeshStandardMaterial({
        color: new Color(latticeColor),
        roughness: 0.7,
        metalness: 0.35,
      }),
    );
    this.frame.castShadow = true;
    this.frame.renderOrder = 3;
    this.add(this.frame);
  }
}
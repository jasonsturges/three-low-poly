import {
  Color,
  type ColorRepresentation,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "three";
import { DiamondLatticeGeometry } from "../geometry/architecture/DiamondLatticeGeometry";
import { PaneGeometry } from "../geometry/architecture/PaneGeometry";
import { WindowFrameGeometry } from "../geometry/architecture/WindowFrameGeometry";
import type { WallOpeningOptions } from "../shapes/WallShape";

export interface DiamondLatticeWindowOptions {
  /**
   * The opening. **The same object that punches the wall** — pass one description to both and the hole and
   * the window cannot drift apart.
   *
   * Any arch, including `square`: a flat head is an arch-shaped hole with no curve in it, so a rectangular
   * light and a gothic one are this one window with different points.
   */
  opening?: WallOpeningOptions;
  /**
   * Diamonds across the opening's width. Defaults to `4`.
   *
   * Counts rather than an angle, because alignment is the point: with counts, the diamonds' corners land
   * exactly on the jambs, the sill, and the springing line. Above the springing the head cuts what it
   * cuts — a curve is not a whole number of anything, and real leaded lights accept that too.
   */
  cellsX?: number;
  /** Diamonds from the sill up to the springing. Defaults to `4`. */
  cellsY?: number;
  /**
   * Width of the came across the glass. Defaults to `0.022`.
   *
   * An assembly option, not a lattice one: the frame's inner band is sized from it, which is what makes
   * the leading and the frame read as one piece of work rather than two.
   */
  cameWidth?: number;
  /** Depth of the came through the glass. Defaults to `cameWidth * 1.4` — real lead is deeper than wide. */
  cameDepth?: number;
  /** How finely the arch is followed. Shared by all three parts so they tessellate identically. Defaults to `24`. */
  curveSegments?: number;
  /** The frame. `false` omits it; an object overrides what the assembly would have chosen. */
  frame?: boolean | { inset?: number; outset?: number; depth?: number };
  /** The glass. `false` omits it; `rebate` runs the pane past the opening into a frame's groove. */
  glass?: boolean | { rebate?: number };
  /** Lead tint. Defaults to `#0c0f14`. */
  leadColor?: ColorRepresentation;
  /** Frame tint. Defaults to the lead's, because the two are one piece of ironwork. */
  frameColor?: ColorRepresentation;
  /** Glass tint. Defaults to `#6a7d8c`. */
  glassColor?: ColorRepresentation;
  /** Glass emissive, for moonlit or storm backlight. Defaults to off. */
  glassEmissive?: ColorRepresentation;
  /** Defaults to `0`. */
  glassEmissiveIntensity?: number;
}

/**
 * A leaded light: glass, diamond leading, and the frame that carries it.
 *
 * **Why these three and not some other bundle.** Leading has to be framed — cames cannot support cut glass
 * on their own — so this is a unit that exists in the world rather than a convenience grouping. The test
 * worth applying to any factory: *is the assembly a thing people have a name for?* A leaded light is.
 *
 * **A factory exposes what the ASSEMBLY decides, and delegates the rest.** So `cellsX` / `cellsY` are here
 * and `angle` / `spacing` are not — alignment determines them, and they are reported on the instance
 * rather than asked for. `cameWidth` is here because the frame is sized from it. `cameSides` is not,
 * because it has to agree with nothing; reach for {@link DiamondLatticeGeometry} directly for that.
 *
 * All three parts are built from ONE `opening`, which is also what you punch the wall with, so nothing has
 * to be kept in step by hand. Every part is exposed as a field, so any of them can be replaced without
 * forking this.
 *
 * Local frame: centred on X, sill at `y = 0`, facing `+Z` — the anchor the whole trio shares, so the
 * window drops straight into a wall hole built from the same description.
 *
 * @example
 * ```ts
 * const opening = { width: 1.24, height: 1.15, arch: "pointed", archHeight: 0.78 } as const;
 *
 * const wall = new Mesh(new ExtrudeGeometry(new WallShape({ windows: [opening] }), { depth: 0.3 }), stone);
 * const light = new DiamondLatticeWindow({ opening, cellsX: 4, cellsY: 4 });
 * ```
 */
export class DiamondLatticeWindow extends Group {
  readonly lattice: Mesh<DiamondLatticeGeometry, MeshStandardMaterial>;
  readonly frame?: Mesh<WindowFrameGeometry, MeshStandardMaterial>;
  readonly glass?: Mesh<PaneGeometry, MeshPhysicalMaterial>;

  readonly cellsX: number;
  readonly cellsY: number;
  /** The angle the cell counts worked out to, in degrees. An OUTPUT — see `cellsX`. */
  readonly angle: number;
  /** The came spacing the cell counts worked out to. An OUTPUT. */
  readonly spacing: number;

  constructor({
    opening = {},
    cellsX = 4,
    cellsY = 4,
    cameWidth = 0.022,
    cameDepth = cameWidth * 1.4,
    curveSegments = 24,
    frame = true,
    glass = true,
    leadColor = "#0c0f14",
    frameColor = leadColor,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
  }: DiamondLatticeWindowOptions = {}) {
    super();

    const width = opening.width ?? 1.2;
    const springing = opening.height ?? 1.4;

    // The alignment, solved. Crossings of the two came families land at x = v·s/(2 sin θ) and
    // y = u·s/(2 cos θ), so one diamond measures W = s/sin θ by H = s/cos θ. Read backwards:
    // θ = atan(H / W) and s = W·sin θ. Nothing is left to tune — which is exactly why the angle and the
    // spacing are reported here rather than accepted.
    const cellWidth = width / Math.max(1, cellsX);
    const cellHeight = springing / Math.max(1, cellsY);
    const theta = Math.atan2(cellHeight, cellWidth);

    this.cellsX = cellsX;
    this.cellsY = cellsY;
    this.angle = MathUtils.radToDeg(theta);
    this.spacing = cellWidth * Math.sin(theta);

    const leadMaterial = new MeshStandardMaterial({
      color: new Color(leadColor),
      roughness: 0.7,
      metalness: 0.35,
      flatShading: true,
      // The leading shares a plane with the glass, so it has to win the depth test.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.lattice = new Mesh(
      new DiamondLatticeGeometry({
        opening,
        angle: this.angle,
        spacing: this.spacing,
        phase: 0,
        cameWidth,
        cameDepth,
        curveSegments,
      }),
      leadMaterial,
    );
    this.lattice.castShadow = true;
    this.lattice.renderOrder = 1;
    this.add(this.lattice);

    if (frame) {
      // The assembly's decision, and the reason the two read as one piece of work: the frame's inner band
      // is the came's own width, so the leading appears to continue into the frame rather than stop at
      // it. The depth matches too, so nothing stands proud of anything.
      const settings = typeof frame === "object" ? frame : {};
      const depth = settings.depth ?? cameDepth;
      this.frame = new Mesh(
        new WindowFrameGeometry({
          opening,
          inset: settings.inset ?? cameWidth,
          outset: settings.outset ?? cameWidth * 1.6,
          depth,
          curveSegments,
        }),
        new MeshStandardMaterial({
          color: new Color(frameColor),
          roughness: 0.7,
          metalness: 0.35,
          flatShading: true,
        }),
      );
      // `WindowFrameGeometry` extrudes into +z from zero; centre it on the came so the two sit flush.
      this.frame.position.z = -depth / 2;
      this.frame.castShadow = true;
      this.add(this.frame);
    }

    if (glass) {
      const settings = typeof glass === "object" ? glass : {};
      this.glass = new Mesh(
        new PaneGeometry({ opening, rebate: settings.rebate ?? 0, curveSegments }),
        new MeshPhysicalMaterial({
          color: new Color(glassColor),
          emissive: glassEmissive ? new Color(glassEmissive) : new Color(0x000000),
          emissiveIntensity: glassEmissiveIntensity,
          transparent: true,
          depthWrite: false,
          roughness: 0.08,
          metalness: 0,
          transmission: glassEmissive ? 0.5 : 0.88,
          thickness: cameDepth * 0.5,
          side: DoubleSide,
        }),
      );
      // The pane is now the OPENING's own shape, not a rectangle behind it — so an arched light no longer
      // shows glass squared off in the corners.
      //
      // On the came's centreline at z = 0, because a came is an H-section wrapping the glass edge: the
      // glass runs through its middle, not behind it.
      this.glass.renderOrder = 0;
      this.glass.castShadow = false;
      this.glass.receiveShadow = false;
      this.add(this.glass);
    }
  }

  /** Release every geometry and material this window owns. */
  dispose(): void {
    for (const part of [this.lattice, this.frame, this.glass]) {
      if (!part) continue;
      part.geometry.dispose();
      part.material.dispose();
    }
  }
}

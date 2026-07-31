import {
  Color,
  type ColorRepresentation,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "three";
import { GregorianLatticeGeometry } from "../geometry/architecture/GregorianLatticeGeometry";
import { PaneGeometry } from "../geometry/architecture/PaneGeometry";
import { WindowFrameGeometry } from "../geometry/architecture/WindowFrameGeometry";
import type { WallOpeningOptions } from "../shapes/WallShape";

export interface GregorianLatticeWindowOptions {
  /**
   * The opening. **The same object that punches the wall** — pass one description to both and the hole and
   * the window cannot drift apart. Any arch, including `square`.
   */
  opening?: WallOpeningOptions;
  /**
   * Lights across the opening's width. Defaults to `3`.
   *
   * A LIGHT is one pane; `3` gives two mullions between three lights. Counts rather than a spacing,
   * because the divisions have to land evenly — the spacing and the phase are worked out from this and
   * reported back.
   */
  lightsAcross?: number;
  /** Lights from the sill up to the springing. Defaults to `4`. */
  lightsUp?: number;
  /**
   * Width of the glazing bar. Defaults to `0.03`.
   *
   * An assembly option: the frame's inner band is sized from it, which is what makes the bars and the
   * frame read as one piece of joinery.
   */
  barWidth?: number;
  /** Depth of the bar through the glass. Defaults to `barWidth`. */
  barDepth?: number;
  /** How finely the arch is followed, shared by all three parts. Defaults to `24`. */
  curveSegments?: number;
  /** The frame. `false` omits it; an object overrides what the assembly would have chosen. */
  frame?: boolean | { inset?: number; outset?: number; depth?: number };
  /** The glass. `false` omits it; `rebate` runs the pane past the opening into a frame's groove. */
  glass?: boolean | { rebate?: number };
  /** Bar and frame tint. Defaults to `#5c4033` — painted wood. */
  barColor?: ColorRepresentation;
  /** Frame tint. Defaults to the bar's, because the two are one piece of joinery. */
  frameColor?: ColorRepresentation;
  /** Glass tint. Defaults to `#6a7d8c`. */
  glassColor?: ColorRepresentation;
  /** Glass emissive, for a lit window seen from outside. Defaults to off. */
  glassEmissive?: ColorRepresentation;
  /** Defaults to `0`. */
  glassEmissiveIntensity?: number;
}

/**
 * A Gregorian light: glass, glazing bars, and the frame that carries them.
 *
 * The sibling of {@link DiamondLatticeWindow}, assembled the same way and for the same reason — bars have
 * to be framed, so the three are a unit rather than a convenience grouping.
 *
 * **A factory exposes what the ASSEMBLY decides, and delegates the rest.** So `lightsAcross` / `lightsUp`
 * are here and the bar spacings are not: even divisions determine them, and they are reported on the
 * instance rather than asked for. `barWidth` is here because the frame is sized from it. `barSides` is
 * not, because it has to agree with nothing — reach for {@link GregorianLatticeGeometry} for that.
 *
 * All three parts are built from ONE `opening`, which is also what you punch the wall with. Every part is
 * exposed as a field, so any of them can be replaced without forking this.
 *
 * Local frame: centred on X, sill at `y = 0`, facing `+Z`.
 *
 * @example
 * ```ts
 * const opening = { width: 1.2, height: 1.6, arch: "semicircle" } as const;
 *
 * const light = new GregorianLatticeWindow({ opening, lightsAcross: 3, lightsUp: 4 });
 * ```
 */
export class GregorianLatticeWindow extends Group {
  readonly bars: Mesh<GregorianLatticeGeometry, MeshStandardMaterial>;
  readonly frame?: Mesh<WindowFrameGeometry, MeshStandardMaterial>;
  readonly glass?: Mesh<PaneGeometry, MeshPhysicalMaterial>;

  readonly lightsAcross: number;
  readonly lightsUp: number;
  /** The mullion spacing the light counts worked out to. An OUTPUT. */
  readonly mullionSpacing: number;
  /** The transom spacing the light counts worked out to. An OUTPUT. */
  readonly transomSpacing: number;

  constructor({
    opening = {},
    lightsAcross = 3,
    lightsUp = 4,
    barWidth = 0.03,
    barDepth = barWidth,
    curveSegments = 24,
    frame = true,
    glass = true,
    barColor = "#5c4033",
    frameColor = barColor,
    glassColor = "#6a7d8c",
    glassEmissive,
    glassEmissiveIntensity = 0,
  }: GregorianLatticeWindowOptions = {}) {
    super();

    const width = opening.width ?? 1.2;
    const springing = opening.height ?? 1.4;

    const across = Math.max(1, Math.round(lightsAcross));
    const up = Math.max(1, Math.round(lightsUp));
    this.lightsAcross = across;
    this.lightsUp = up;
    this.mullionSpacing = width / across;
    this.transomSpacing = springing / up;

    // The phase decides whether the centreline carries a BAR or a LIGHT, and the light COUNT decides which
    // is wanted. `n` lights need `n − 1` bars between them:
    //
    //   ODD count  -> an even number of bars -> they pair up about the centre, and none sits on it,
    //                 so the family is offset by half a spacing.
    //   EVEN count -> an odd number of bars  -> one lands on the centreline, so no offset.
    //
    // Get it backwards and you get one bar too many, every time — the extra one being the centreline bar
    // that should have been a light.
    //
    // Bars landing exactly on the sill, the head, or a jamb need no special case: their section straddles
    // the boundary, so the same rule that drops offcuts drops them, and the frame occupies those spots.
    const mullionPhase = across % 2 === 0 ? 0 : this.mullionSpacing / 2;

    const barMaterial = new MeshStandardMaterial({
      color: new Color(barColor),
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
      // The bars share a plane with the glass, so they have to win the depth test.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.bars = new Mesh(
      new GregorianLatticeGeometry({
        opening,
        mullionSpacing: this.mullionSpacing,
        transomSpacing: this.transomSpacing,
        mullionPhase,
        // Zero puts a transom on the sill line, which is dropped — so the remaining ones land on exact
        // fractions of the springing height, which is what an evenly divided window means.
        transomPhase: 0,
        barWidth,
        barDepth,
        curveSegments,
      }),
      barMaterial,
    );
    this.bars.castShadow = true;
    this.bars.renderOrder = 1;
    this.add(this.bars);

    if (frame) {
      // The assembly's decision: the frame's inner band is the bar's own width, so the glazing bars appear
      // to run into the frame rather than stop at it. The depth matches too.
      const settings = typeof frame === "object" ? frame : {};
      const depth = settings.depth ?? barDepth;
      this.frame = new Mesh(
        new WindowFrameGeometry({
          opening,
          inset: settings.inset ?? barWidth,
          outset: settings.outset ?? barWidth * 1.6,
          depth,
          curveSegments,
        }),
        new MeshStandardMaterial({
          color: new Color(frameColor),
          roughness: 0.75,
          metalness: 0.05,
          flatShading: true,
        }),
      );
      // `WindowFrameGeometry` extrudes into +z from zero; centre it on the bar so the two sit flush.
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
          thickness: barDepth * 0.5,
          side: DoubleSide,
        }),
      );
      this.glass.renderOrder = 0;
      this.glass.castShadow = false;
      this.glass.receiveShadow = false;
      this.add(this.glass);
    }
  }

  /** Release every geometry and material this window owns. */
  dispose(): void {
    for (const part of [this.bars, this.frame, this.glass]) {
      if (!part) continue;
      part.geometry.dispose();
      part.material.dispose();
    }
  }
}

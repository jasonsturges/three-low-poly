import {
  BoxGeometry,
  Color,
  ColorRepresentation,
  DoubleSide,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
} from "three";
import {
  WindowFrameGeometry,
  type WindowFrameGeometryOptions,
} from "../geometry/architecture/WindowFrameGeometry";
import { openingOutline, wallOpeningTop, type WallOpeningOptions } from "../shapes/WallShape";
import { offsetLoop } from "../utils/OffsetLoop";

/** Match the jamb's inner edge (WindowFrameGeometry's INNER_MITER) so the glass fits it exactly. */
const JAMB_INNER_MITER = 2;

export interface WindowSillOptions {
  /**
   * How far the sill juts out of the wall. Defaults to `0.09`.
   *
   * The overhang is most of why a window reads as real — a flush sill reads as a sticker.
   */
  jut?: number;
  /** Thickness of the slab. Defaults to `0.04`. */
  thickness?: number;
  /**
   * How far the sill runs PAST the opening on each side — its horns. Defaults to `0.05`.
   *
   * Real sills overhang their jambs. Square them off at the opening and the window looks cut out rather
   * than built in.
   */
  horn?: number;
}

export interface WindowJambOptions {
  /**
   * How far the jamb lining bites into the aperture from the wall's cut edge — the visible board width.
   * Defaults to `0.05`.
   */
  width?: number;
}

export interface WindowOptions extends Omit<WindowFrameGeometryOptions, "opening"> {
  /** The opening this window fills — the SAME description the wall was punched with. */
  opening: WallOpeningOptions;
  /** Omit for a frameless aperture. */
  frame?: boolean;
  /** A sill under it. Pass `true` for the defaults, or an object to size it. Omit for none. */
  sill?: boolean | WindowSillOptions;
  /** Omit to leave the aperture empty — a broken window. */
  glass?: boolean;
  /**
   * The jamb — the lining of the reveal, running the full depth of the wall. Pass `true` for the
   * defaults, an object to size it. Omit for a bare opening.
   *
   * The decorative {@link WindowOptions.frame} is a shallow ring on the wall's FACE; the jamb is the
   * same ring turned 90° INTO the wall — deep and flush — so it lines the hole instead of the surface.
   * With a jamb, the glass drops to the wall's mid-depth and sits inside it, rather than clinging to the
   * front where it leaves the hole open behind. Needs {@link WindowOptions.wallThickness} to know how
   * deep to run.
   */
  jamb?: boolean | WindowJambOptions;
  /**
   * Thickness of the wall the window is set into — the depth the {@link WindowOptions.jamb} spans and the
   * span the glass centers in. Defaults to `0.3`. Ignored without a jamb.
   */
  wallThickness?: number;

  /** Frame material. Omit to build a flat-shaded standard material from `frameColor`. */
  frameMaterial?: Material;
  /** Frame tint when `frameMaterial` is omitted. Defaults to `#4a3b2a` — wood. */
  frameColor?: ColorRepresentation;
  /** Glass material. Omit to build a translucent one from `glassColor`. */
  glassMaterial?: Material;
  /** Glass tint when `glassMaterial` is omitted. Defaults to `#9fb6c4`. */
  glassColor?: ColorRepresentation;
  /** Glass opacity when `glassMaterial` is omitted. Defaults to `0.35`. */
  glassOpacity?: number;
}

/** A window: glass, the frame ringing it, the jamb lining the reveal, and the sill under it. */
export interface WindowAssembly extends Group {
  /** The pane. Flat, and `DoubleSide`, so it survives being looked at from behind. */
  glass?: Mesh;
  /** The decorative ring on the wall's face. */
  frame?: Mesh;
  /** The lining of the reveal, running the wall's full depth. */
  jamb?: Mesh;
  /** The slab under it. */
  sill?: Mesh;
}

/**
 * A window assembly, cut to fit an opening exactly — because it is cut from the SAME outline the wall was
 * punched with.
 *
 * ```ts
 * const opening = { width: 0.8, height: 1, arch: "ogee", x: -2, y: 1.5 };
 *
 * const wall = new WallShape({ width: 6, height: 4, windows: [opening] });
 * const window = createWindow({ opening, sill: true });
 * window.position.set(opening.x, opening.y, wallThickness); // the wall's outer face
 * ```
 *
 * The fit is not a coincidence to be maintained; it is the same `traceArch` call. Change the opening's
 * arch to a horseshoe and the glass, the frame and the hole all become horseshoes together.
 *
 * **Anchored at the SILL, centered on X** — `y = 0` is the sill and `z = 0` is the wall face the window
 * is mounted on, so hanging it is `position.set(opening.x, opening.y, faceZ)` and nothing else. The frame
 * and sill stand out in `+z`; the glass sits back inside the frame's depth.
 *
 * A {@link Group} with the parts named, not one merged mesh — glass has to be transparent and the frame
 * must not be, and a shared material array would force them to render together. Dispose each part.
 *
 * @example
 * ```ts
 * // A leaded pane in a stone wall, with the sill it needs to look built rather than cut.
 * const window = createWindow({
 *   opening: { width: 0.7, height: 0.9, arch: "pointed", archHeight: 0.5 },
 *   inset: 0.03,
 *   outset: 0.05,
 *   frameColor: "#2b2b2b",
 *   sill: { jut: 0.12, horn: 0.06 },
 * });
 * ```
 */
export function createWindow({
  opening,
  frame = true,
  sill,
  glass = true,
  jamb,
  wallThickness = 0.3,
  inset = 0.03,
  outset = 0.06,
  depth = 0.05,
  curveSegments = 48,
  frameMaterial,
  frameColor = "#4a3b2a",
  glassMaterial,
  glassColor = "#9fb6c4",
  glassOpacity = 0.35,
}: WindowOptions): WindowAssembly {
  const window = new Group() as WindowAssembly;

  // At the origin, so the assembly can be dropped into any opening of this shape.
  const centered: WallOpeningOptions = { ...opening, x: 0, y: 0 };

  const timber =
    frameMaterial ??
    new MeshStandardMaterial({ color: new Color(frameColor), roughness: 0.85, flatShading: true });

  if (frame) {
    window.frame = new Mesh(
      new WindowFrameGeometry({ opening: centered, inset, outset, depth, curveSegments }),
      timber,
    );
    window.frame.castShadow = true;
    window.frame.receiveShadow = true;
    window.add(window.frame);
  }

  const jambWidth = jamb ? (jamb === true ? 0.05 : jamb.width ?? 0.05) : 0;

  if (jamb) {
    // The same ring as the face frame, turned INTO the wall: deep (the wall's full thickness) and flush
    // (no outset), so its outer edge sits against the cut hole and its inner edge is the reveal you see.
    // The window mounts on the front face (z = 0), so the jamb runs back through the wall in -z.
    window.jamb = new Mesh(
      new WindowFrameGeometry({ opening: centered, inset: jambWidth, outset: 0, depth: wallThickness, curveSegments }),
      timber,
    );
    window.jamb.position.z = -wallThickness;
    window.jamb.castShadow = true;
    window.jamb.receiveShadow = true;
    window.add(window.jamb);
  }

  if (glass) {
    // With a jamb the glass fits the jamb's inner opening (the outline pulled in by the board width) and
    // centers in the wall; without one it fills the bare hole and clings to the frame's face.
    const glassShape = jamb
      ? new Shape(offsetLoop(openingOutline(centered).getPoints(curveSegments), -jambWidth, JAMB_INNER_MITER))
      : openingOutline(centered);

    // Flat, and DOUBLE-SIDED. A single-sided pane simply vanishes when the camera swings behind the
    // wall — the glass is still there, you are just looking at the back of a face that was never drawn.
    window.glass = new Mesh(
      new ShapeGeometry(glassShape, curveSegments),
      glassMaterial ??
        new MeshStandardMaterial({
          color: new Color(glassColor),
          transparent: true,
          opacity: glassOpacity,
          roughness: 0.15,
          metalness: 0,
          side: DoubleSide,
        }),
    );
    // Centered in the wall when there is a jamb to hold it; otherwise inside the frame's depth.
    window.glass.position.z = jamb ? -wallThickness / 2 : frame ? depth / 2 : 0;
    window.add(window.glass);
  }

  if (sill) {
    const { jut = 0.09, thickness = 0.04, horn = 0.05 } = sill === true ? {} : sill;

    // As wide as the frame it sits under, plus its horns.
    const half = (opening.width ?? 1.2) / 2 + outset + horn;

    window.sill = new Mesh(new BoxGeometry(half * 2, thickness, jut), timber);
    // Its top face meets the sill line of the opening, and it juts forward out of the wall.
    window.sill.position.set(0, -thickness / 2, jut / 2);
    window.sill.castShadow = true;
    window.sill.receiveShadow = true;
    window.add(window.sill);
  }

  return window;
}

/** The crown of a window's opening, above its sill. Handy for checking it clears the wall above. */
export function windowHeight(opening: WallOpeningOptions): number {
  return wallOpeningTop({ ...opening, y: 0 });
}

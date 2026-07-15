import {
  BoxGeometry,
  Color,
  ColorRepresentation,
  DoubleSide,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  ShapeGeometry,
} from "three";
import {
  WindowFrameGeometry,
  type WindowFrameGeometryOptions,
} from "../geometry/architecture/WindowFrameGeometry";
import { openingOutline, wallOpeningTop, type WallOpeningOptions } from "../shapes/WallShape";

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

export interface WindowOptions extends Omit<WindowFrameGeometryOptions, "opening"> {
  /** The opening this window fills — the SAME description the wall was punched with. */
  opening: WallOpeningOptions;
  /** Omit for a frameless aperture. */
  frame?: boolean;
  /** A sill under it. Pass `true` for the defaults, or an object to size it. Omit for none. */
  sill?: boolean | WindowSillOptions;
  /** Omit to leave the aperture empty — a broken window. */
  glass?: boolean;

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

/** A window: glass, the frame ringing it, and the sill under it. */
export interface WindowAssembly extends Group {
  /** The pane. Flat, and `DoubleSide`, so it survives being looked at from behind. */
  glass?: Mesh;
  /** The ring around the pane. */
  frame?: Mesh;
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

  if (glass) {
    // Flat, and DOUBLE-SIDED. A single-sided pane simply vanishes when the camera swings behind the
    // wall — the glass is still there, you are just looking at the back of a face that was never drawn.
    window.glass = new Mesh(
      new ShapeGeometry(openingOutline(centered), curveSegments),
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
    // Sit it INSIDE the frame's depth, so the frame reads as holding it from both faces.
    window.glass.position.z = frame ? depth / 2 : 0;
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

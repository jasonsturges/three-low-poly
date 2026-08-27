import { Color, type ColorRepresentation, Mesh, MeshStandardMaterial, type Vector2 } from "three";
import { LiquidFillGeometry } from "../geometry/vessels/LiquidFillGeometry";

/**
 * The shared "fill capability" — the optional liquid any vessel can carry.
 *
 * Level is geometry; colour, opacity and glow are material. One interface covers both so a filled vessel
 * is described the same way wherever it is composed (a flask in a stand, a tube in a rack, an example).
 */
export interface FillOptions {
  /** Fill level, as a fraction of the vessel's height. `0` (or omitted) is empty. */
  fill?: number;
  /** Liquid colour. Defaults to a pale green. */
  color?: ColorRepresentation;
  /** Liquid opacity. Defaults to `0.85`. */
  opacity?: number;
  /** Emissive glow, `0` for none. Defaults to `0`. */
  glow?: number;
  /** Radius inset from the glass wall, so the two surfaces don't z-fight. Defaults to `0.02`. */
  inset?: number;
}

/**
 * Build the liquid mesh for a vessel from its `profile` and a {@link FillOptions}.
 *
 * The composition step: geometry from {@link LiquidFillGeometry}, appearance from the options. One function
 * fills any vessel. Returns `null` when the vessel is empty. The mesh is given `renderOrder = 0` so it
 * draws before the glass — give the glass `renderOrder = 1`, since their centres coincide and depth
 * sorting cannot order them.
 */
export function createLiquidFill(profile: Vector2[], options: FillOptions = {}, radialSegments = 32): Mesh | null {
  const { fill = 0, color = 0x4bbfa0, opacity = 0.85, glow = 0, inset = 0.02 } = options;
  if (fill <= 0) return null;

  const geometry = new LiquidFillGeometry({ profile, fill, inset, radialSegments });
  if (!geometry.getAttribute("position")) {
    geometry.dispose();
    return null;
  }

  const material = new MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: 0.25,
    emissive: new Color(color),
    emissiveIntensity: glow,
  });

  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 0;
  return mesh;
}

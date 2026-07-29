import { BufferGeometry, CircleGeometry, LatheGeometry, Vector2 } from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Mortar — the bowl a {@link PestleGeometry} grinds in.
 *
 * Local frame: base at Y=0, centered on X and Z.
 *
 * TODO: **THE WALL HAS NO INNER SURFACE.** The profile climbs the outside and turns in across the rim,
 * then stops — so measured level by level there is exactly ONE radius at every height except the lip:
 *
 * ```
 *    y      rMin   rMax   thickness
 *   0.0    0.000  1.000   base disc
 *   0.5    1.200  1.200   0          <- single surface
 *   1.5    1.400  1.400   0          <- single surface
 *   1.8    0.800  1.300   0.5        <- the rim annulus, the only real thickness
 * ```
 *
 * Three consequences, in order of how much they matter:
 *
 *   1. **Interior normals face outward.** What reads as the inside of the bowl is the BACK FACE of the
 *      outer wall, so the interior shades as though lit from behind. This is why the material must be
 *      `DoubleSide` — not for style, but to render at all.
 *   2. **Wall thickness is 0.5 at the lip and 0 everywhere below it** — inconsistent as a solid.
 *   3. **The floor has no thickness.** The base disc is simultaneously the outside bottom and the
 *      inside floor.
 *
 * The fix is to finish the profile rather than patch it: continue from the lip DOWN the inner wall to
 * an inner floor above the base, so the lathe closes a real shell. Then thickness is a parameter, the
 * normals are right, and `DoubleSide` is no longer load-bearing.
 *
 * TODO: **NO PARAMETERS.** Every dimension is hardcoded, so its example panel can only offer material
 * controls. Wants the {@link VaseGeometry} treatment — the profile control points ARE the
 * parameterization — plus `wallThickness`, `floorThickness` and `radialSegments` as the low-poly knob
 * (currently fixed at 12).
 *
 * TODO: **A `mortarAndPestle()` FACTORY is the home for the assembled pair.** The old prefab posed a
 * pestle in the bowl at `(0.3, 1.3, 0)` with `rotation.z = π/4`, which looked right but did not
 * actually seat — the head never touched the bottom. Getting that contact right is arithmetic against
 * both profiles (bowl interior against pestle head), which is exactly a factory's job and not
 * something either geometry can know alone.
 */
class MortarGeometry extends BufferGeometry {
  constructor() {
    super();

    const mortarPoints = [
      new Vector2(1, 0), // Bottom of the bowl
      new Vector2(1.2, 0.5), // Slight flare at the base
      new Vector2(1.4, 1.5), // Outer wall
      new Vector2(1.3, 1.8), // Flared edge
      new Vector2(0.8, 1.8), // Lip of the bowl
    ];
    const mortarGeometry = new LatheGeometry(mortarPoints, 12);

    // Create a disk to close off the bottom
    const baseDisk = new CircleGeometry(1, 12); // Radius matches the base of the mortar
    baseDisk.rotateX(-Math.PI / 2); // Rotate to align with the bottom
    baseDisk.translate(0, 0, 0); // Position at the base of the mortar

    this.copy(mergeGeometries([mortarGeometry, baseDisk], false) as BufferGeometry);
  }
}

export { MortarGeometry };

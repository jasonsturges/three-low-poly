import { Group, Mesh, MeshStandardMaterial } from "three";
import { FlorenceFlaskGeometry, type FlorenceFlaskGeometryOptions } from "../geometry/vessels/FlorenceFlaskGeometry";
import { RingStandGeometry } from "../geometry/science/RingStandGeometry";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface FlorenceFlaskStandOptions {
  /** Flask geometry — resize the bulb, neck, etc. The ring re-sizes and re-seats to whatever bulb results. */
  flask?: FlorenceFlaskGeometryOptions;
  /** Optional liquid inside the flask — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /**
   * Ring radius as a fraction of the bulb radius — how deep the bulb sits. Defaults to `0.55`, which
   * cradles the lower third. Must be below `1`, or the ring is wider than the bulb and it falls through.
   */
  seat?: number;
  /** Ring tube thickness. Defaults to `0.03 ×` the bulb radius. */
  ringThickness?: number;
  /** Number of legs. Defaults to `3`. */
  legs?: number;
  /** Gap from the bulb's lowest point to the ground. Defaults to `0.15 ×` the bulb radius. */
  clearance?: number;
  /** Ring circumference segments. Defaults to `24`. */
  radialSegments?: number;
  /** Flask (glass) material. A translucent default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Stand (metal) material. A brushed-metal default is supplied. */
  standMaterial?: MeshStandardMaterial;
}

/**
 * Florence flask resting in a ring stand.
 *
 * A round-bottom flask cannot stand on its own; the stand is what makes it a thing that sits on a table.
 * This composes {@link FlorenceFlaskGeometry} and {@link RingStandGeometry} into a `Group` resting on Y=0.
 *
 * **The bulb is seated by radius, not tessellation.** The ring is sized to the bulb, and the bulb settles
 * until its surface is tangent to the ring tube — in an axial cross-section, a bulb circle of radius `R`
 * tangent (from inside) to a tube circle of radius `t` at ring radius `ringRadius`:
 *
 * ```
 * riseAboveRing = √((R + t)² − ringRadius²)
 * ```
 *
 * The flask is MEASURED (bounding box) rather than assumed, so the seating stays correct if
 * {@link FlorenceFlaskGeometry} is parameterized later.
 *
 * **Glass and metal are SEPARATE meshes, not one merged geometry.** Transparency sorts per object, so a
 * glass group baked into the opaque stand would sort wrong; the parts must stay separate objects.
 */
export class FlorenceFlaskStand extends Group {
  constructor({
    flask,
    fill,
    seat = 0.55,
    ringThickness,
    legs = 3,
    clearance,
    radialSegments = 24,
    glassMaterial,
    standMaterial,
  }: FlorenceFlaskStandOptions = {}) {
    super();

    // Measure the flask: the bulb is a sphere, so its widest ring is its equator.
    const flaskGeometry = new FlorenceFlaskGeometry(flask);
    flaskGeometry.computeBoundingBox();
    const box = flaskGeometry.boundingBox!;
    const bulbRadius = (box.max.x - box.min.x) / 2;
    const bulbCenterLocal = box.min.y + bulbRadius;

    const ringRadius = seat * bulbRadius;
    const t = ringThickness ?? 0.03 * bulbRadius;
    const clear = clearance ?? 0.15 * bulbRadius;

    // Bulb-center height above the ring plane (radius-based; clamped so a too-wide ring degrades gracefully).
    const rise = Math.sqrt(Math.max(0, (bulbRadius + t) ** 2 - ringRadius ** 2));
    // Stand height so the bulb's lowest point clears the ground by `clear`:
    //   bulbBottomWorld = standHeight + rise − bulbRadius  ⇒  set equal to clear.
    const standHeight = clear + bulbRadius - rise;

    const stand = new Mesh(
      new RingStandGeometry({ radius: ringRadius, height: standHeight, count: legs, thickness: t, radialSegments }),
      standMaterial ?? new MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4, flatShading: true }),
    );
    stand.castShadow = true;

    const flaskMesh = new Mesh(
      flaskGeometry,
      glassMaterial ??
        new MeshStandardMaterial({ color: 0xbfe3e0, roughness: 0.15, transparent: true, opacity: 0.4 }),
    );
    // Seat the bulb center at (ring plane + rise); the ring plane is at standHeight.
    flaskMesh.position.y = standHeight + rise - bulbCenterLocal;
    flaskMesh.castShadow = true;
    flaskMesh.renderOrder = 1; // glass after the liquid

    this.add(stand, flaskMesh);

    if (fill) {
      const liquid = createLiquidFill(flaskGeometry.profile, fill, radialSegments);
      if (liquid) {
        liquid.position.y = flaskMesh.position.y;
        this.add(liquid);
      }
    }
  }
}

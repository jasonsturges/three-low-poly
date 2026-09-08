import { ArchedSlabGeometry, type ArchedSlabGeometryOptions } from "../shapes/ArchedSlabGeometry";

export interface RoundedHeadstoneGeometryOptions extends ArchedSlabGeometryOptions {}

/**
 * A round-topped headstone — the classic one.
 *
 * **It is an {@link ArchedSlabGeometry} with a headstone's defaults, and nothing else.** It used to be a
 * box welded to half a cylinder: the same silhouette arrived at the hard way, with no `curveSegments`
 * knob, no arch styles, and a smooth-shaded cap sitting on a faceted body.
 *
 * Being the slab means it inherits the whole arch vocabulary for free — including the SHOULDERS the slab
 * was designed for in the first place (`archWidth` narrower than `width`), which is the shape you see in
 * every real cemetery and which this, of all things, could not previously make.
 *
 * Defaults reproduce the original silhouette: `0.6` wide, `0.2` deep, `1.0` tall overall — a `0.7` body
 * under a `0.3` cap, which is exactly `width / 2` and therefore a true semicircle.
 *
 * Base at `y = 0`, centered on X and Z.
 *
 * @example
 * ```ts
 * const classic    = new RoundedHeadstoneGeometry();
 * const shouldered = new RoundedHeadstoneGeometry({ width: 0.7, archWidth: 0.45 });
 * const ogee       = new RoundedHeadstoneGeometry({ arch: "ogee", archHeight: 0.45 });
 * ```
 */
export class RoundedHeadstoneGeometry extends ArchedSlabGeometry {
  constructor({
    width = 0.6,
    height = 0.7,
    archHeight = width / 2,
    depth = 0.2,
    arch = "semicircle",
    curveSegments = 16,
    ...rest
  }: RoundedHeadstoneGeometryOptions = {}) {
    super({ width, height, archHeight, depth, arch, curveSegments, ...rest });

    // The slab extrudes 0 → depth. A headstone leans and sinks about its own middle, so center it on Z
    // like every other stone in the row — the row factory measures half-depth off this.
    this.translate(0, 0, -depth / 2);
  }
}

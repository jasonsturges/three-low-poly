import { BufferGeometry, type Vector2 } from "three";
import { extrudeOutline } from "./stoneParts";
import { TABLET_OUTLINE_DEFAULTS, TABLET_TOPS, tabletOutline, type TabletOutlineOptions, type TabletTopName } from "./tabletOutline";

export interface TabletHeadstoneOptions extends TabletOutlineOptions {
  /** A trade-chart name to start from; any outline option given alongside it wins. Defaults to `null`. */
  preset?: TabletTopName | null;
  /** Thickness of the slab, face to back, before the arris is taken off. Defaults to `0.1`. */
  depth?: number;
  /**
   * The chamfer taken off every arris, face and back. It is what makes a cut stone read under moonlight: a
   * sharp-edged slab shows one lit face and one dark one, a chamfered one shows a bright line where they
   * meet. Kept INSIDE the outline, so the stone's silhouette is exactly the outline's. Defaults to `0.01`.
   */
  bevel?: number;
}

export const TABLET_HEADSTONE_DEFAULTS: Required<TabletHeadstoneOptions> = {
  ...TABLET_OUTLINE_DEFAULTS,
  preset: null,
  depth: 0.1,
  bevel: 0.01,
};

/**
 * A tablet headstone: the {@link tabletOutline} extruded through the stone's thickness, with a chamfered
 * arris all round.
 *
 * Base at `y = 0`, centred on X and Z, the face toward `+Z` — the frame every stone in
 * {@link HEADSTONE_CATALOG} shares, so it drops into the same layouts. Set it a few centimetres INTO
 * whatever it stands in (the ground, a plinth) so it is housed, not standing on a coplanar face.
 */
export class TabletHeadstoneGeometry extends BufferGeometry {
  /** The silhouette it was cut from, in its own plane — for anything that has to fit against it. */
  readonly outline: Vector2[];
  /** Height at the highest point of the top. */
  readonly height: number;

  constructor(options: TabletHeadstoneOptions = {}) {
    const preset = options.preset ? TABLET_TOPS[options.preset].options : {};
    const o: Required<TabletHeadstoneOptions> = { ...TABLET_HEADSTONE_DEFAULTS, ...preset, ...options };
    const outline = tabletOutline(o);
    super();
    const solid = extrudeOutline(outline, o.depth, { bevel: o.bevel });
    this.copy(solid);
    solid.dispose();
    this.outline = outline;
    this.height = outline.reduce((m, p) => Math.max(m, p.y), 0);
  }
}

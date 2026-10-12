import type { BufferGeometry } from "three";
import type { MoldingStyle } from "../../modeling/profiles/MoldingProfiles";
import { TabletHeadstoneGeometry, type TabletHeadstoneOptions } from "./TabletHeadstoneGeometry";
import { HOUSE, PLINTH_DEFAULTS, bevelBox, extrudeAlongX, mergeStone, mouldingRing, plinthParts, type PlinthOptions } from "./stoneParts";

/**
 * The low markers: a tablet on a moulded plinth, the horizontal stele, the ledger over a grave, the lectern.
 * One material each — every function returns a single merged geometry, base at `y = 0`, centred on X and
 * Z, the inscribed face toward `+Z`.
 */

//------------------------------
//  Tablet on a plinth
//------------------------------

export interface PlinthTabletOptions {
  /** The stone. Defaults to the chart's oval top with scotia shoulders, 0.12 thick. */
  tablet?: TabletHeadstoneOptions;
  /** The block under it. See {@link PlinthOptions}. */
  plinth?: PlinthOptions;
  /** A moulding round the stone's foot where it enters the plinth; `null` for none. Defaults to `"cove"`. */
  footStyle?: MoldingStyle | null;
}

export const PLINTH_TABLET_DEFAULTS: Required<PlinthTabletOptions> = {
  tablet: { preset: "ovalScotia", depth: 0.12 },
  plinth: {},
  footStyle: "cove",
};

/** A tablet set into a moulded plinth — the ordinary Victorian headstone, done properly. */
export function plinthTabletGeometry(options: PlinthTabletOptions = {}): BufferGeometry {
  const o = { ...PLINTH_TABLET_DEFAULTS, ...options };
  const plinth = { ...PLINTH_DEFAULTS, ...o.plinth };
  const tabletOptions = { ...PLINTH_TABLET_DEFAULTS.tablet, ...o.tablet };
  const parts = plinthParts(plinth);
  const tablet = new TabletHeadstoneGeometry(tabletOptions);
  tablet.translate(0, plinth.height - HOUSE, 0);
  parts.push(tablet);
  if (o.footStyle) {
    const width = tabletOptions.width ?? 0.6;
    const depth = tabletOptions.depth ?? 0.1;
    parts.push(mouldingRing(width - 0.004, depth - 0.004, plinth.height - 0.002, { run: "base", style: o.footStyle, drop: 0.03, projection: 0.018 }));
  }
  return mergeStone(parts);
}

/** The horizontal stele: a wide, low cambered stone on a long plinth. */
export function horizontalSteleGeometry(): BufferGeometry {
  return plinthTabletGeometry({
    tablet: { top: "camber", width: 0.98, height: 0.46, rise: 0.08, depth: 0.16, shoulder: "checked", shoulderWidth: 0.05, shoulderDrop: 0.04 },
    plinth: { width: 1.14, height: 0.16, depth: 0.34 },
    footStyle: "cove",
  });
}

//------------------------------
//  Ledger
//------------------------------

export interface LedgerOptions {
  /** Across the grave. Defaults to `0.95`. */
  width?: number;
  /** Along the grave. Defaults to `2.05`. */
  length?: number;
  /** The base slab's height. Defaults to `0.16`. */
  slabHeight?: number;
  /** How far the barrel's side stands in from the slab's edge. Defaults to `0.08`. */
  margin?: number;
  /** Height of the barrel's crown above its springing. Defaults to `0.13`. */
  rise?: number;
  /** Height of the barrel's straight sides before it springs. Defaults to `0.05`. */
  springing?: number;
}

export const LEDGER_DEFAULTS: Required<LedgerOptions> = {
  width: 0.95,
  length: 2.05,
  slabHeight: 0.16,
  margin: 0.08,
  rise: 0.13,
  springing: 0.05,
};

/**
 * A ledger: the stone lid laid over the whole grave, a slab with a barrel-vaulted top — a segmental arc
 * across, run the grave's length — and a cove where the barrel meets the slab. Lies along Z, head at `−Z`.
 */
export function ledgerGeometry(options: LedgerOptions = {}): BufferGeometry {
  const o = { ...LEDGER_DEFAULTS, ...options };
  const barrelWidth = o.width - o.margin * 2;
  const barrelLength = o.length - o.margin * 2;
  const half = barrelWidth / 2;
  const radius = (half * half + o.rise * o.rise) / (2 * o.rise);
  //  The barrel's section across the grave: straight sides, then a circular segment.
  const section: [number, number][] = [
    [half, -HOUSE],
    [half, o.springing],
  ];
  const n = 12;
  for (let i = 1; i < n; i++) {
    const z = half - (i / n) * barrelWidth;
    section.push([z, o.springing + Math.sqrt(radius * radius - z * z) - (radius - o.rise)]);
  }
  section.push([-half, o.springing], [-half, -HOUSE]);
  const barrel = extrudeAlongX(section, barrelLength, 0.012);
  barrel.rotateY(Math.PI / 2);
  barrel.translate(0, o.slabHeight, 0);
  return mergeStone([
    bevelBox(o.width, o.slabHeight, o.length),
    barrel,
    mouldingRing(barrelWidth - 0.004, barrelLength - 0.004, o.slabHeight - 0.002, { run: "base", style: "cove", drop: 0.035, projection: 0.025 }),
  ]);
}

//------------------------------
//  Lectern
//------------------------------

export interface LecternOptions {
  /** Defaults to `0.56`. */
  width?: number;
  /** Front to back. Defaults to `0.36`. */
  depth?: number;
  /** Height at the back. Defaults to `0.44`. */
  backHeight?: number;
  /** Height at the front, where the sloped face starts. Defaults to `0.2`. */
  frontHeight?: number;
}

export const LECTERN_DEFAULTS: Required<LecternOptions> = {
  width: 0.56,
  depth: 0.36,
  backHeight: 0.44,
  frontHeight: 0.2,
};

/**
 * A lectern marker: a wedge whose sloped top is the inscribed face, raised toward the reader like a book on
 * a stand — the one marker read from above. On a low capped plinth.
 */
export function lecternGeometry(options: LecternOptions = {}): BufferGeometry {
  const o = { ...LECTERN_DEFAULTS, ...options };
  const h = o.depth / 2;
  const base = 0.08;
  const wedge = extrudeAlongX(
    [
      [-h, -HOUSE],
      [h, -HOUSE],
      [h, o.frontHeight],
      [-h, o.backHeight],
    ],
    o.width,
    0.014,
  );
  wedge.translate(0, base, 0);
  return mergeStone([...plinthParts({ width: o.width + 0.1, height: base, depth: o.depth + 0.1, capStyle: "chamfer", capDrop: 0.025, capProjection: 0.018 }), wedge]);
}

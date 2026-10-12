import { type BufferGeometry, Plane, Vector3 } from "three";
import { sliceGeometry } from "../../modeling/mesh/SliceGeometry";
import { crossGeometry } from "./crosses";
import { horizontalSteleGeometry, lecternGeometry, ledgerGeometry, plinthTabletGeometry } from "./markers";
import {
  columnUrnGeometry,
  exedraGeometry,
  obeliskGeometry,
  pedestalMonumentGeometry,
  pierGeometry,
  pyramidMonumentGeometry,
  sarcophagusGeometry,
  steppedObeliskGeometry,
} from "./monuments";
import { TabletHeadstoneGeometry } from "./TabletHeadstoneGeometry";
import { TABLET_TOPS, type TabletTopName } from "./tabletOutline";

/**
 * The cemetery's stones, as one catalogue.
 *
 * Every entry is a name, a label, a family, a weight, and a `build()` that returns ONE geometry for ONE
 * stone material — base at `y = 0`, centred on X and Z, the inscribed face toward `+Z`. That shared frame
 * is what lets any of them be instanced, laid in a row, settled and leaned the same way.
 *
 * Nothing here is a class per stone. A tablet is an outline preset; a cross is a cross with options; a
 * monument is an assembly of the mason's kit. The catalogue just names the ones worth naming.
 *
 * ```ts
 * const geometry = createHeadstone("tablet/ovalScotia");
 * const tablets = HEADSTONE_CATALOG.filter((entry) => entry.family === "tablet");
 * ```
 */

/**
 * - `"tablet"` — an upright slab cut from an outline. Stands in a row.
 * - `"cross"` — a cross, plain, flared, Celtic or on a calvary. Stands in a row.
 * - `"obelisk"` — a tapered shaft on a base. The small one stands in a row; the tall one wants room.
 * - `"monument"` — a plinth-and-die assembly, a ledger, a sarcophagus, an exedra. Wants a plot of its own.
 */
export type HeadstoneFamily = "tablet" | "cross" | "obelisk" | "monument";

export type HeadstoneName =
  | `tablet/${TabletTopName}`
  | "cross/latin"
  | "cross/flared"
  | "cross/celtic"
  | "cross/calvary"
  | "obelisk/stepped"
  | "obelisk/tall"
  | "monument/plinthTablet"
  | "monument/plinthGothic"
  | "monument/horizontalStele"
  | "monument/ledger"
  | "monument/lectern"
  | "monument/cippus"
  | "monument/altar"
  | "monument/pier"
  | "monument/columnUrn"
  | "monument/pyramid"
  | "monument/sarcophagus"
  | "monument/exedra";

export interface HeadstoneEntry {
  /** Catalogue key: `<family>/<kind>`. */
  name: HeadstoneName;
  /** What the stonecutter would call it. */
  label: string;
  family: HeadstoneFamily;
  /** Relative frequency when drawing at random. */
  weight: number;
  /** Build a fresh geometry. The caller owns and disposes it. */
  build(): BufferGeometry;
}

/** The chart's plainer tops were cut far more often than its fancy ones. */
const TABLET_WEIGHTS: Partial<Record<TabletTopName, number>> = {
  square: 3,
  camber: 3,
  halfRound: 3,
  halfRoundShoulders: 3,
  checked: 3,
  serpentine: 1,
  raisedShoulder: 1,
  ogeeArch: 1,
};

const TABLETS: HeadstoneEntry[] = (Object.keys(TABLET_TOPS) as TabletTopName[]).map((key) => ({
  name: `tablet/${key}`,
  label: TABLET_TOPS[key].label,
  family: "tablet",
  weight: TABLET_WEIGHTS[key] ?? 2,
  build: () => new TabletHeadstoneGeometry({ preset: key }),
}));

const CROSSES: HeadstoneEntry[] = [
  { name: "cross/latin", label: "Latin Cross", family: "cross", weight: 2, build: () => crossGeometry() },
  { name: "cross/flared", label: "Flared Cross", family: "cross", weight: 1, build: () => crossGeometry({ span: 0.6, thickness: 0.12, flare: 0.04, crossing: 0.7 }) },
  {
    name: "cross/celtic",
    label: "Celtic Cross",
    family: "cross",
    weight: 2,
    build: () => crossGeometry({ height: 1.3, span: 0.62, thickness: 0.12, crossing: 0.7, flare: 0.03, ring: true }),
  },
  { name: "cross/calvary", label: "Cross on Calvary", family: "cross", weight: 1, build: () => crossGeometry({ height: 0.95, steps: 3 }) },
];

const OBELISKS: HeadstoneEntry[] = [
  { name: "obelisk/stepped", label: "Stepped Obelisk", family: "obelisk", weight: 2, build: () => steppedObeliskGeometry() },
  { name: "obelisk/tall", label: "Obelisk", family: "obelisk", weight: 1, build: () => obeliskGeometry() },
];

const MONUMENTS: HeadstoneEntry[] = [
  { name: "monument/plinthTablet", label: "Tablet on Plinth", family: "monument", weight: 4, build: () => plinthTabletGeometry() },
  {
    name: "monument/plinthGothic",
    label: "Gothic Tablet on Plinth",
    family: "monument",
    weight: 2,
    build: () => plinthTabletGeometry({ tablet: { preset: "squareGothic", depth: 0.12 } }),
  },
  { name: "monument/horizontalStele", label: "Stele, Horizontal", family: "monument", weight: 2, build: () => horizontalSteleGeometry() },
  { name: "monument/ledger", label: "Ledger", family: "monument", weight: 2, build: () => ledgerGeometry() },
  { name: "monument/lectern", label: "Lectern", family: "monument", weight: 2, build: () => lecternGeometry() },
  { name: "monument/cippus", label: "Cippus", family: "monument", weight: 1, build: () => pedestalMonumentGeometry() },
  { name: "monument/altar", label: "Altar", family: "monument", weight: 1, build: () => pedestalMonumentGeometry({ finish: "urn", dieHeight: 0.52 }) },
  { name: "monument/pier", label: "Pier", family: "monument", weight: 1, build: () => pierGeometry() },
  { name: "monument/columnUrn", label: "Column with Urn", family: "monument", weight: 1, build: () => columnUrnGeometry() },
  { name: "monument/pyramid", label: "Pyramid", family: "monument", weight: 0.5, build: () => pyramidMonumentGeometry() },
  { name: "monument/sarcophagus", label: "Sarcophagus", family: "monument", weight: 1, build: () => sarcophagusGeometry() },
  { name: "monument/exedra", label: "Exedra", family: "monument", weight: 0.3, build: () => exedraGeometry() },
];

/** Every stone in the collection: tablets, crosses, obelisks, then monuments. */
export const HEADSTONE_CATALOG: readonly HeadstoneEntry[] = [...TABLETS, ...CROSSES, ...OBELISKS, ...MONUMENTS];

/**
 * The stones that stand in a row on an ordinary plot — every family but the monuments. The default palette
 * of {@link rowOfHeadstones} and {@link fieldOfHeadstones}.
 */
export const ROW_HEADSTONES: readonly HeadstoneEntry[] = HEADSTONE_CATALOG.filter((entry) => entry.family !== "monument");

/** Build one stone by its catalogue name. The caller owns and disposes it. */
export function createHeadstone(name: HeadstoneName): BufferGeometry {
  const entry = HEADSTONE_CATALOG.find((e) => e.name === name);
  if (!entry) throw new Error(`createHeadstone: no stone named "${name}"`);
  return entry.build();
}

//------------------------------
//  Condition
//------------------------------

export interface BrokenHeadstoneOptions {
  /** Where the break runs, as a fraction of the stone's height. Defaults to `0.58`. */
  at?: number;
  /** How far the break leans off level, radians. Defaults to `0.12`. */
  tilt?: number;
}

/**
 * Snap a stone across — a CONDITION any stone can be in, not a kind of stone. A tilted plane cuts it into
 * the STUMP, which keeps the stone's frame and stays standing, and the TOP, re-origined to its own centre
 * so it can be laid down about it. Both cuts are capped. The source is left alone.
 */
export function breakHeadstone(source: BufferGeometry, { at = 0.58, tilt = 0.12 }: BrokenHeadstoneOptions = {}): { stump: BufferGeometry; top: BufferGeometry } {
  source.computeBoundingBox();
  const height = source.boundingBox!.max.y;
  const normal = new Vector3(Math.sin(tilt), 1, Math.sin(tilt) * 0.4).normalize();
  const plane = new Plane(normal, -normal.dot(new Vector3(0, height * at, 0)));
  const { negative, positive } = sliceGeometry(source, plane, { cap: true });
  positive.computeBoundingBox();
  const center = positive.boundingBox!.getCenter(new Vector3());
  positive.translate(-center.x, -center.y, -center.z);
  return { stump: negative, top: positive };
}

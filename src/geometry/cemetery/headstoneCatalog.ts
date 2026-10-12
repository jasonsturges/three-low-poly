import { type BufferGeometry, Plane, Vector3 } from "three";
import { sliceGeometry } from "../../modeling/mesh/SliceGeometry";
import { CROSS_DEFAULTS, type CrossOptions, crossGeometry } from "./crosses";
import { HORIZONTAL_STELE_OPTIONS, LECTERN_DEFAULTS, LEDGER_DEFAULTS, PLINTH_TABLET_DEFAULTS, type PlinthTabletOptions, lecternGeometry, ledgerGeometry, plinthTabletGeometry } from "./markers";
import {
  COLUMN_URN_DEFAULTS,
  EXEDRA_DEFAULTS,
  OBELISK_DEFAULTS,
  PEDESTAL_MONUMENT_DEFAULTS,
  PIER_DEFAULTS,
  PYRAMID_MONUMENT_DEFAULTS,
  SARCOPHAGUS_DEFAULTS,
  STEPPED_OBELISK_DEFAULTS,
  columnUrnGeometry,
  exedraGeometry,
  obeliskGeometry,
  pedestalMonumentGeometry,
  pierGeometry,
  pyramidMonumentGeometry,
  sarcophagusGeometry,
  steppedObeliskGeometry,
} from "./monuments";
import { PLINTH_DEFAULTS } from "./stoneParts";
import { TabletHeadstoneGeometry, resolveTabletOptions } from "./TabletHeadstoneGeometry";
import { TABLET_SHOULDER_NAMES, TABLET_TOP_NAMES, TABLET_TOPS, type TabletTopName } from "./tabletOutline";

/**
 * The cemetery's stones, as one catalogue.
 *
 * Every entry is a name, a label, a family, a weight, the OPTIONS it is built with, and a `build()` that
 * returns ONE geometry for ONE stone material — base at `y = 0`, centred on X and Z, the inscribed face
 * toward `+Z`. That shared frame is what lets any of them be instanced, laid in a row, settled and leaned the
 * same way.
 *
 * The options are the builder's own — a tablet's `top` and `shoulder`, a cross's `span` and `ring`, an
 * obelisk's `shaftHeight` — fully resolved, so they describe the stone by themselves. `build()` with no
 * argument is the catalogue's stone; `build(overrides)` is a variation on it. Nothing is shared between
 * builders but the mechanism: a tool can read any entry's options and offer them back.
 *
 * Nothing here is a class per stone. A tablet is an outline preset; a cross is a cross with options; a
 * monument is an assembly of the mason's kit. The catalogue just names the ones worth naming.
 *
 * ```ts
 * import { Mesh } from "three";
 * import { createHeadstone, fieldOfHeadstones, HEADSTONE_CATALOG } from "three-low-poly";
 *
 * // Exactly the stone in the gallery, all defaults included
 * const geometry = createHeadstone("tablet/squareScotia");
 * scene.add(new Mesh(geometry, stoneMaterial));
 *
 * // The same stone with a few changes; everything else stays the catalogue's
 * const taller = createHeadstone("tablet/squareScotia", { height: 1.1, depth: 0.14 });
 *
 * // A slice of the catalogue — every cross — to fill a yard with
 * const crosses = HEADSTONE_CATALOG.filter((entry) => entry.family === "cross");
 * const yard = fieldOfHeadstones({ catalog: crosses, columns: 8, rows: 6 });
 * ```
 *
 * The names are `<family>/<kind>` — the Headstone Gallery's `selected` dropdown shows each one as it is
 * spelled here.
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

/** Allowed values for an option that is a choice, keyed by the option's name. `null` is a real choice. */
export type HeadstoneChoices = Readonly<Record<string, readonly (string | null)[]>>;

export interface HeadstoneEntry {
  /** Catalogue key: `<family>/<kind>`. */
  name: HeadstoneName;
  /** What the stonecutter would call it. */
  label: string;
  family: HeadstoneFamily;
  /** Relative frequency when drawing at random. */
  weight: number;
  /**
   * Every option the stone is built with, resolved — its builder's own options interface, nested where the
   * builder nests (a tablet on a plinth carries `tablet` and `plinth`). Read it; don't mutate it.
   */
  options: Readonly<object>;
  /** The options that are a choice among names, and the names — for a chooser. Keyed by option name at any depth. */
  choices: HeadstoneChoices;
  /** Build a fresh geometry, from {@link options} with any `overrides` laid over them. The caller owns and disposes it. */
  build(overrides?: object): BufferGeometry;
}

/** Bind a builder to its options: `build()` is the catalogue's stone, `build(overrides)` a variation on it. */
function defineHeadstone<O extends object>(spec: {
  name: HeadstoneName;
  label: string;
  family: HeadstoneFamily;
  weight: number;
  options: O;
  choices?: HeadstoneChoices;
  build: (options: O) => BufferGeometry;
}): HeadstoneEntry {
  const { build, options } = spec;
  return { ...spec, choices: spec.choices ?? {}, build: (overrides = {}) => build({ ...options, ...overrides }) };
}

const MOULD_STYLES = ["cove", "ovolo", "chamfer", "ogee", "cyma", "scotia", "fillet", "step"] as const;
const TABLET_CHOICES: HeadstoneChoices = { top: TABLET_TOP_NAMES, shoulder: TABLET_SHOULDER_NAMES, rightShoulder: [null, ...TABLET_SHOULDER_NAMES] };
const PLINTH_CHOICES: HeadstoneChoices = { ...TABLET_CHOICES, capStyle: [null, ...MOULD_STYLES], footStyle: [null, ...MOULD_STYLES] };

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

const TABLETS: HeadstoneEntry[] = (Object.keys(TABLET_TOPS) as TabletTopName[]).map((key) =>
  defineHeadstone({
    name: `tablet/${key}`,
    label: TABLET_TOPS[key].label,
    family: "tablet",
    weight: TABLET_WEIGHTS[key] ?? 2,
    options: resolveTabletOptions({ preset: key }),
    choices: TABLET_CHOICES,
    build: (o) => new TabletHeadstoneGeometry(o),
  }),
);

const cross = (name: HeadstoneName, label: string, weight: number, options: CrossOptions) =>
  defineHeadstone({ name, label, family: "cross", weight, options: { ...CROSS_DEFAULTS, ...options }, build: crossGeometry });

const CROSSES: HeadstoneEntry[] = [
  cross("cross/latin", "Latin Cross", 2, {}),
  cross("cross/flared", "Flared Cross", 1, { span: 0.6, thickness: 0.12, flare: 0.04, crossing: 0.7 }),
  cross("cross/celtic", "Celtic Cross", 2, { height: 1.3, span: 0.62, thickness: 0.12, crossing: 0.7, flare: 0.03, ring: true }),
  cross("cross/calvary", "Cross on Calvary", 1, { height: 0.95, steps: 3 }),
];

const OBELISKS: HeadstoneEntry[] = [
  defineHeadstone({ name: "obelisk/stepped", label: "Stepped Obelisk", family: "obelisk", weight: 2, options: { ...STEPPED_OBELISK_DEFAULTS }, build: steppedObeliskGeometry }),
  defineHeadstone({ name: "obelisk/tall", label: "Obelisk", family: "obelisk", weight: 1, options: { ...OBELISK_DEFAULTS }, build: obeliskGeometry }),
];

/** A tablet on a plinth, every level resolved — the tablet over the plinth tablet's own default stone. */
const plinthTablet = (options: PlinthTabletOptions) => ({
  tablet: resolveTabletOptions({ ...PLINTH_TABLET_DEFAULTS.tablet, ...options.tablet }),
  plinth: { ...PLINTH_DEFAULTS, ...options.plinth },
  footStyle: options.footStyle === undefined ? PLINTH_TABLET_DEFAULTS.footStyle : options.footStyle,
});

const monument = <O extends object>(name: HeadstoneName, label: string, weight: number, options: O, build: (options: O) => BufferGeometry, choices?: HeadstoneChoices) =>
  defineHeadstone({ name, label, family: "monument", weight, options, build, choices });

const MONUMENTS: HeadstoneEntry[] = [
  monument("monument/plinthTablet", "Tablet on Plinth", 4, plinthTablet({}), plinthTabletGeometry, PLINTH_CHOICES),
  monument("monument/plinthGothic", "Gothic Tablet on Plinth", 2, plinthTablet({ tablet: { preset: "squareGothic", depth: 0.12 } }), plinthTabletGeometry, PLINTH_CHOICES),
  monument("monument/horizontalStele", "Stele, Horizontal", 2, plinthTablet(HORIZONTAL_STELE_OPTIONS), plinthTabletGeometry, PLINTH_CHOICES),
  monument("monument/ledger", "Ledger", 2, { ...LEDGER_DEFAULTS }, ledgerGeometry),
  monument("monument/lectern", "Lectern", 2, { ...LECTERN_DEFAULTS }, lecternGeometry),
  monument("monument/cippus", "Cippus", 1, { ...PEDESTAL_MONUMENT_DEFAULTS }, pedestalMonumentGeometry, { finish: ["acroteria", "urn", "none"] }),
  monument("monument/altar", "Altar", 1, { ...PEDESTAL_MONUMENT_DEFAULTS, finish: "urn" as const, dieHeight: 0.52 }, pedestalMonumentGeometry, { finish: ["acroteria", "urn", "none"] }),
  monument("monument/pier", "Pier", 1, { ...PIER_DEFAULTS }, pierGeometry),
  monument("monument/columnUrn", "Column with Urn", 1, { ...COLUMN_URN_DEFAULTS }, columnUrnGeometry),
  monument("monument/pyramid", "Pyramid", 0.5, { ...PYRAMID_MONUMENT_DEFAULTS }, pyramidMonumentGeometry),
  monument("monument/sarcophagus", "Sarcophagus", 1, { ...SARCOPHAGUS_DEFAULTS }, sarcophagusGeometry),
  monument("monument/exedra", "Exedra", 0.3, { ...EXEDRA_DEFAULTS }, exedraGeometry),
];

/** Every stone in the collection: tablets, crosses, obelisks, then monuments. */
export const HEADSTONE_CATALOG: readonly HeadstoneEntry[] = [...TABLETS, ...CROSSES, ...OBELISKS, ...MONUMENTS];

/**
 * The stones that stand in a row on an ordinary plot — every family but the monuments. The default palette
 * of {@link rowOfHeadstones} and {@link fieldOfHeadstones}.
 */
export const ROW_HEADSTONES: readonly HeadstoneEntry[] = HEADSTONE_CATALOG.filter((entry) => entry.family !== "monument");

/**
 * Build one stone by its catalogue name — exactly as the catalogue has it, or with `overrides` laid over its
 * options. The caller owns and disposes it.
 *
 * @example
 * ```ts
 * import { Mesh } from "three";
 * import { createHeadstone } from "three-low-poly";
 *
 * // Exactly the stone in the gallery, all defaults included
 * const geometry = createHeadstone("tablet/squareScotia");
 * scene.add(new Mesh(geometry, stoneMaterial));
 *
 * // The same stone with a few changes; everything else stays the catalogue's
 * const taller = createHeadstone("tablet/squareScotia", { height: 1.1, depth: 0.14 });
 * ```
 */
export function createHeadstone(name: HeadstoneName, overrides?: object): BufferGeometry {
  const entry = HEADSTONE_CATALOG.find((e) => e.name === name);
  if (!entry) throw new Error(`createHeadstone: no stone named "${name}"`);
  return entry.build(overrides);
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

import { type BufferGeometry, CylinderGeometry, IcosahedronGeometry } from "three";
import { TabletHeadstoneGeometry } from "./TabletHeadstoneGeometry";
import { HOUSE, bevelBox, extrudeAlongX, extrudeUp, mergeStone, mouldingRing, plinthParts, pyramid, taperedBlock, turned, urnGeometry } from "./stoneParts";

/**
 * The standing monuments — the classical vocabulary of a Victorian cemetery, from the cippus to the exedra.
 * Each is a stack a mason would recognise, PLINTH · base moulding · DIE or SHAFT · crown moulding · CAP ·
 * finish, and each returns one merged geometry for one stone material: base at `y = 0`, centred on X and
 * Z, the inscribed face toward `+Z`.
 */

//------------------------------
//  Pedestal: cippus and altar
//------------------------------

export interface PedestalMonumentOptions {
  /** Defaults to `0.68`. */
  plinthWidth?: number;
  /** Defaults to `0.16`. */
  plinthHeight?: number;
  /** The die's width at its foot. Defaults to `0.48`. */
  dieWidth?: number;
  /** The die's width at its top — a little less, for entasis. Defaults to `0.45`. */
  dieTopWidth?: number;
  /** Defaults to `0.62`. */
  dieHeight?: number;
  /** Defaults to `0.62`. */
  capWidth?: number;
  /** Defaults to `0.07`. */
  capHeight?: number;
  /**
   * What stands on the cap:
   * - `"acroteria"` — a low pyramid with a point at each corner: the cippus.
   * - `"urn"` — a draped-less urn: the altar.
   * - `"none"` — a bare cap.
   *
   * Defaults to `"acroteria"`.
   */
  finish?: "acroteria" | "urn" | "none";
}

export const PEDESTAL_MONUMENT_DEFAULTS: Required<PedestalMonumentOptions> = {
  plinthWidth: 0.68,
  plinthHeight: 0.16,
  dieWidth: 0.48,
  dieTopWidth: 0.45,
  dieHeight: 0.62,
  capWidth: 0.62,
  capHeight: 0.07,
  finish: "acroteria",
};

/**
 * A square pedestal monument — the cippus when it is crowned with a pyramid and corner acroteria, the altar
 * when an urn stands on it. A moulded base where the die meets the plinth, a cornice under the cap.
 */
export function pedestalMonumentGeometry(options: PedestalMonumentOptions = {}): BufferGeometry {
  const o = { ...PEDESTAL_MONUMENT_DEFAULTS, ...options };
  const dieFoot = o.plinthHeight - HOUSE;
  const dieTop = dieFoot + o.dieHeight;
  const capTop = dieTop - HOUSE + o.capHeight;
  const parts = plinthParts({ width: o.plinthWidth, height: o.plinthHeight, depth: o.plinthWidth, capStyle: "chamfer", capDrop: 0.04, capProjection: 0.025 });
  parts.push(
    mouldingRing(o.dieWidth - 0.004, o.dieWidth - 0.004, o.plinthHeight - 0.002, { run: "base", style: "cyma", drop: 0.07, projection: 0.045 }),
    taperedBlock([o.dieWidth, o.dieWidth], [o.dieTopWidth, o.dieTopWidth], o.dieHeight, dieFoot),
    mouldingRing(o.dieTopWidth - 0.004, o.dieTopWidth - 0.004, dieTop - 0.002, { run: "crown", style: "ogee", drop: 0.07, projection: 0.06 }),
    bevelBox(o.capWidth, o.capHeight, o.capWidth, { y: dieTop - HOUSE }),
  );
  if (o.finish === "acroteria") {
    //  A low pyramid, and at each corner an acroterion standing proud of it: the star of points the
    //  classification sheet draws on the cippus.
    const inset = o.capWidth * 0.46;
    parts.push(pyramid(o.capWidth * 0.84, o.capWidth * 0.84, 0.12, capTop - HOUSE));
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const a = pyramid(0.1, 0.1, 0.13, capTop - HOUSE);
      a.translate(sx * (inset - 0.05), 0, sz * (inset - 0.05));
      parts.push(a);
    }
  } else if (o.finish === "urn") {
    const urn = urnGeometry(0.46);
    urn.translate(0, capTop - HOUSE, 0);
    parts.push(urn);
  }
  return mergeStone(parts);
}

//------------------------------
//  Pier
//------------------------------

export interface PierOptions {
  /** The shaft's side. Defaults to `0.36`. */
  width?: number;
  /** The shaft's height. Defaults to `1.15`. */
  height?: number;
}

export const PIER_DEFAULTS: Required<PierOptions> = {
  width: 0.36,
  height: 1.15,
};

/** A square pier: plinth, base moulding, a tall shaft, a cornice, a cap, and a pyramidal top with a ball. */
export function pierGeometry(options: PierOptions = {}): BufferGeometry {
  const o = { ...PIER_DEFAULTS, ...options };
  const plinthHeight = 0.18;
  const shaftFoot = plinthHeight - HOUSE;
  const shaftTop = shaftFoot + o.height;
  const cap = o.width + 0.14;
  const capTop = shaftTop - HOUSE + 0.07;
  const top = pyramid(cap * 0.92, cap * 0.92, 0.2, capTop - HOUSE);
  const ball = new IcosahedronGeometry(0.045, 1);
  ball.translate(0, capTop + 0.2 - 0.02 + 0.04, 0);
  return mergeStone([
    ...plinthParts({ width: o.width + 0.18, height: plinthHeight, depth: o.width + 0.18, capStyle: "chamfer", capDrop: 0.04, capProjection: 0.025 }),
    mouldingRing(o.width - 0.004, o.width - 0.004, plinthHeight - 0.002, { run: "base", style: "ogee", drop: 0.06, projection: 0.04 }),
    bevelBox(o.width, o.height, o.width, { y: shaftFoot }),
    //  A fillet a little below the cornice — the necking that says "capital" on a plain shaft.
    mouldingRing(o.width - 0.004, o.width - 0.004, shaftTop - 0.14, { run: "base", style: "fillet", drop: 0.02, projection: 0.012 }),
    mouldingRing(o.width - 0.004, o.width - 0.004, shaftTop - 0.002, { run: "crown", style: "cove", drop: 0.06, projection: 0.05 }),
    bevelBox(cap, 0.07, cap, { y: shaftTop - HOUSE }),
    top,
    ball,
  ]);
}

//------------------------------
//  Column with urn
//------------------------------

export interface ColumnUrnOptions {
  /** The shaft's radius at its foot. Defaults to `0.15`. */
  radius?: number;
  /** The column's height, base to abacus. Defaults to `1.2`. */
  height?: number;
}

export const COLUMN_URN_DEFAULTS: Required<ColumnUrnOptions> = {
  radius: 0.15,
  height: 1.2,
};

/**
 * A Tuscan column carrying an urn, on a pedestal. The column is turned in one profile: a torus base, a
 * shaft with entasis (a swell a third of the way up, then narrowing), an astragal, the echinus flaring to
 * a square abacus. Taller than a headstone — a family's monument.
 */
export function columnUrnGeometry(options: ColumnUrnOptions = {}): BufferGeometry {
  const o = { ...COLUMN_URN_DEFAULTS, ...options };
  const r = o.radius;
  const plinthHeight = 0.12;
  const dieHeight = 0.42;
  const dieWidth = r * 3.2;
  const foot = plinthHeight - HOUSE + dieHeight - HOUSE;
  const h = o.height;
  const profile: [number, number][] = [
    [0, 0],
    [r * 1.35, 0], // the base's square-edged plinth, turned round
    [r * 1.35, 0.03],
    [r * 1.3, 0.045],
    [r * 1.36, 0.065], // the torus
    [r * 1.28, 0.09],
    [r * 1.08, 0.1],
    [r, 0.12],
  ];
  //  The shaft: entasis — swell to a third, then narrow to five-sixths at the neck.
  const shaftFrom = 0.12;
  const shaftTo = h - 0.16;
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const swell = t < 0.33 ? 1 + 0.02 * Math.sin((t / 0.33) * (Math.PI / 2)) : 1.02 - 0.19 * ((t - 0.33) / 0.67) ** 1.4;
    profile.push([r * swell, shaftFrom + (shaftTo - shaftFrom) * t]);
  }
  const neck = r * 0.83;
  profile.push(
    [neck * 1.12, shaftTo + 0.012], // the astragal
    [neck * 1.12, shaftTo + 0.03],
    [neck, shaftTo + 0.04],
    [neck, h - 0.1], // the necking
    [neck * 1.05, h - 0.085],
    [r * 1.25, h - 0.045], // the echinus
    [r * 1.25, h - 0.04],
    [0, h - 0.04],
  );
  const column = turned(profile, 14);
  column.translate(0, foot, 0);
  const abacusY = foot + h - 0.04 - HOUSE;
  const abacus = bevelBox(r * 2.7, 0.06, r * 2.7, { y: abacusY });
  const urn = urnGeometry(0.42);
  urn.translate(0, abacusY + 0.06 - HOUSE, 0);
  return mergeStone([
    ...plinthParts({ width: dieWidth + 0.14, height: plinthHeight, depth: dieWidth + 0.14, capStyle: "chamfer", capDrop: 0.035, capProjection: 0.02 }),
    mouldingRing(dieWidth - 0.004, dieWidth - 0.004, plinthHeight - 0.002, { run: "base", style: "cyma", drop: 0.05, projection: 0.035 }),
    bevelBox(dieWidth, dieHeight, dieWidth, { y: plinthHeight - HOUSE }),
    mouldingRing(dieWidth - 0.004, dieWidth - 0.004, plinthHeight - HOUSE + dieHeight - 0.002, { run: "crown", style: "ogee", drop: 0.05, projection: 0.04 }),
    column,
    abacus,
    urn,
  ]);
}

//------------------------------
//  Pyramid
//------------------------------

export interface PyramidMonumentOptions {
  /** The pyramid's side at its foot. Defaults to `0.78`. */
  base?: number;
  /** The pyramid's height above its plinth. Defaults to `1.0`. */
  height?: number;
}

export const PYRAMID_MONUMENT_DEFAULTS: Required<PyramidMonumentOptions> = {
  base: 0.78,
  height: 1.0,
};

/** A small pyramid tomb-marker on a moulded plinth — the Egyptian revival's one gift to the churchyard. */
export function pyramidMonumentGeometry(options: PyramidMonumentOptions = {}): BufferGeometry {
  const { base, height } = { ...PYRAMID_MONUMENT_DEFAULTS, ...options };
  const plinthHeight = 0.16;
  return mergeStone([
    ...plinthParts({ width: base + 0.2, height: plinthHeight, depth: base + 0.2, capStyle: "ogee", capDrop: 0.05, capProjection: 0.03 }),
    mouldingRing(base - 0.004, base - 0.004, plinthHeight - 0.002, { run: "base", style: "fillet", drop: 0.03, projection: 0.02 }),
    pyramid(base, base, height, plinthHeight - HOUSE),
  ]);
}

//------------------------------
//  Sarcophagus
//------------------------------

export interface SarcophagusOptions {
  /** The chest's length, along X. Defaults to `1.66`. */
  length?: number;
  /** The chest's depth, along Z. Defaults to `0.68`. */
  depth?: number;
  /** The chest's height. Defaults to `0.56`. */
  height?: number;
}

export const SARCOPHAGUS_DEFAULTS: Required<SarcophagusOptions> = {
  length: 1.66,
  depth: 0.68,
  height: 0.56,
};

/**
 * A sarcophagus: a chest on a plinth, moulded at foot and head, under a lid whose top is a low cambered
 * cushion rolled into a SCROLL at each end — two bolsters lying across the lid, their round ends turned to
 * the viewer like the volutes of a pillow. The long side faces `+Z`.
 */
export function sarcophagusGeometry(options: SarcophagusOptions = {}): BufferGeometry {
  const o = { ...SARCOPHAGUS_DEFAULTS, ...options };
  const plinthHeight = 0.14;
  const chestFoot = plinthHeight - HOUSE;
  const chestTop = chestFoot + o.height;
  const lidLength = o.length + 0.14;
  const lidDepth = o.depth + 0.12;
  const lidTop = chestTop - HOUSE + 0.07;

  //  The cushion between the scrolls: a circular camber across the lid, run its length.
  const half = (lidDepth - 0.1) / 2;
  const rise = 0.09;
  const radius = (half * half + rise * rise) / (2 * rise);
  //  Bedded deep enough that its side stands taller than twice its bevel, or the bevel's inset folds there.
  const bed = 0.03;
  const section: [number, number][] = [[half, -bed]];
  for (let i = 0; i <= 10; i++) {
    const z = half - (i / 10) * half * 2;
    section.push([z, Math.sqrt(radius * radius - z * z) - (radius - rise)]);
  }
  section.push([-half, -bed]);
  const scrollR = 0.1;
  const cushion = extrudeAlongX(section, lidLength - scrollR * 4 + 0.04, 0.005);
  cushion.translate(0, lidTop, 0);

  const parts = [
    ...plinthParts({ width: o.length + 0.26, height: plinthHeight, depth: o.depth + 0.24, capStyle: "chamfer", capDrop: 0.04, capProjection: 0.02 }),
    mouldingRing(o.length - 0.004, o.depth - 0.004, plinthHeight - 0.002, { run: "base", style: "cyma", drop: 0.07, projection: 0.04 }),
    bevelBox(o.length, o.height, o.depth, { y: chestFoot }),
    mouldingRing(o.length - 0.004, o.depth - 0.004, chestTop - 0.002, { run: "crown", style: "ogee", drop: 0.06, projection: 0.045 }),
    bevelBox(lidLength, 0.07, lidDepth, { y: chestTop - HOUSE }),
    cushion,
  ];
  for (const sx of [-1, 1]) {
    //  The scroll: a bolster across the lid, with a slightly larger disc at each end — the volute's face.
    const x = sx * (lidLength / 2 - scrollR - 0.02);
    const bolster = new CylinderGeometry(scrollR, scrollR, lidDepth - 0.06, 14, 1);
    bolster.rotateX(Math.PI / 2);
    bolster.translate(x, lidTop + scrollR - 0.03, 0);
    parts.push(bolster);
    for (const sz of [-1, 1]) {
      const disc = new CylinderGeometry(scrollR + 0.012, scrollR + 0.012, 0.03, 14, 1);
      disc.rotateX(Math.PI / 2);
      //  Its inner face stands just outside the cushion's side (at ±half), never coplanar with it.
      disc.translate(x, lidTop + scrollR - 0.03, sz * (lidDepth / 2 - 0.03));
      parts.push(disc);
    }
  }
  return mergeStone(parts);
}

//------------------------------
//  Exedra
//------------------------------

export interface ExedraOptions {
  /** The back wall's inner radius. Defaults to `1.4`. */
  radius?: number;
  /** How much of a circle the wall spans, radians. Defaults to `1.75` (about 100°). */
  sweep?: number;
  /** The back wall's height, to the top of its coping. Defaults to `0.9`. */
  wallHeight?: number;
}

export const EXEDRA_DEFAULTS: Required<ExedraOptions> = {
  radius: 1.4,
  sweep: 1.75,
  wallHeight: 0.9,
};

/**
 * An exedra: a curved stone bench-wall, open toward the visitor, with a raised tablet and cross at its centre
 * and a block at each end — a family plot's place to sit. The wall's concave face looks toward `+Z`.
 */
export function exedraGeometry(options: ExedraOptions = {}): BufferGeometry {
  const o = { ...EXEDRA_DEFAULTS, ...options };
  const R = o.radius;
  const wall = 0.2;
  //  The arc's centre lies in front, so the wall's middle stands at z = −0.55.
  const cz = -0.55 + R;
  const at = (r: number, phi: number): [number, number] => [r * Math.sin(phi), cz - r * Math.cos(phi)];
  const sector = (r0: number, r1: number, a: number, n = 18): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) pts.push(at(r1, -a + (2 * a * i) / n));
    for (let i = n; i >= 0; i--) pts.push(at(r0, -a + (2 * a * i) / n));
    return pts;
  };
  const a = o.sweep / 2;
  const copingH = 0.07;
  const parts: BufferGeometry[] = [
    extrudeUp(sector(R, R + wall, a), o.wallHeight - copingH + HOUSE),
    extrudeUp(sector(R - 0.04, R + wall + 0.04, a + 0.02), copingH, o.wallHeight - copingH),
    //  The bench: a solid seat in front of the wall, its slab overhanging a little.
    extrudeUp(sector(R - 0.42, R + HOUSE, a * 0.9), 0.38),
    extrudeUp(sector(R - 0.47, R + HOUSE, a * 0.9 + 0.015), 0.06, 0.38 - HOUSE),
  ];
  //  The centre: a half-round tablet rising out of the wall, with a cross on it.
  const tablet = new TabletHeadstoneGeometry({ preset: "halfRound", width: 0.62, height: 1.02, depth: wall + 0.06 });
  tablet.translate(0, 0, cz - R - wall / 2);
  parts.push(tablet);
  const tabletTop = tablet.height;
  const crossZ = cz - R - wall / 2;
  const upright = bevelBox(0.07, 0.34, 0.07, { y: tabletTop - 0.04, radius: 0.008 });
  const arm = bevelBox(0.22, 0.07, 0.07, { y: tabletTop + 0.17, radius: 0.008 });
  upright.translate(0, 0, crossZ);
  arm.translate(0, 0, crossZ);
  parts.push(upright, arm);
  //  The end blocks, square to the arc where it stops.
  for (const s of [-1, 1]) {
    const phi = s * (a + 0.05);
    const [x, z] = at(R + wall / 2, phi);
    const block = bevelBox(0.3, o.wallHeight + 0.06, 0.32);
    const cap = pyramid(0.34, 0.36, 0.12, o.wallHeight + 0.06 - HOUSE);
    for (const g of [block, cap]) {
      g.rotateY(-phi);
      g.translate(x, 0, z);
      parts.push(g);
    }
  }
  const merged = mergeStone(parts);
  //  Centre the footprint on the origin.
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  merged.translate(0, 0, -(box.min.z + box.max.z) / 2);
  return merged;
}

//------------------------------
//  Obelisks
//------------------------------

export interface ObeliskOptions {
  /** The shaft's side at its foot. Defaults to `0.3`. */
  shaftBase?: number;
  /** The shaft's side at its shoulder, under the pyramidion — the taper. Defaults to `0.2`. */
  shaftTop?: number;
  /** The shaft's height, below the pyramidion. Defaults to `1.7`. */
  shaftHeight?: number;
  /** The pyramidion's height. Defaults to `0.2`. */
  capHeight?: number;
  /** The die's side. Defaults to `0.46`. */
  dieWidth?: number;
  /** The die's height. Defaults to `0.4`. */
  dieHeight?: number;
}

export const OBELISK_DEFAULTS: Required<ObeliskOptions> = {
  shaftBase: 0.3,
  shaftTop: 0.2,
  shaftHeight: 1.7,
  capHeight: 0.2,
  dieWidth: 0.46,
  dieHeight: 0.4,
};

/**
 * An obelisk — the tall Victorian monument over a family plot: plinth, moulded die, a cap, and a tapered
 * shaft rising to a pyramidion.
 */
export function obeliskGeometry(options: ObeliskOptions = {}): BufferGeometry {
  const o = { ...OBELISK_DEFAULTS, ...options };
  const plinthHeight = 0.14;
  const dieFoot = plinthHeight - HOUSE;
  const dieTop = dieFoot + o.dieHeight;
  const cap = o.dieWidth + 0.08;
  const capTop = dieTop - HOUSE + 0.06;
  const shaftFoot = capTop - HOUSE;
  const shaftTop = shaftFoot + o.shaftHeight;
  return mergeStone([
    ...plinthParts({ width: o.dieWidth + 0.2, height: plinthHeight, depth: o.dieWidth + 0.2, capStyle: "chamfer", capDrop: 0.035, capProjection: 0.02 }),
    mouldingRing(o.dieWidth - 0.004, o.dieWidth - 0.004, plinthHeight - 0.002, { run: "base", style: "cyma", drop: 0.06, projection: 0.04 }),
    bevelBox(o.dieWidth, o.dieHeight, o.dieWidth, { y: dieFoot }),
    mouldingRing(o.dieWidth - 0.004, o.dieWidth - 0.004, dieTop - 0.002, { run: "crown", style: "ogee", drop: 0.05, projection: 0.04 }),
    bevelBox(cap, 0.06, cap, { y: dieTop - HOUSE }),
    taperedBlock([o.shaftBase, o.shaftBase], [o.shaftTop, o.shaftTop], o.shaftHeight, shaftFoot),
    pyramid(o.shaftTop, o.shaftTop, o.capHeight, shaftTop - 0.001),
  ]);
}

export interface SteppedObeliskOptions {
  /** Overall height, foot of the lowest step to the pyramidion's point. Defaults to `1.75`. */
  height?: number;
  /** The lowest step's side; the shaft and upper steps are proportioned from it. Defaults to `0.7`. */
  baseWidth?: number;
}

export const STEPPED_OBELISK_DEFAULTS: Required<SteppedObeliskOptions> = {
  height: 1.75,
  baseWidth: 0.7,
};

/**
 * The everyday obelisk marker — a short tapered shaft on three diminishing steps, small enough to stand in
 * a row of headstones.
 */
export function steppedObeliskGeometry(options: SteppedObeliskOptions = {}): BufferGeometry {
  const { height, baseWidth } = { ...STEPPED_OBELISK_DEFAULTS, ...options };
  const steps = [
    [baseWidth, height * 0.06],
    [baseWidth * 0.8, height * 0.1],
    [baseWidth * 0.62, height * 0.1],
  ] as const;
  const parts: BufferGeometry[] = [];
  let y = 0;
  for (const [i, [width, h]] of steps.entries()) {
    const sink = i > 0 ? HOUSE : 0;
    parts.push(bevelBox(width, h + sink, width, { y: y - sink }));
    y += h;
  }
  const shaftBase = baseWidth * 0.42;
  const shaftTop = baseWidth * 0.3;
  const capHeight = shaftTop * 0.6;
  const shaftHeight = height - y - capHeight;
  parts.push(
    taperedBlock([shaftBase, shaftBase], [shaftTop, shaftTop], shaftHeight + HOUSE, y - HOUSE),
    pyramid(shaftTop, shaftTop, capHeight, y + shaftHeight - 0.001),
  );
  return mergeStone(parts);
}

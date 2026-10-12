import { Path, Vector2 } from "three";
import { traceArch, type ArchStyle } from "../../modeling/profiles/ArchProfile";

/**
 * The tablet headstone's silhouette, as a stonecutter's catalogue has it.
 *
 * The trade chart names twenty tops, but they are not twenty shapes. Every one is a TOP — the curve that
 * spans the stone — meeting the sides through a SHOULDER, the corner treatment either side of it:
 *
 * ```
 *        top: flat · camber · oval · halfRound · pointed · ogeeArch       (arches — traced by traceArch)
 *             ogee · serpentine · halfOgee · peon                         (height functions)
 *   shoulder: none · ledge · checked · rounded · doubleRounded · scotia · splayed · gothic
 * ```
 *
 * A headstone's top is a HEIGHT OVER THE SPAN — one y for every x — which is why it needs so little of the
 * arch vocabulary: no horseshoe, no half-leaves, no jambs. The tops that are true arches are drawn by
 * {@link traceArch}, so a camber here is exactly a segmental arch there; the rest are functions of `t`.
 *
 * A half-round top on ledge shoulders is the classic shouldered stone — the arch narrower than the slab,
 * sitting ON it.
 *
 * "Oval top with checked shoulders" is `{ top: "oval", shoulder: "checked" }`; "raised shoulder" is a flat
 * top with a checked shoulder on ONE side only. The chart's names survive as {@link TABLET_TOPS} presets,
 * so the catalogue can still be read by name, but the space is the product of the two — and a pairing the
 * chart never drew (a serpentine top on gothic shoulders) is one line, not a new class.
 *
 * The outline is in the stone's own plane: `x` across (centred), `y` up from the base at `y = 0`, wound
 * counter-clockwise so an extrusion faces outward.
 */

/** The curve spanning the stone between its shoulders. */
export type TabletTop =
  /** Level. */
  | "flat"
  /** A low circular arc — the chart's "oval, arc or cambered". */
  | "camber"
  /** A half-ellipse, taller than a camber and vertical where it springs. */
  | "oval"
  /** A full semicircle over the whole span; `rise` is ignored — it is half the span. */
  | "halfRound"
  /** A gothic point: two circular arcs meeting at the crown. `rise` is at least half the span. */
  | "pointed"
  /** The arch-profile ogee: S-curves meeting at a pointed crown — a keel. */
  | "ogeeArch"
  /** Symmetric S-curves up to a rounded crest: concave where they spring, convex at the top. */
  | "ogee"
  /** One wave across: a crest near the left, a trough near the right. Asymmetric. */
  | "serpentine"
  /** A single S falling from the left to the right. Asymmetric. */
  | "halfOgee"
  /** A gable. `peak` moves the apex off-centre — the chart's "offset peon" at about a quarter. */
  | "peon";

/** How a side meets the top. */
export type TabletShoulder =
  /** The side runs straight up into the top. */
  | "none"
  /** A level ledge at the top's springing, the top rising from inside it. */
  | "ledge"
  /** A square notch: the side stops short, steps in, and steps up to the top. */
  | "checked"
  /** A notch whose outer corner is rounded over. */
  | "rounded"
  /** A notch with BOTH corners rounded — the outer one, and the step up — two lobes. */
  | "doubleRounded"
  /** A concave quarter-circle cut into the corner. */
  | "scotia"
  /** A straight 45° splay across the corner. */
  | "splayed"
  /** The side swells in a quarter-ellipse from part-way up into the top, like a lancet's flank. */
  | "gothic";

export interface TabletOutlineOptions {
  /** Width across the sides. Defaults to `0.6`. */
  width?: number;
  /** Height of the top's springing line — where the top begins, before it rises. Defaults to `0.78`. */
  height?: number;
  /** How far the top rises above its springing at its highest. Defaults to `0.16`. Ignored by `halfRound`. */
  rise?: number;
  /** Defaults to `"camber"`. */
  top?: TabletTop;
  /** Where along the span a `peon` top peaks, `0`–`1` from the left. Defaults to `0.5`. */
  peak?: number;
  /** Both shoulders, unless {@link rightShoulder} overrides the right. Defaults to `"none"`. */
  shoulder?: TabletShoulder;
  /** How far a shoulder reaches in from the side. Defaults to `0.07`. */
  shoulderWidth?: number;
  /** How far a checked or rounded shoulder drops below the top's springing. Defaults to `0.06`. */
  shoulderDrop?: number;
  /** A different right shoulder — `null` mirrors the left. Defaults to `null`. */
  rightShoulder?: TabletShoulder | null;
  /** The right shoulder's reach, when it differs — `null` uses {@link shoulderWidth}. Defaults to `null`. */
  rightShoulderWidth?: number | null;
  /** Where a gothic shoulder springs from the side, as a fraction of `height`. Defaults to `0.5`. */
  gothicSpring?: number;
  /** Points along each curve. Defaults to `12`. */
  segments?: number;
}

export const TABLET_OUTLINE_DEFAULTS: Required<TabletOutlineOptions> = {
  width: 0.6,
  height: 0.78,
  rise: 0.16,
  top: "camber",
  peak: 0.5,
  shoulder: "none",
  shoulderWidth: 0.07,
  shoulderDrop: 0.06,
  rightShoulder: null,
  rightShoulderWidth: null,
  gothicSpring: 0.5,
  segments: 12,
};

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** The tops that are true arches, and the arch each one is. */
const ARCH_TOPS: Partial<Record<TabletTop, ArchStyle>> = {
  flat: "square",
  camber: "segmental",
  oval: "elliptical",
  halfRound: "semicircle",
  pointed: "pointed",
  ogeeArch: "ogee",
};

/** An arch top, right springing to left, as points — traced by the arch profile and sampled. */
function archTopPoints(style: ArchStyle, x0: number, x1: number, spring: number, rise: number, segments: number): Vector2[] {
  const path = new Path();
  path.moveTo(x1, spring);
  traceArch(path, { style, x: (x0 + x1) / 2, y: spring, halfSpan: (x1 - x0) / 2, rise, from: "right", to: "left" });
  return path.getPoints(segments);
}

/** A non-arch top's height above its springing at `t` (`0` left end, `1` right end). */
function topHeight(top: TabletTop, t: number, rise: number, peak: number): number {
  switch (top) {
    case "ogee":
      return rise * smoothstep(1 - Math.abs(t * 2 - 1));
    case "serpentine":
      //  High at the left with a crest a quarter in, a trough three quarters in, a little lift to the end.
      return rise * (0.6 * (1 - t) + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));
    case "halfOgee":
      return rise * (1 - smoothstep(t));
    case "peon": {
      const p = Math.max(0.02, Math.min(0.98, peak));
      return rise * (t < p ? t / p : (1 - t) / (1 - p));
    }
    default:
      return 0;
  }
}

/** Where the top's span stops short of the side: the shoulder's whole reach. */
function shoulderInset(kind: TabletShoulder, width: number, drop: number): number {
  if (kind === "none") return 0;
  if (kind === "doubleRounded") return width + drop;
  return width;
}

/**
 * The RIGHT shoulder, from the top of the side (outer) to where the top springs (inner), for a stone whose
 * right side stands at `x = side` and whose top springs at `(side − inset, spring)`. The left is its mirror.
 */
function shoulderPoints(
  kind: TabletShoulder,
  side: number,
  spring: number,
  width: number,
  drop: number,
  gothicFrom: number,
  segments: number,
): Vector2[] {
  const out: Vector2[] = [];
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = a0 + ((a1 - a0) * i) / segments;
      out.push(new Vector2(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
    }
  };
  const inner = side - width;
  switch (kind) {
    case "none":
      out.push(new Vector2(side, spring));
      break;
    case "ledge":
      out.push(new Vector2(side, spring), new Vector2(inner, spring));
      break;
    case "checked":
      out.push(new Vector2(side, spring - drop), new Vector2(inner, spring - drop), new Vector2(inner, spring));
      break;
    case "rounded": {
      //  The outer corner of the notch rolled over on a radius most of the ledge wide.
      const r = Math.min(width * 0.75, spring - drop);
      arc(side - r, spring - drop - r, r, r, 0, Math.PI / 2);
      out.push(new Vector2(inner, spring - drop), new Vector2(inner, spring));
      break;
    }
    case "doubleRounded": {
      //  Two lobes: the notch's outer corner rolled, then the step up rolled over into the top.
      const r = Math.min(width * 0.75, spring - drop);
      arc(side - r, spring - drop - r, r, r, 0, Math.PI / 2);
      arc(inner - drop, spring - drop, drop, drop, 0, Math.PI / 2);
      break;
    }
    case "scotia":
      //  A cove: a quarter circle centred ON the missing corner, so it bites in.
      arc(side, spring, width, width, (Math.PI * 3) / 2, Math.PI);
      break;
    case "splayed":
      out.push(new Vector2(side, spring - width), new Vector2(inner, spring));
      break;
    case "gothic":
      //  A quarter-ellipse swelling in from part-way up the side, vertical where it leaves the side and
      //  level where it meets the top.
      arc(inner, gothicFrom, width, spring - gothicFrom, 0, Math.PI / 2);
      break;
  }
  return out;
}

/** The whole silhouette, counter-clockwise from the bottom-left corner. */
export function tabletOutline(options: TabletOutlineOptions = {}): Vector2[] {
  const o: Required<TabletOutlineOptions> = { ...TABLET_OUTLINE_DEFAULTS, ...options };
  const half = o.width / 2;
  const rightKind = o.rightShoulder ?? o.shoulder;
  const rightWidth = o.rightShoulderWidth ?? o.shoulderWidth;
  const insetL = shoulderInset(o.shoulder, o.shoulderWidth, o.shoulderDrop);
  const insetR = shoulderInset(rightKind, rightWidth, o.shoulderDrop);
  const x0 = -half + insetL;
  const x1 = half - insetR;
  const span = x1 - x0;
  const arch = ARCH_TOPS[o.top];
  //  Arches spring level at both ends; the asymmetric tops spring wherever their function starts.
  const topAt = (t: number) => o.height + (arch ? 0 : topHeight(o.top, t, o.rise, o.peak));
  const gothicFrom = o.height * o.gothicSpring;

  const points: Vector2[] = [new Vector2(-half, 0), new Vector2(half, 0)];
  //  Up the right side into the right shoulder, which ends where the top springs.
  points.push(...shoulderPoints(rightKind, half, topAt(1), rightWidth, o.shoulderDrop, gothicFrom, o.segments));
  //  Across the top, right to left.
  if (arch) {
    points.push(...archTopPoints(arch, x0, x1, o.height, o.rise, o.segments));
  } else {
    const n = o.top === "peon" ? 2 : o.segments * 2;
    for (let i = n; i >= 0; i--) {
      const t = o.top === "peon" && i === 1 ? o.peak : i / n;
      points.push(new Vector2(x0 + span * t, topAt(t)));
    }
  }
  //  The left shoulder, mirrored and walked inner to outer; then down the left side to where we began.
  const left = shoulderPoints(o.shoulder, half, topAt(0), o.shoulderWidth, o.shoulderDrop, gothicFrom, o.segments);
  for (let i = left.length - 1; i >= 0; i--) points.push(new Vector2(-left[i]!.x, left[i]!.y));

  //  Consecutive duplicates (a shoulder's inner point is the top's end) would give the extrusion
  //  zero-length edges.
  const clean: Vector2[] = [];
  for (const p of points) {
    const last = clean[clean.length - 1];
    if (!last || last.distanceTo(p) > 1e-5) clean.push(p);
  }
  if (clean.length > 1 && clean[0]!.distanceTo(clean[clean.length - 1]!) < 1e-5) clean.pop();
  return clean;
}

/** A named pairing from the trade chart. */
export interface TabletPreset {
  /** The chart's name. */
  label: string;
  options: TabletOutlineOptions;
}

/**
 * The trade chart's twenty tops, plus the classic shouldered, pointed and ogee-arch stones, by name, as (top × shoulder) pairings. Heights are set so the stones
 * stand about the same overall — a tall rise sits on a lower springing.
 */
export const TABLET_TOPS = {
  square: { label: "Square Top", options: { top: "flat", height: 0.9 } },
  ogee: { label: "Ogee Top", options: { top: "ogee", height: 0.74, rise: 0.2 } },
  camber: { label: "Oval, Arc or Cambered Top", options: { top: "camber", height: 0.82, rise: 0.09 } },
  halfRound: { label: "Half Round Top", options: { top: "halfRound", height: 0.64 } },
  serpentine: { label: "Serpentine Top", options: { top: "serpentine", height: 0.76, rise: 0.16 } },
  peon: { label: "Peon Top", options: { top: "peon", height: 0.78, rise: 0.14 } },
  offsetPeon: { label: "Offset Peon Top", options: { top: "peon", height: 0.78, rise: 0.14, peak: 0.24 } },
  ovalShoulders: { label: "Oval Top with Shoulders", options: { top: "oval", height: 0.76, rise: 0.15, shoulder: "ledge", shoulderWidth: 0.1 } },
  ovalScotia: { label: "Oval Top with Scotia Shoulders", options: { top: "oval", height: 0.76, rise: 0.14, shoulder: "scotia", shoulderWidth: 0.09 } },
  squareRounded: { label: "Square Top with Rounded Shoulders", options: { top: "flat", height: 0.9, shoulder: "rounded", shoulderWidth: 0.08, shoulderDrop: 0.05 } },
  checked: { label: "Checked Top", options: { top: "flat", height: 0.9, shoulder: "checked", shoulderWidth: 0.07, shoulderDrop: 0.06 } },
  raisedShoulder: {
    label: "Raised Shoulder",
    options: { top: "flat", height: 0.9, shoulder: "none", rightShoulder: "checked", rightShoulderWidth: 0.24, shoulderDrop: 0.08 },
  },
  squareScotia: { label: "Square Top with Scotia Shoulders", options: { top: "flat", height: 0.9, shoulder: "scotia", shoulderWidth: 0.08 } },
  peonChecked: { label: "Peon Top with Checked Shoulders", options: { top: "peon", height: 0.8, rise: 0.12, shoulder: "checked", shoulderWidth: 0.07, shoulderDrop: 0.06 } },
  squareSplayed: { label: "Square Top with Splayed Shoulders", options: { top: "flat", height: 0.9, shoulder: "splayed", shoulderWidth: 0.08 } },
  squareGothic: { label: "Square Top with Gothic Shoulders", options: { top: "flat", height: 0.9, shoulder: "gothic", shoulderWidth: 0.12, gothicSpring: 0.35 } },
  ovalChecked: { label: "Oval Top with Checked Shoulders", options: { top: "oval", height: 0.76, rise: 0.15, shoulder: "checked", shoulderWidth: 0.07, shoulderDrop: 0.06 } },
  squareDoubleRounded: {
    label: "Square Top with Double Rounded Shoulders",
    options: { top: "flat", height: 0.9, shoulder: "doubleRounded", shoulderWidth: 0.07, shoulderDrop: 0.05 },
  },
  halfOgee: { label: "Half Ogee Top", options: { top: "halfOgee", height: 0.76, rise: 0.16 } },
  halfRoundShoulders: { label: "Half Round Top with Shoulders", options: { top: "halfRound", height: 0.68, shoulder: "ledge", shoulderWidth: 0.09 } },
  pointed: { label: "Pointed Top", options: { top: "pointed", height: 0.5, rise: 0.42 } },
  ogeeArch: { label: "Ogee Arch Top", options: { top: "ogeeArch", height: 0.7, rise: 0.22 } },
  ogeeChecked: { label: "Ogee Top with Checked Shoulders", options: { top: "ogee", height: 0.76, rise: 0.18, shoulder: "checked", shoulderWidth: 0.07, shoulderDrop: 0.06 } },
} as const satisfies Record<string, TabletPreset>;

export type TabletTopName = keyof typeof TABLET_TOPS;

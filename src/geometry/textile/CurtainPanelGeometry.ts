import { BufferGeometry, Vector3 } from "three";
import { surfaceGrid } from "../../loft/SurfaceGrid";
import { samplesPerPleat, solveAmplitude, type PleatShape } from "./pleatWave";

/**
 * The heading — how the fullness is taken up where the panel meets the rod.
 *
 * - `pinch` — the French pleat. Flat FACES with the fullness pinched into tight groups between them.
 *   The flat is the feature: it is what makes a pinch pleat read as tailored rather than gathered.
 * - `pencil` — continuous rounded gathers, very close to a true sinusoid in plan.
 * - `box` — flat front and back, square in plan, with the folds turned at the corners.
 * - `knife` — every fold leaning one way. Triangular in plan.
 */
export type CurtainPleat = "pinch" | "pencil" | "box" | "knife";

export interface CurtainPanelGeometryOptions {
  /** Finished width of the panel at the rod. Defaults to `1.4`. */
  width?: number;
  /** How far the panel drops from the rod. Defaults to `3.2`. */
  drop?: number;
  /**
   * Fabric width ÷ rod width. Defaults to `2.5`.
   *
   * **The design input the trade actually uses** — 2× is skimpy, 2.5× standard, 3× luxurious. Fold depth
   * is not an option anywhere on this class because it is an OUTPUT of this: the cloth is a fixed length,
   * and how deep its folds run is whatever fitting that length into the available width demands.
   */
  fullness?: number;
  /** Number of pleats across the heading. Defaults to `9`. */
  pleats?: number;
  /** The heading. Defaults to `"pinch"`. See {@link CurtainPleat}. */
  pleat?: CurtainPleat;
  /**
   * How far the plan section relaxes toward a sine as it descends. Defaults to `0.55`.
   *
   * A heading is stitched and holds whatever shape the pleat gives it; a hem is free, and free cloth
   * takes the smooth shape. At `0` the panel keeps its heading's crispness all the way to the floor,
   * which reads immediately as wrong.
   */
  relax?: number;
  /**
   * Where the tieback cinches, `0` at the rod and `1` at the hem. Defaults to `0.62`.
   */
  tiebackHeight?: number;
  /**
   * How far the leading edge is drawn in AT THE ROD, as a fraction of {@link width}. Defaults to `0`.
   *
   * Zero puts the panel at full width where it is hung, so a pair very nearly meets in the middle. Raise
   * it to start the pair already parted at the top.
   */
  topPull?: number;
  /**
   * How far the leading edge is drawn in AT THE TIEBACK. Defaults to `0.42`.
   *
   * **This is a constraint on the panel's WIDTH, not a force on the cloth.** Narrowing the span the fixed
   * fabric has to cross raises the local fullness, and the folds deepen because they cannot do anything
   * else. Nothing here pushes any fabric sideways.
   */
  pull?: number;
  /**
   * How far the leading edge is drawn in AT THE HEM. Defaults to `0`.
   *
   * This is the dial that decides what a panel does BELOW its tieback, and the two useful answers sit at
   * either end. Set it to `0` and the panel flares fully back out to its rod width — the hourglass, which
   * is what a heavy curtain with plenty of material in the base does. Set it equal to {@link pull} and
   * the leading edge simply falls straight from the tie, a vertical drop parallel to the outer edge,
   * which is what a thin curtain does because it has no material to flare with. Above `pull` it keeps
   * narrowing, tapering to the floor.
   */
  hemPull?: number;
  /**
   * How the leading edge curves between its three anchors. Defaults to `0.5`.
   *
   * `0` runs straight lines from rod to tie to hem, giving a hard V at the tieback. `1` eases into and
   * out of every anchor, which bows each half. Real cloth sits between: it leaves the rod on a slant and
   * softens as it reaches the band.
   */
  slack?: number;
  /**
   * Samples across the width. Defaults to `160`.
   *
   * Rounded up so each pleat gets a multiple of four, putting a sample on every extremum of the wave.
   * Tessellation only — the silhouette does not move with it.
   */
  widthSegments?: number;
  /** Samples down the drop. Defaults to `40`. */
  heightSegments?: number;
}

/** The pleat's plan section — the one part that is this shape's own vocabulary. */
function planShape(pleat: CurtainPleat): PleatShape {
  return (phase) => {
    const t = phase - Math.floor(phase);

    if (pleat === "pencil") return Math.sin(t * Math.PI * 2);
    if (pleat === "knife") return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;

    if (pleat === "box") {
      // Softened at the turns, because a real box pleat is folded cloth and has a finite radius there.
      const k = 0.06;
      if (t < k) return t / k;
      if (t < 0.5 - k) return 1;
      if (t < 0.5 + k) return -(t - 0.5) / k;
      if (t < 1 - k) return -1;
      return (t - 1) / k;
    }

    // PINCH: a flat face across half the pleat, then the fullness taken up in a tight excursion.
    //
    // The face is exactly HALF the pitch, and that is a deliberate half rather than a round number. The
    // excursion's minimum sits at its own midpoint, so a face of 0.55 — which is what the study uses —
    // puts the deepest point at phase 0.775, or 3.1 quarters, which no multiple-of-four sampling ever
    // lands on. At 0.5 the minimum falls on 0.75 and the pinch obeys the same silhouette guarantee the
    // other three headings do: measured spread 3.16e-3 before, exactly 0 after.
    if (t < 0.5) return 1;
    const s = (t - 0.5) / 0.5;
    return 1 - (1 - Math.cos(s * Math.PI * 2)) - Math.sin(s * Math.PI) * 0.9;
  };
}

/** Blend between straight and eased, so one dial covers a hard V and a bowed curve. */
function ease(t: number, slack: number): number {
  return t * (1 - slack) + t * t * (3 - 2 * t) * slack;
}

/**
 * A curtain panel — a pleat wave lofted downward, with a tieback cinching it.
 *
 * Look DOWN on a hanging panel and its plan section is a periodic wave; the whole thing is that wave
 * carried down the drop. It is a LOFT and not a sweep, because the section does not keep its shape: its
 * amplitude is re-solved at every height as the leading edge moves, and its profile relaxes toward a
 * sine as the cloth gets further from the stitched heading.
 *
 * **The fabric length is the conserved quantity and everything else follows from it.** The panel is cut
 * once at `fullness × width`, and no dial here is allowed to change that. So when the tieback narrows
 * the span, the local fullness rises — same cloth, less width — and the folds deepen on their own. That
 * is why there is no fold-depth option: it is an output.
 *
 * The leading edge runs through THREE anchors — at the rod, at the tieback, at the hem — which is what
 * lets a panel drop vertically from its tie or flare back out into an hourglass without either being a
 * special case. See {@link CurtainPanelGeometryOptions.hemPull}.
 *
 * **Origin is the rod**, at `y = 0`, with the cloth hanging to negative Y and the panel's outer edge at
 * `x = 0` — so a pair is this geometry and its mirror. The same convention as {@link SwagGeometry} and
 * {@link CascadeGeometry}.
 *
 * **This is a sheet with no thickness**, so it needs a material with `side: DoubleSide`.
 *
 * @example
 * ```ts
 * // A thin curtain: straight down from the tieback rather than flaring back out.
 * const panel = new Mesh(
 *   new CurtainPanelGeometry({ pull: 0.42, hemPull: 0.42 }),
 *   new MeshStandardMaterial({ color: 0xb8ac93, roughness: 0.92, side: DoubleSide, flatShading: true }),
 * );
 * ```
 */
export class CurtainPanelGeometry extends BufferGeometry {
  constructor({
    width = 1.4,
    drop = 3.2,
    fullness = 2.5,
    pleats = 9,
    pleat = "pinch",
    relax = 0.55,
    tiebackHeight = 0.62,
    topPull = 0,
    pull = 0.42,
    hemPull = 0,
    slack = 0.5,
    widthSegments = 160,
    heightSegments = 40,
  }: CurtainPanelGeometryOptions = {}) {
    super();

    const across = samplesPerPleat(widthSegments, pleats) * pleats;
    const down = Math.max(1, Math.floor(heightSegments));
    const own = planShape(pleat);
    const fabric = fullness * width;
    // A tieback at the very rod or the very hem leaves one half of the edge with no room to run.
    const tie = Math.min(0.98, Math.max(0.02, tiebackHeight));

    const grid: Vector3[][] = [];

    for (let j = 0; j <= down; j++) {
      const v = j / down;

      // THE LEADING EDGE, through its three anchors. Above the tie it runs from `topPull` to `pull`;
      // below it, from `pull` to `hemPull`. Two independent halves, which is the whole reason this is
      // three numbers and not one bump — a single spread has to serve both and can suit neither.
      const drawn =
        v <= tie
          ? topPull + (pull - topPull) * ease(v / tie, slack)
          : pull + (hemPull - pull) * ease((v - tie) / (1 - tie), slack);

      const lead = drawn * width;
      const span = Math.max(width * 0.06, width - lead);

      // Same cloth, less width: the local fullness is whatever the leading edge leaves it, and the fold
      // depth is solved from that rather than set.
      const blend = relax * v;
      const shape: PleatShape = (phase) =>
        own(phase) * (1 - blend) + Math.sin((phase - Math.floor(phase)) * Math.PI * 2) * blend;
      const amplitude = solveAmplitude(shape, fabric / span, span / pleats);

      const row: Vector3[] = [];
      for (let i = 0; i <= across; i++) {
        const u = i / across;
        row.push(new Vector3(lead + u * span, -v * drop, shape(u * pleats) * amplitude));
      }

      grid.push(row);
    }

    const geometry = surfaceGrid(grid);
    this.setIndex(geometry.getIndex());
    for (const name of Object.keys(geometry.attributes)) {
      this.setAttribute(name, geometry.attributes[name]!);
    }
    geometry.dispose();
  }
}

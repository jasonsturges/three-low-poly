import { BufferGeometry, Vector2 } from "three";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "../../utils/GeometryBuffers";
import { offsetLoop } from "../../utils/OffsetLoop";

/**
 * How an edge is worked.
 *
 * - `sharp` — left alone. The box, unmodified.
 * - `chamfer` — a flat splay. One facet, whatever `segments` says.
 * - `round` — convex, a bullnose. The solid reaches nearly full size at once, then flattens.
 * - `cove` — concave. It stays pulled in and flares late.
 *
 * `round` and `cove` are the same construction with the curve bowed the other way, which is why an inside
 * and an outside edge are one option here rather than two geometries.
 */
export type EdgeStyle = "sharp" | "chamfer" | "round" | "cove";

/** Which pair of faces is worked — the axis the treatment is measured along. */
export type EdgeAxis = "x" | "y" | "z";

/** Which of the two faces on {@link EdgeAxis} is worked. `low` and `high` are the −/+ ends of that axis. */
export type EdgeEnds = "both" | "low" | "high" | "none";

export interface EdgedBoxGeometryOptions {
  /** Extent on X. Defaults to `1`. */
  width?: number;
  /** Extent on Y. Defaults to `1`. */
  height?: number;
  /** Extent on Z. Defaults to `1`. */
  depth?: number;
  /** How the edge is worked. Defaults to `"chamfer"`. See {@link EdgeStyle}. */
  edge?: EdgeStyle;
  /**
   * How deep the treatment runs, both inward from the sides and along the axis. Defaults to `0.1`.
   *
   * Clamped so the solid can never fold: it will not exceed half the smaller cross-section dimension, nor
   * half the length when both ends are worked.
   */
  radius?: number;
  /**
   * How finely a `round` or `cove` is cut — the low-poly knob. Defaults to `4`.
   *
   * `1` collapses either onto its own chord, which is a chamfer. Like `segments` everywhere else here it
   * changes TESSELLATION only: the solid fills `width × height × depth` exactly at every setting.
   */
  segments?: number;
  /**
   * Which pair of faces is worked. Defaults to `"y"` — the top and bottom.
   *
   * The dimensions do not rotate with it: `width` is always the extent on X. Only the treatment moves.
   */
  axis?: EdgeAxis;
  /** Which of that pair. Defaults to `"both"`. `"low"` alone is a plinth; `"both"` is a raised panel. */
  ends?: EdgeEnds;
}

/** One cross-section of the stack: how far along the axis, and how far in from the outline. */
interface Level {
  rise: number;
  inset: number;
}

/**
 * A box with its edges chamfered, rounded, or coved along one axis.
 *
 * **Built as a LOFT, not by rounding edges.** The solid is a stack of cross-sections — each one the base
 * rectangle pushed inward by however much the edge profile says at that height — with the bands between
 * them stitched. Three treatments come out of one mechanism, differing only in how the inset falls off:
 * a straight line, a convex quarter, a concave quarter.
 *
 * Two things fall out for free, and they are the reason this construction was worth finding:
 *
 * - **No corner logic.** There is none in this file. A corner is only ever where two bands of the loft
 *   meet, and each band brings its own plane, so the four corners of the treatment resolve themselves.
 * - **Nothing is trimmed.** Edge rounding wants a real trimming capability; lofting between sections
 *   wants nothing but {@link offsetLoop}.
 *
 * The inset is a true offset rather than a scale, so a long thin box keeps a constant edge all the way
 * round instead of a wider one on its long sides.
 *
 * Sits on the `y = 0` plane, centered on X and Z — whichever `axis` is worked. Material groups: none; pass
 * one material, not an array.
 *
 * @example
 * ```ts
 * // A shelf with a bullnose front edge.
 * const shelf = new Mesh(
 *   new EdgedBoxGeometry({ width: 1.2, height: 0.04, depth: 0.3, edge: "round", radius: 0.02, axis: "z", ends: "high" }),
 *   oak,
 * );
 * ```
 */
export class EdgedBoxGeometry extends BufferGeometry {
  constructor({
    width = 1,
    height = 1,
    depth = 1,
    edge = "chamfer",
    radius = 0.1,
    segments = 4,
    axis = "y",
    ends = "both",
  }: EdgedBoxGeometryOptions = {}) {
    super();

    // The stack is always built along +Y and then turned. Rotating is a PROPER rotation, so the swept
    // winding survives it — which mirroring the coordinates would not do.
    const [across, through, along] =
      axis === "y" ? [width, depth, height] : axis === "x" ? [height, depth, width] : [width, height, depth];

    const geometry = buildStack(across, through, along, edge, radius, segments, ends);
    if (axis === "x") geometry.rotateZ(-Math.PI / 2);
    else if (axis === "z") geometry.rotateX(Math.PI / 2);

    // Stated anchor: standing on y = 0, centered on X and Z, whichever axis was worked.
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);

    this.copy(geometry);
    geometry.dispose();
    this.computeBoundingSphere();
  }
}

/**
 * The edge's own profile, from the face inward.
 *
 * All three run from `(rise 0, inset radius)` — the face, pulled fully in — to `(rise radius, inset 0)`,
 * where the solid reaches full size. Parametrized by ANGLE rather than by rise, because sampling rise
 * uniformly would bunch a round's points where the curve is flat and starve it where it turns.
 */
function edgeProfile(style: EdgeStyle, radius: number, segments: number): Level[] {
  if (style === "sharp" || radius <= 0) return [{ rise: 0, inset: 0 }];
  // A chamfer is one flat facet, so `segments` must not reach it — a chamfer that got smoother would not
  // be a chamfer.
  if (style === "chamfer") {
    return [
      { rise: 0, inset: radius },
      { rise: radius, inset: 0 },
    ];
  }

  const steps = Math.max(1, Math.round(segments));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * (Math.PI / 2);
    return style === "round"
      ? { rise: radius * (1 - Math.cos(t)), inset: radius * (1 - Math.sin(t)) }
      : { rise: radius * Math.sin(t), inset: radius * Math.cos(t) };
  });
}

/** The solid, built along +Y: a stack of offset loops with the bands between them stitched. */
function buildStack(
  across: number,
  through: number,
  along: number,
  style: EdgeStyle,
  radius: number,
  segments: number,
  ends: EdgeEnds,
): BufferGeometry {
  const ha = across / 2;
  const ht = through / 2;
  // Counter-clockwise, as `offsetLoop` requires.
  const outline = [
    new Vector2(-ha, -ht),
    new Vector2(ha, -ht),
    new Vector2(ha, ht),
    new Vector2(-ha, ht),
  ];

  const low = ends === "both" || ends === "low";
  const high = ends === "both" || ends === "high";
  // A treatment deeper than the solid would meet itself in the middle. Clamp rather than fold.
  const reach = Math.max(
    0,
    Math.min(radius, Math.min(across, through) / 2 - 1e-4, (low && high ? along / 2 : along) - 1e-4),
  );
  const profile = edgeProfile(style, reach, segments);

  const sections: { loop: Vector2[]; y: number }[] = [];
  const push = (y: number, inset: number) => {
    // `offsetLoop` at zero distance still walks and rebuilds the loop; skip it so an untreated section is
    // literally the outline.
    sections.push({ loop: inset < 1e-9 ? outline : offsetLoop(outline, -inset), y });
  };

  if (low) for (const level of profile) push(level.rise, level.inset);
  else push(0, 0);

  if (high) for (const level of [...profile].reverse()) push(along - level.rise, level.inset);
  else push(along, 0);

  const buffers = createGeometryBuffers();
  const at = (p: Vector2, y: number): Vec3 => [p.x, y, p.y];

  for (let s = 0; s < sections.length - 1; s++) {
    const lower = sections[s]!;
    const upper = sections[s + 1]!;
    // Coincident sections happen wherever a profile starts or ends flat, and a zero-height band has no
    // normal to compute from.
    if (Math.abs(upper.y - lower.y) < 1e-12) continue;

    for (let i = 0; i < lower.loop.length; i++) {
      const j = (i + 1) % lower.loop.length;
      pushQuad(
        buffers,
        [
          at(lower.loop[j]!, lower.y),
          at(lower.loop[i]!, lower.y),
          at(upper.loop[i]!, upper.y),
          at(upper.loop[j]!, upper.y),
        ],
        undefined,
      );
    }
  }

  const cap = (loop: Vector2[], y: number, normal: Vec3, reverse: boolean) => {
    const order = reverse ? loop.map((_, i) => loop.length - 1 - i) : loop.map((_, i) => i);
    for (let i = 1; i < loop.length - 1; i++) {
      pushTriangle(
        buffers,
        [at(loop[order[0]!]!, y), at(loop[order[i]!]!, y), at(loop[order[i + 1]!]!, y)],
        normal,
      );
    }
  };
  const first = sections[0]!;
  const last = sections[sections.length - 1]!;
  cap(first.loop, first.y, [0, -1, 0], false);
  cap(last.loop, last.y, [0, 1, 0], true);

  return toBufferGeometry(buffers);
}

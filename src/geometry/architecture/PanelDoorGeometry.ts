import { BoxGeometry, BufferGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { miterFrames } from "../../sweep/MiterFrames";
import { sweep } from "../../sweep/Sweep";
import { createGeometryBuffers, pushQuad, pushTriangle, toBufferGeometry, type Vec2, type Vec3 } from "../../utils/GeometryBuffers";
import { offsetLoop } from "../../utils/OffsetLoop";

/** One panel's aperture in the frame, before the groove is taken into account. */
interface Opening {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface PanelDoorGeometryOptions {
  /** Width of the door leaf. Defaults to `0.813` — a 32 inch door. */
  width?: number;
  /** Height of the leaf. Defaults to `2.032` — 80 inches, the standard door height. */
  height?: number;
  /** Thickness of the leaf. Defaults to `0.045`. */
  thickness?: number;
  /**
   * Width of each stile — the two vertical members. Defaults to `0.115`.
   *
   * The stiles run the full height and everything else lands on them, so this also sets how far the
   * panels are held in from the door's edges.
   */
  stileWidth?: number;
  /** Height of the top rail. Defaults to `0.115`, matching the stiles. */
  topRail?: number;
  /**
   * Height of the lock rail — the middle one, named for the lockset it carries. Defaults to `0.2`.
   *
   * Deeper than the others because it is bored through for a latch, and because it is the rail a hand
   * meets.
   */
  lockRail?: number;
  /**
   * Height of the bottom rail. Defaults to `0.235`.
   *
   * Traditionally the deepest member: it is the one that gets kicked, and a taller rail reads as a base
   * the door stands on rather than a border around it.
   */
  bottomRail?: number;
  /**
   * Height of the lock rail's CENTRE, as a fraction of the door's height. Defaults to `0.44`.
   *
   * A fraction rather than a distance, deliberately. Given in world units it would stay put while the
   * door grew around it, so resizing would quietly change the door's character instead of scaling it —
   * a tall door would end up with a lock rail down by its knees. As a fraction the proportions hold, and
   * {@link PanelDoorGeometry.lockRailY} reports where it actually landed.
   */
  lockRailPosition?: number;
  /** Width of the muntin — the short vertical divider between the panels. Defaults to `0.1`. */
  muntinWidth?: number;
  /**
   * How the panels are worked. Defaults to `"raised"`.
   *
   * - `"raised"` — a flat FIELD in the middle, a BEVEL sloping down to a thin edge. The classical panel,
   *   and what casts the shadow line that makes a panelled door read as panelled.
   * - `"flat"` — a plain board of `panelThickness` throughout. The Shaker door.
   */
  panel?: "raised" | "flat";
  /** Thickness of the panel at its field. Defaults to `0.018`. */
  panelThickness?: number;
  /** Width of the bevel around a raised panel — the slope from field to tongue. Defaults to `0.055`. */
  bevelWidth?: number;
  /**
   * Thickness of the panel's TONGUE, the thinned edge that sits in the frame's groove. Defaults to
   * `0.008`. Ignored by a flat panel, which is one thickness throughout.
   */
  tongueThickness?: number;
  /**
   * How far the panel runs into the frame's groove on every side. Defaults to `0.012`.
   *
   * A panel is never cut to its opening — a panel the size of the opening falls out of it. It is cut
   * oversize and held in a groove, loose, so it can move with the season without splitting the frame.
   */
  grooveDepth?: number;
  /** Add planted moulding around each panel, on both faces. Defaults to `false`. */
  moulding?: boolean;
  /** How far the moulding lies across the frame, measured out from the opening's edge. Defaults to `0.022`. */
  mouldingWidth?: number;
  /** How far the moulding stands proud of the door's face. Defaults to `0.012`. */
  mouldingHeight?: number;
  /**
   * How finely the moulding's quarter-round is cut — the low-poly knob. Defaults to `4`.
   *
   * `1` is a plain chamfer, `12` reads as turned.
   */
  mouldingSegments?: number;
}

/**
 * A four-panel door, built the way a joiner builds one: **frame and panel**.
 *
 * Two STILES run the full height, and the RAILS — top, lock, bottom — butt into them, with a MUNTIN
 * butting between the rails to split each row in two. That is a T-junction at every joint, and it is
 * deliberate rather than a simplification: the hinges screw into the stile and the whole leaf hangs off
 * it, so the stile has to be one continuous member. Mitering those corners would trade the door's
 * strongest member for four end-grain joints. (Mitered frames are a real style, but a cabinet-door one —
 * they cannot carry a door's weight, and a miter cannot join unequal stock, so the deep bottom rail that
 * gives a door its stance would be impossible.)
 *
 * The panels FLOAT. Each one is cut oversize and runs into a groove in the surrounding members, never
 * glued, so it can move with the season without splitting the frame. A raised panel is a flat field with
 * a bevel sloping down to a thin tongue — and its four bevels meet at the corners in a 45° hip, which
 * comes free because the surface is lofted between two loops rather than swept along one.
 *
 * With `moulding` on, an ovolo section wraps each opening as one closed **mitered** loop. That is the
 * only miter on the door, and it is the one a joiner cuts too.
 *
 * Stands on the `y = 0` plane, centred on X, with its faces at `±thickness / 2`. To hang it, move the
 * origin onto the hinge stile first — `geometry.translate(width / 2, 0, 0)` puts it on the left edge, so
 * rotating the mesh about Y swings the door.
 *
 * Material groups: none. A door is one piece of joinery in one material, so this is a single geometry
 * with a single group — pass one material, not an array.
 *
 * @example
 * ```ts
 * const door = new Mesh(new PanelDoorGeometry({ moulding: true }), paint);
 * ```
 */
export class PanelDoorGeometry extends BufferGeometry {
  /**
   * Height of the lock rail's centre, in world units — where a knob, a latch, or a letter plate mounts.
   *
   * Reported rather than assumed, because it follows `lockRailPosition` and the door's height.
   */
  readonly lockRailY: number;

  constructor({
    width = 0.813,
    height = 2.032,
    thickness = 0.045,
    stileWidth = 0.115,
    topRail = 0.115,
    lockRail = 0.2,
    bottomRail = 0.235,
    lockRailPosition = 0.44,
    muntinWidth = 0.1,
    panel = "raised",
    panelThickness = 0.018,
    bevelWidth = 0.055,
    tongueThickness = 0.008,
    grooveDepth = 0.012,
    moulding = false,
    mouldingWidth = 0.022,
    mouldingHeight = 0.012,
    mouldingSegments = 4,
  }: PanelDoorGeometryOptions = {}) {
    super();

    const halfWidth = width / 2;
    const front = thickness / 2;
    const innerLeft = -halfWidth + stileWidth;
    const innerRight = halfWidth - stileWidth;
    const lockBottom = height * lockRailPosition - lockRail / 2;
    const lockTop = lockBottom + lockRail;
    const topRailBottom = height - topRail;

    this.lockRailY = lockBottom + lockRail / 2;

    const parts: BufferGeometry[] = [
      // The stiles, full height. Everything else lands on them.
      box(-halfWidth, innerLeft, 0, height, -front, front),
      box(innerRight, halfWidth, 0, height, -front, front),
      // The rails, butting between the stiles.
      box(innerLeft, innerRight, topRailBottom, height, -front, front),
      box(innerLeft, innerRight, lockBottom, lockTop, -front, front),
      box(innerLeft, innerRight, 0, bottomRail, -front, front),
      // The muntins, butting between the rails.
      box(-muntinWidth / 2, muntinWidth / 2, lockTop, topRailBottom, -front, front),
      box(-muntinWidth / 2, muntinWidth / 2, bottomRail, lockBottom, -front, front),
    ];

    const openings: Opening[] = [
      { x0: innerLeft, x1: -muntinWidth / 2, y0: lockTop, y1: topRailBottom },
      { x0: muntinWidth / 2, x1: innerRight, y0: lockTop, y1: topRailBottom },
      { x0: innerLeft, x1: -muntinWidth / 2, y0: bottomRail, y1: lockBottom },
      { x0: muntinWidth / 2, x1: innerRight, y0: bottomRail, y1: lockBottom },
    ];

    for (const opening of openings) {
      // Members can be given widths that leave no opening at all. A degenerate panel is worse than a
      // missing one — it inverts, and the bevel folds through itself.
      if (opening.x1 - opening.x0 <= 0 || opening.y1 - opening.y0 <= 0) continue;

      parts.push(
        buildPanel(opening, { panel, panelThickness, bevelWidth, tongueThickness, grooveDepth }),
      );

      if (moulding) {
        parts.push(
          ...buildMoulding(opening, {
            thickness,
            mouldingWidth,
            mouldingHeight,
            mouldingSegments,
          }),
        );
      }
    }

    // Not cast — `mergeGeometries` returns null on mismatched attributes, and a cast turns that into an
    // unreadable "cannot read properties of null" three frames later. Every part here is indexed and
    // carries position, normal, and uv, which is what it requires.
    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error("PanelDoorGeometry: parts have incompatible attributes.");

    this.copy(merged);
    merged.dispose();
    parts.forEach((part) => part.dispose());
    this.computeBoundingSphere();
  }
}

/** A rectangular member, given by the two corners it spans. */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BufferGeometry {
  return new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate(
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
  );
}

/** A flat cap over a closed loop at height `z`, facing `+Z` when `outward` is positive. */
function pushCap(
  buffers: ReturnType<typeof createGeometryBuffers>,
  loop: Vector2[],
  z: number,
  outward: number,
): void {
  const normal: Vec3 = [0, 0, Math.sign(outward)];
  const at = (i: number): Vec3 => [loop[i]!.x, loop[i]!.y, z];
  const order = outward > 0 ? loop.map((_, i) => i) : loop.map((_, i) => loop.length - 1 - i);

  if (loop.length === 4) {
    pushQuad(buffers, [at(order[0]!), at(order[1]!), at(order[2]!), at(order[3]!)], normal);
    return;
  }
  // A fan, for a field that is not a rectangle.
  for (let i = 1; i < loop.length - 1; i++) {
    pushTriangle(buffers, [at(order[0]!), at(order[i]!), at(order[i + 1]!)], normal);
  }
}

/**
 * One panel: a loft between the outline and the field inset inside it, mirrored on both faces, closed
 * by the tongue's own edge.
 *
 * The inset comes from {@link offsetLoop} rather than from shrinking the rectangle. The two agree only
 * on a square — and only a real offset survives the day this outline stops being a rectangle.
 */
function buildPanel(
  opening: Opening,
  {
    panel,
    panelThickness,
    bevelWidth,
    tongueThickness,
    grooveDepth,
  }: Required<Pick<PanelDoorGeometryOptions, "panel" | "panelThickness" | "bevelWidth" | "tongueThickness" | "grooveDepth">>,
): BufferGeometry {
  // Cut oversize on every side, to sit in the groove.
  const outline = [
    new Vector2(opening.x0 - grooveDepth, opening.y0 - grooveDepth),
    new Vector2(opening.x1 + grooveDepth, opening.y0 - grooveDepth),
    new Vector2(opening.x1 + grooveDepth, opening.y1 + grooveDepth),
    new Vector2(opening.x0 - grooveDepth, opening.y1 + grooveDepth),
  ];

  const buffers = createGeometryBuffers();
  const flat = panel === "flat";
  const edge = flat ? panelThickness / 2 : tongueThickness / 2;
  const field = panelThickness / 2;
  // Never past the middle: a bevel wider than half the panel has no field left to slope down to.
  const span = Math.min(opening.x1 - opening.x0, opening.y1 - opening.y0) / 2;
  const inset = Math.max(0, Math.min(bevelWidth, span - 0.005));
  const inner = flat || inset === 0 ? outline : offsetLoop(outline, -inset);

  for (const side of [1, -1]) {
    pushCap(buffers, inner, side * field, side);
    if (flat || inner === outline) continue;

    // The bevel. Each quad carries its own slanted normal, so it facets under flat shading — and the
    // four bands meet at the corners in a 45° hip, which is free here only because this is a loft
    // between two loops rather than a sweep along one.
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      const o0: Vec3 = [outline[i]!.x, outline[i]!.y, side * edge];
      const o1: Vec3 = [outline[j]!.x, outline[j]!.y, side * edge];
      const f1: Vec3 = [inner[j]!.x, inner[j]!.y, side * field];
      const f0: Vec3 = [inner[i]!.x, inner[i]!.y, side * field];
      pushQuad(buffers, side > 0 ? [o0, o1, f1, f0] : [o1, o0, f0, f1], undefined);
    }
  }

  // The tongue's edge — the sliver that disappears into the groove.
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    pushQuad(
      buffers,
      [
        [outline[i]!.x, outline[i]!.y, -edge],
        [outline[j]!.x, outline[j]!.y, -edge],
        [outline[j]!.x, outline[j]!.y, edge],
        [outline[i]!.x, outline[i]!.y, edge],
      ],
      undefined,
    );
  }

  return toBufferGeometry(buffers);
}

/**
 * A quarter-round (ovolo) section, in the sweep station's own axes.
 *
 * `px` runs along the frame's normal — proud of the door's face — and `py` along its binormal, which on a
 * loop wound counter-clockwise points radially outward, away from the opening. So the section is a lip
 * standing at the opening's edge, curving down onto the frame.
 */
function ovoloProfile(width: number, height: number, segments: number): Vec2[] {
  const points: Vec2[] = [[0, 0]];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * (Math.PI / 2);
    points.push([height * Math.cos(angle), width * Math.sin(angle)]);
  }
  return points;
}

/**
 * Planted moulding around one opening, on both faces — a closed mitered loop each.
 *
 * The section never has to know about the corners: the miter is a property of the PATH, so an arbitrary
 * routed profile wraps the opening exactly as a plain bar would. The back face runs the loop reversed
 * against a `-Z` reference, which lands the same section proud of the back and still facing outward.
 */
function buildMoulding(
  opening: Opening,
  {
    thickness,
    mouldingWidth,
    mouldingHeight,
    mouldingSegments,
  }: Required<Pick<PanelDoorGeometryOptions, "thickness" | "mouldingWidth" | "mouldingHeight" | "mouldingSegments">>,
): BufferGeometry[] {
  const profile = ovoloProfile(mouldingWidth, mouldingHeight, Math.max(1, Math.round(mouldingSegments)));
  const front = thickness / 2;

  return [1, -1].map((side) => {
    const loop = [
      new Vector3(opening.x0, opening.y0, side * front),
      new Vector3(opening.x1, opening.y0, side * front),
      new Vector3(opening.x1, opening.y1, side * front),
      new Vector3(opening.x0, opening.y1, side * front),
    ];
    if (side < 0) loop.reverse();

    return sweep(
      profile,
      miterFrames(
        loop.map((position) => ({ position, tangent: new Vector3() })),
        { closed: true, reference: new Vector3(0, 0, side) },
      ),
      { closed: true },
    );
  });
}

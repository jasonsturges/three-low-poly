import { BufferGeometry, ConeGeometry, CylinderGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { linePath } from "../../paths/LinePath";
import { circleProfile } from "../../sweep/Profiles";
import { miterFrames } from "../../sweep/MiterFrames";
import { sweep } from "../../sweep/Sweep";
import { createGeometryBuffers, pushQuad, toBufferGeometry, type Vec3 } from "../../utils/GeometryBuffers";

const UP = /*@__PURE__*/ new Vector3(0, 1, 0);
/** The cage's own axis — the glass panes face ±X and ±Z, so a square bar squares up to this. */
const CAGE_AXIS = /*@__PURE__*/ new Vector3(1, 0, 0);

export interface CoachLanternGeometryOptions {
  /** Distance from the hang point down to the top of the cage. Defaults to `0.42`. */
  drop?: number;
  /** Half-width of the cage at its base. Defaults to `0.15`. */
  width?: number;
  /** Cage height, cap underside to floor plate. Defaults to `0.4`. */
  height?: number;
  /**
   * How far the cage narrows toward the top, as a fraction of `width`. Defaults to `0.72`.
   *
   * `1` gives straight sides; smaller values rake the posts inward, which is what reads as a coach
   * lantern rather than a box.
   */
  taper?: number;
  /** Post bar radius. Defaults to `0.015`. */
  barWidth?: number;
  /** Pyramidal cap height. Defaults to `0.15`. */
  capHeight?: number;
  /**
   * Pyramid cap size as a multiple of the **roof plate**. Defaults to `1.4`.
   *
   * Measured against the plate rather than `width` so the two are directly comparable, which makes `1` the
   * boundary between the lantern's two roof styles:
   *
   * - **above `1`** — the cap oversails the plate and reads as a **roof** over the whole lantern. The plate
   *   vanishes beneath it, and a consumer need not know it is there.
   * - **below `1`** — the cap sits inset on a flat roof and reads as a centred **gable**. This is the
   *   country-lantern look.
   *
   * The cap always stands *on* the plate, so it cannot intersect or pass through it at any value.
   */
  capSpread?: number;
  /**
   * Roof plate size as a multiple of the cage's **top** corner distance. Defaults to `1.05` — just proud of
   * the top corners, so the plate closes the cage rather than leaving a gap you can see through.
   *
   * Measured at the top so it tracks {@link CoachLanternGeometryOptions.taper} automatically and does not
   * need re-tuning whenever the cage is re-raked.
   */
  roofSpread?: number;
  /** Roof plate thickness as a multiple of `barWidth`. Defaults to `2`. */
  roofThickness?: number;
  /** The ring at the hang point that a chain or hook passes through. Defaults to `true`. */
  bail?: boolean;
  /**
   * Bail ring radius as a multiple of `barWidth`. Defaults to `3`.
   *
   * This is what a chain or hook has to fit through, so it is the one dimension a consumer may need to match
   * against something else. Raising it also lowers the cap, since the rod starts below the ring.
   */
  bailRadius?: number;
  /** Bail wire thickness as a multiple of `barWidth`. Defaults to `0.8` — slightly lighter than the bars. */
  bailThickness?: number;
  /**
   * Segments around the bail's ring — its roundness. Defaults to `10`. Minimum `3`.
   *
   * **The bail is the only round part of this geometry**, so it is the only place a segment count changes
   * anything. The cap, roof plate, and floor plate are 4-sided because 4 *is* the square they are meant to
   * be, not because they are coarse approximations of a circle.
   */
  bailSegments?: number;
  /** Sides on the bail's wire cross-section. Defaults to `6`. Minimum `3`. */
  bailSides?: number;
  /**
   * Floor plate size, as a multiple of the distance from centre to the cage's bottom corners.
   * Defaults to `1.15` — just proud of the posts, so the plate closes the cage rather than leaving a
   * gap you can see the interior through.
   *
   * `1` lands exactly on the corner centrelines (the bars' outer halves stay proud). Raise past `1.3`
   * for a plate that oversails the cage like a country lantern's tray.
   */
  plateSpread?: number;
  /**
   * Floor plate thickness as a multiple of `barWidth`. Defaults to `2`, matching
   * {@link CoachLanternGeometryOptions.roofThickness}.
   *
   * The plate **stacks below** the lower rail, mirroring the roof plate stacking above the upper rail, so no
   * thickness can bury the cage — both plates sit outside it and the frame stays fully visible. Thickening
   * this one grows it downward and leaves the candle where it is.
   */
  plateThickness?: number;
  /** The dropped spike beneath the floor plate. Defaults to `true`. */
  finial?: boolean;
  /** A candle standing on the floor plate. Defaults to `true`. */
  candle?: boolean;
  /** Candle height as a fraction of `height`. Defaults to `0.5`. */
  candleHeight?: number;
}

/**
 * Wrought-iron coach lantern — a tapered four-sided cage under a pyramidal cap, glazed on all four
 * faces, with a candle standing on the floor plate.
 *
 * Material groups: `0` iron (bail, rod, cap, roof plate, posts, rails, floor plate, finial), `1` glass
 * (four panes), `2` wax (the candle). Group `2` is absent when `candle` is `false`.
 *
 * Local frame: **origin at the hang point** — the topmost metal of the bail, so the lantern hangs into −Y
 * and `drop` lengthens the rod without moving where it attaches. That is the point a consumer positions
 * against a ceiling or a bracket, and it is also the natural pivot if the lantern swings.
 *
 * {@link wickY} is where a flame, glow, and light belong. The flame is deliberately **not** part of this
 * geometry: welded into the vertices it could not move, and a flame that cannot move is not a flame.
 * Position it at `wickY` and let it pivot there.
 *
 * @example
 * ```typescript
 * const lantern = new Mesh(new CoachLanternGeometry({ drop: 0.6 }), [iron, glass, wax]);
 * ```
 */
export class CoachLanternGeometry extends BufferGeometry {
  readonly drop: number;
  readonly width: number;
  readonly height: number;
  /**
   * Y of the cage top — the upper rail's centreline. The roof plate rests on that rail and the pyramid cap
   * rests on the plate, so both sit *above* this.
   */
  readonly capY: number;
  /** Y of the cage bottom — the lower rail's centreline, and the floor plate's centreline. */
  readonly baseY: number;
  /**
   * Y of the floor plate's upper face — the surface the candle stands on. The plate stacks below the lower
   * rail, so this is flush with that rail's underside and does **not** move with
   * {@link CoachLanternGeometryOptions.plateThickness}.
   */
  readonly trayY: number;
  /** Y of the candle's wick. Attach the flame, glow, and light here. */
  readonly wickY: number;

  constructor({
    drop = 0.42,
    width = 0.15,
    height = 0.4,
    taper = 0.72,
    barWidth = 0.015,
    capHeight = 0.15,
    capSpread = 1.4,
    roofSpread = 1.05,
    roofThickness = 2,
    plateSpread = 1.15,
    plateThickness = 2,
    bail = true,
    bailRadius = 3,
    bailThickness = 0.8,
    bailSegments = 10,
    bailSides = 6,
    finial = true,
    candle = true,
    candleHeight = 0.5,
  }: CoachLanternGeometryOptions = {}) {
    super();

    this.drop = drop;
    this.width = width;
    this.height = height;

    const capY = -drop;
    const baseY = capY - height;
    const top = width * taper;
    const bottom = width;

    const floorPlate = barWidth * plateThickness;

    this.capY = capY;
    this.baseY = baseY;
    // `trayY` and `wickY` depend on where the lower rail's underside actually is, so they are assigned once
    // the rails exist rather than predicted from `baseY`.

    const iron: BufferGeometry[] = [];

    // --- bail and rod ---------------------------------------------------------
    // The bail is a real ring rather than an implied hole, so a chain or hook has something to pass
    // through and the joint is visible instead of assumed.
    const ringRadius = barWidth * bailRadius;
    const ringTube = barWidth * bailThickness;
    let rodTop = 0;
    if (bail) {
      const ring = new TorusGeometry(
        ringRadius,
        ringTube,
        Math.max(3, bailSides),
        Math.max(3, bailSegments),
      ).rotateY(Math.PI / 2);

      // Drop the ring so its topmost metal lands exactly on the origin, which is what the anchor claims and
      // what `bail: false` already does. Tessellation decides where that is: a 10-segment ring's highest
      // VERTEX sits below the analytic `radius + tube` because the polygon cuts the corner, so lifting by
      // `radius + tube` leaves it hanging a few thousandths low — and the error changes with `bailSegments`.
      ring.computeBoundingBox();
      const lift = -ring.boundingBox!.max.y;
      ring.translate(0, lift, 0);
      iron.push(ring);

      // The rod starts at the ring's centreline bottom so the two overlap rather than butt.
      rodTop = ringRadius - lift;
    }
    // The rod is pushed further down, once the roof it disappears into has been placed.

    // --- posts and the rails closing the cage top and bottom ------------------
    // Every bar is a profile swept along a line — the same kernel the arches and scrollwork use, which
    // is why the corners meet cleanly instead of interpenetrating.
    const cornerAt = (radius: number, y: number, index: number) => {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
      return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    };
    const corner = (halfWidth: number, y: number, index: number) =>
      cornerAt(halfWidth * Math.SQRT2, y, index);
    // A post is raked, so a frame perpendicular to its own axis cuts its ends on a slant: one lip buries
    // itself in the rail while the opposite lip lifts clear and punches out through it. Both ends are
    // SEAT CUT instead — cut to the horizontal plane they land on, so the end face is flat against it.
    //
    // `circleProfile(r, 4)` puts its faces perpendicular to the frame's axes, so `reference` decides which
    // way a square bar presents. It must be perpendicular to the cut plane's normal, so it cannot be UP
    // here — and it must be a CAGE axis, not the corner's radial direction. Radial looks like the
    // symmetric choice and is the wrong symmetry: it turns the post 45° and points an edge at each pane
    // instead of a face.
    // ONE segment, not two. An intermediate station on a straight bar is unstretched while both seat-cut
    // ends widen by `1 / cos φ`, so it pinches the middle — and a straight run has nothing to interpolate.
    const post = (from: Vector3, to: Vector3, radius: number) =>
      sweep(circleProfile(radius, 4), miterFrames(linePath(from, to, 1), { startCut: UP, endCut: UP, reference: CAGE_AXIS }));

    // A rail loop is ONE closed sweep with mitred corners: every ring sits in the plane bisecting its
    // joint, so consecutive segments share the identical ring and the corner closes exactly.
    const railLoop = (halfWidth: number, y: number, radius: number) =>
      sweep(
        circleProfile(radius, 4),
        miterFrames(
          [0, 1, 2, 3].map((i) => ({ position: corner(halfWidth, y, i), tangent: new Vector3() })),
          { closed: true, reference: new Vector3(0, 1, 0) },
        ),
        { closed: true },
      );

    // Rails and posts are the SAME stock, and that is not a stylistic default — it is the condition that
    // makes the post's faces continue the rails' rather than overhanging them. There is deliberately no
    // option to vary it: thinning the rails while leaving their centreline in place oversizes the post on
    // all four faces at once, and it cannot be tuned back, because moving a rail's outer face toward the
    // post moves its inner face away by the same amount. Lighter rails would need them INSET so their outer
    // faces stay flush — a different construction, not a scalar.
    const upperRail = railLoop(top, capY, barWidth);
    const lowerRail = railLoop(bottom, baseY, barWidth);

    // The posts SPAN BETWEEN the rails' facing surfaces rather than running into them. A miter aligns
    // surfaces so members meet; burying one member inside another is not a joint, it is a hidden defect —
    // and it was hiding one, with the lower rail dipping below the post's end where the floor plate
    // happened to cover it. Spanning means nothing in the cage interpenetrates.
    //
    // The rails' surfaces are read off their own bounding boxes, not recomputed. The profile decides where
    // a ring's extremes land — `circleProfile(r, 4)` reaches `r / √2` along a frame axis, not `r` — so
    // asking the geometry is right and assuming is a bug waiting for the profile to change.
    upperRail.computeBoundingBox();
    lowerRail.computeBoundingBox();
    const footY = lowerRail.boundingBox!.max.y;
    const headY = upperRail.boundingBox!.min.y;

    // The post's centre must land on the RAIL's centre radius at the contact plane, which is not the same
    // as the nominal corner line evaluated there: the corner line rakes inward as it rises, so by `footY`
    // it has already drifted in by the rake, and the post's faces miss the rail's by that drift. Take the
    // rails' own radii at the rails' own faces instead of interpolating a line between their centrelines.
    for (let i = 0; i < 4; i++) {
      iron.push(post(cornerAt(bottom * Math.SQRT2, footY, i), cornerAt(top * Math.SQRT2, headY, i), barWidth));
    }
    iron.push(upperRail, lowerRail);

    // --- roof: the plate on the cage, the pyramid cap on the plate -------------
    // Three parts STACKED, each resting on the one below rather than passing through it: top rail → roof
    // plate → pyramid cap. Stacking is what makes both usages fall out of a single construction, with no
    // mode switch:
    //
    //   `capSpread > 1` — the cap oversails the plate and reads as a ROOF over the whole lantern; the plate
    //                     disappears beneath it and a consumer need not know it is there.
    //   `capSpread < 1` — the cap sits inset on a flat roof and reads as a centred GABLE, which is the
    //                     country-lantern look.
    //
    // The cap previously had its base ON `capY` while the plate was CENTRED there, so the cap's base plane
    // was buried in the plate's slab. A wide cap hid that; a narrow one emerged from the middle of the
    // plate and eventually passed through it entirely.
    const roofY = upperRail.boundingBox!.max.y;
    const roofPlate = barWidth * roofThickness;
    // Measured against the cage's TOP corner distance, so the plate tracks `taper` instead of needing to be
    // re-tuned whenever the cage is re-raked. The old `top * 1.18` could never reach the corners at
    // `top * √2`, which is where the gap between plate and bars came from.
    const roofRadius = top * Math.SQRT2 * roofSpread;
    iron.push(
      new CylinderGeometry(roofRadius, roofRadius, roofPlate, 4)
        .rotateY(Math.PI / 4)
        .translate(0, roofY + roofPlate / 2, 0),
    );

    // `capSpread` is a multiple of the ROOF PLATE, not of `width`, so the two are directly comparable and
    // `1` is the meaningful boundary between a roof and a gable.
    const capBaseY = roofY + roofPlate;
    iron.push(
      new ConeGeometry(roofRadius * capSpread, capHeight, 4)
        .rotateY(Math.PI / 4)
        .translate(0, capBaseY + capHeight / 2, 0),
    );

    // The rod runs from the bail down into the cap, stopping partway up the cone so it is enclosed rather
    // than emerging through the apex.
    const rodEnd = capBaseY + capHeight * 0.35;
    const rodLength = Math.max(-rodTop - rodEnd, 0.001);
    iron.push(
      new CylinderGeometry(barWidth * 0.8, barWidth * 0.8, rodLength, 5).translate(0, -rodTop - rodLength / 2, 0),
    );

    // --- floor plate, and the finial hanging under it -------------------------
    // STACKS BELOW the lower rail, mirroring the roof plate stacking above the upper rail. Centring it on
    // `baseY` instead let it swallow the rail — and once the thickness became adjustable, a thick enough
    // plate made the bottom rail disappear entirely. Stacked, the cage reads as a complete frame at every
    // setting, with both plates outside it.
    //
    // Sized off the corner distance, not the half-width: `corner()` places corners at `width * √2`, so a
    // plate of radius `width * 1.2` could never reach them.
    const soffitY = lowerRail.boundingBox!.min.y;

    // With the plate stacked below the rail, the surface a candle stands on IS the rail's underside — the
    // plate's upper face is flush with it. Read off the geometry, so it stays right if the profile changes.
    const trayY = soffitY;
    this.trayY = trayY;
    this.wickY = trayY + height * candleHeight;

    const plateRadius = bottom * Math.SQRT2 * plateSpread;
    iron.push(
      new CylinderGeometry(plateRadius, plateRadius, floorPlate, 4)
        .rotateY(Math.PI / 4)
        .translate(0, soffitY - floorPlate / 2, 0),
    );
    if (finial) {
      // Base parked on the plate's CENTRELINE, so it stays buried in the plate at any thickness. Its old
      // fixed offset sat just inside a 0.03 plate and would have floated free of a thinner one, leaving a
      // gap between spike and tray.
      const spikeHeight = height * 0.3;
      const plateMidY = soffitY - floorPlate / 2;
      iron.push(
        new ConeGeometry(width / 3, spikeHeight, 5).rotateX(Math.PI).translate(0, plateMidY - spikeHeight / 2, 0),
      );
    }

    // --- glazing --------------------------------------------------------------
    // Four panes spanning the posts, raked with them. Quads rather than planes, because a tapered face
    // is a trapezoid and a `PlaneGeometry` cannot be one.
    const buffers = createGeometryBuffers();
    const point = (p: Vector3): Vec3 => [p.x, p.y, p.z];
    for (let i = 0; i < 4; i++) {
      pushQuad(
        buffers,
        [
          point(corner(bottom, baseY, i)),
          point(corner(bottom, baseY, i + 1)),
          point(corner(top, capY, i + 1)),
          point(corner(top, capY, i)),
        ],
        undefined,
      );
    }

    // Every part must agree on whether it carries an index — `mergeGeometries` requires it present in
    // all or none. `toBufferGeometry` sets one, the swept bars set one, the primitives do not, so
    // everything is flattened to non-indexed before either merge.
    const glazing = toBufferGeometry(buffers);
    const glass = glazing.toNonIndexed();
    glazing.dispose();

    const ironMerged = mergeGeometries(
      iron.map((part) => (part.index ? part.toNonIndexed() : part)),
      false,
    );
    if (!ironMerged) throw new Error("CoachLanternGeometry: iron parts failed to merge.");

    const parts: BufferGeometry[] = [ironMerged, glass];

    if (candle) {
      const waxHeight = height * candleHeight;
      parts.push(
        new CylinderGeometry(width * 0.22, width * 0.24, waxHeight, 8)
          .translate(0, trayY + waxHeight / 2, 0)
          .toNonIndexed(),
      );
    }

    // Not cast — `mergeGeometries` returns null on mismatched attributes, and a cast turns that into an
    // unreadable "cannot read properties of null" three frames later.
    const merged = mergeGeometries(parts, true);
    if (!merged) throw new Error("CoachLanternGeometry: parts have incompatible attributes.");

    this.copy(merged);
    merged.dispose();
    iron.forEach((part) => part.dispose());
    parts.forEach((part) => part.dispose());
    this.computeBoundingSphere();
  }
}

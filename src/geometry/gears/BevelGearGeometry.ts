import { BufferGeometry, Vector2 } from "three";
import { GearShape, type GearShapeOptions } from "../../shapes/GearShape";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "../../utils/GeometryBuffers";

export interface BevelGearGeometryOptions extends GearShapeOptions {
  /**
   * Half-angle of the pitch cone, measured from the axis, in radians. Defaults to `Math.PI / 4` (45°).
   *
   * A 45° pair of equal wheels meshes at a right angle with a 1:1 ratio — a **miter gear**. Approaching `90°`
   * flattens the cone into a **crown wheel**, its teeth standing on the face; approaching `0` stretches it into
   * a long thin cone, which is a plain spur gear.
   */
  pitchAngle?: number;
  /**
   * Tooth length measured **along the cone element**, not along the axis. Defaults to `0.35`.
   *
   * Clamped so the teeth cannot run past the cone's apex.
   */
  faceWidth?: number;
}

/** Points of a closed 2D contour, with the duplicated closing point dropped. */
function contour(points: Vector2[]): Vector2[] {
  if (points.length > 1 && points[0]!.distanceToSquared(points[points.length - 1]!) < 1e-12) {
    return points.slice(0, -1);
  }
  return points;
}

/**
 * Bevel gear — teeth cut on a **pitch cone**, for shafts whose axes intersect.
 *
 * Where {@link GearGeometry} extrudes a fixed profile into a cylinder, a bevel gear's teeth **taper toward the
 * cone's apex**. That convergence is the whole signature, and it is why this cannot be an extrusion: it is a
 * **loft** between the full profile at the back face and the same profile uniformly scaled at the front. Every
 * tooth flank therefore lies on a plane through the apex, correct by construction rather than by adjustment.
 *
 * A 45° pair of equal wheels is a **miter gear** — right angle, 1:1. Change
 * {@link BevelGearGeometryOptions.pitchAngle} and the same construction spans a spur-like cone near `0` through
 * to a flat crown wheel near `90°`. This is the wheel a gearbox or differential is built from; the
 * differential's crown wheel, pinion, and spider gears are all bevels.
 *
 * A pair meshes when their pitch cones share an apex, which makes the shaft angle the **sum** of the two cone
 * angles — so 45° + 45° is the right-angle case, and unequal angles give unequal ratios.
 *
 * Not a **worm** gear, which is a different mechanism: a helical screw driving a wheel, thread-based rather than
 * conical.
 *
 * Local frame: the **back face** (largest teeth) sits on `z = 0`, and the gear tapers toward `+Z`, with the cone's
 * apex on the axis at {@link apexZ}. The bore runs straight through — it is cylindrical, not tapered, because a
 * shaft is.
 *
 * Material groups: **none** — one material for the whole wheel.
 *
 * @example
 * ```typescript
 * // A miter pair: two identical 45° wheels meshing at a right angle.
 * const wheel = new Mesh(new BevelGearGeometry({ teeth: 16 }), steel);
 * const mate = new Mesh(new BevelGearGeometry({ teeth: 16 }), steel);
 * mate.rotation.x = Math.PI / 2;
 * ```
 */
export class BevelGearGeometry extends BufferGeometry {
  /** The bore radius actually used, after clamping inside the smaller front outline. */
  readonly holeRadius: number;
  /** Uniform scale of the front outline against the back — how far the teeth converge. */
  readonly frontScale: number;
  /** Z of the front face, where the teeth are smallest. */
  readonly frontZ: number;
  /** Z of the pitch cone's apex on the axis. Teeth stop short of it by construction. */
  readonly apexZ: number;
  /** The face width actually used, after clamping short of the apex. */
  readonly faceWidth: number;

  constructor({
    pitchAngle = Math.PI / 4,
    faceWidth = 0.35,
    ...gearOptions
  }: BevelGearGeometryOptions = {}) {
    super();

    const outerRadius = gearOptions.outerRadius ?? 1;
    const innerRadius = gearOptions.innerRadius ?? 0.5;
    const angle = Math.min(Math.max(pitchAngle, 0.05), Math.PI / 2 - 0.05);

    // Element length from the apex to the back face. Everything else is measured along this line, which is
    // what makes the taper a single uniform scale rather than a per-radius adjustment.
    const element = outerRadius / Math.sin(angle);
    // Leave material short of the apex; teeth converging to a literal point cannot be triangulated.
    const width = Math.min(Math.max(faceWidth, 1e-3), element * 0.95);
    const scale = (element - width) / element;

    this.faceWidth = width;
    this.frontScale = scale;
    this.frontZ = width * Math.cos(angle);
    this.apexZ = element * Math.cos(angle);

    // The front outline is smaller, so IT sets the bore limit. Take the clamp from the front shape and give the
    // same bore to both, or the two contours would stop corresponding and the loft would shear.
    const front = new GearShape({
      ...gearOptions,
      outerRadius: outerRadius * scale,
      innerRadius: innerRadius * scale,
    });
    const bore = front.holeRadius;
    this.holeRadius = bore;

    const back = new GearShape({ ...gearOptions, outerRadius, innerRadius, holeRadius: bore });

    const backOutline = contour(back.getPoints(0));
    const frontOutline = contour(front.getPoints(0));
    const count = Math.min(backOutline.length, frontOutline.length);

    const buffers = createGeometryBuffers();
    const at = (p: Vector2, z: number): Vec3 => [p.x, p.y, z];

    // --- the toothed cone: a quad per outline edge, spanning back face to front ---
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      pushQuad(
        buffers,
        [
          at(backOutline[i]!, 0),
          at(backOutline[j]!, 0),
          at(frontOutline[j]!, this.frontZ),
          at(frontOutline[i]!, this.frontZ),
        ],
        undefined,
      );
    }

    // --- bore wall, and the two end faces ---
    const boreRing: Vector2[] = [];
    if (bore > 0) {
      const sides = Math.max(3, Math.round(gearOptions.holeSides ?? 5));
      // Same offset convention as `GearShape`: relative to the wheel's phase.
      const start = Math.PI / 2 + (gearOptions.rotation ?? 0) + (gearOptions.holeRotation ?? 0);
      for (let i = 0; i < sides; i++) {
        const a = start + (Math.PI * 2 * i) / sides;
        boreRing.push(new Vector2(Math.cos(a) * bore, Math.sin(a) * bore));
      }

      // Cylindrical, not tapered — a shaft does not taper. Wound to face inward, into the hole.
      for (let i = 0; i < boreRing.length; i++) {
        const j = (i + 1) % boreRing.length;
        pushQuad(
          buffers,
          [
            at(boreRing[j]!, 0),
            at(boreRing[i]!, 0),
            at(boreRing[i]!, this.frontZ),
            at(boreRing[j]!, this.frontZ),
          ],
          undefined,
        );
      }
    }

    /**
     * Close one end by stitching its outline to the bore ring.
     *
     * The two loops carry different vertex counts, so each outline edge takes the bore vertex nearest it in
     * angle — giving a quad where the bore advances and a triangle where it does not.
     */
    const cap = (outline: Vector2[], z: number, normal: Vec3, flip: boolean) => {
      const n = outline.length;
      const m = boreRing.length;
      for (let i = 0; i < n; i++) {
        const i2 = (i + 1) % n;
        const j = Math.floor((i * m) / n) % m;
        const j2 = Math.floor((i2 * m) / n) % m;
        const a = at(outline[i]!, z);
        const b = at(outline[i2]!, z);
        const c = at(boreRing[j2]!, z);
        const d = at(boreRing[j]!, z);
        if (j === j2) {
          pushTriangle(buffers, flip ? [b, a, d] : [a, b, d], normal);
        } else {
          pushQuad(buffers, flip ? [b, a, d, c] : [a, b, c, d], normal);
        }
      }
    };

    if (bore > 0) {
      // Back face looks away from the apex; front face looks toward it.
      cap(backOutline, 0, [0, 0, -1], true);
      cap(frontOutline, this.frontZ, [0, 0, 1], false);
    }

    const geometry = toBufferGeometry(buffers);
    this.copy(geometry);
    geometry.dispose();
    this.computeBoundingSphere();
  }
}

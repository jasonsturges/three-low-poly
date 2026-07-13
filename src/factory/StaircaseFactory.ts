import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  MathUtils,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { StaircaseGeometry } from "../geometry/architecture/StaircaseGeometry";

export interface StaircaseOptions {
  /** Number of flights. Landings sit between them, so a run has `flights - 1` landings. Defaults to `2`. */
  flights?: number;
  /** Steps in each flight. Defaults to `5`. */
  stepsPerFlight?: number;
  /** Stair width — the tread's left-right extent. Defaults to `2`. */
  width?: number;
  /** Vertical rise per step. Defaults to `0.3`. */
  riserHeight?: number;
  /** Horizontal run per step. Defaults to `0.5`. */
  treadDepth?: number;
  /** Landing depth along the direction of travel. Defaults to `width` — a square landing. */
  landingSize?: number;
  /**
   * Degrees the run turns at each landing. Defaults to `90`.
   *
   * - `90` / `-90` — a quarter turn. Four of them wrap a stairwell, so the fifth flight climbs
   *   directly above the first. The sign picks which way it winds.
   * - `0` — a straight run, broken by flat landings.
   * - `180` / `-180` — a switchback. The next flight reverses, so it must be displaced sideways by a
   *   full stair width or it would climb back through the flight below it. The landing widens to
   *   span both. Two of them stack the run vertically: the third flight sits above the first. The
   *   sign picks which side the run steps to.
   */
  turn?: number;
  /**
   * Gap between the two flights of a switchback — the open well down the middle of the stair.
   * Ignored unless `turn` is ±180. Defaults to `0`, flights shoulder to shoulder.
   */
  well?: number;
  /** Material. Omit to build a flat-shaded standard material from `color`. */
  material?: Material;
  /** Tint when `material` is omitted. Defaults to `#9a9a9a`. */
  color?: ColorRepresentation;
}

/**
 * A staircase of any number of flights, turning at each landing.
 *
 * A flight is the geometry ({@link StaircaseGeometry}); a *staircase* is the assembly. The landing
 * is the whole point of the assembly — it is where the run turns. Chain four quarter-turns and you
 * have wrapped a stairwell: the fifth flight climbs directly above the first, which is how a
 * stairwell in a tall building actually works.
 *
 * Every flight is the **same geometry, rotated** — never a second flight re-derived by hand in a
 * turned coordinate frame. Everything merges into one geometry, so a twenty-flight tower is still
 * one draw call.
 *
 * Local frame: the first flight starts at the origin, rises +Y, and runs +Z.
 *
 * @example
 * ```ts
 * // An L-shaped staircase: two flights, one landing, a quarter turn.
 * const stairs = createStaircase({ flights: 2, stepsPerFlight: 5 });
 * scene.add(stairs);
 *
 * // A stairwell climbing five storeys, wrapping a square shaft.
 * const tower = createStaircase({ flights: 20, stepsPerFlight: 8, turn: 90 });
 *
 * // A straight run broken by landings, no turn.
 * const long = createStaircase({ flights: 3, turn: 0 });
 * ```
 */
export function createStaircase({
  flights = 2,
  stepsPerFlight = 5,
  width = 2,
  riserHeight = 0.3,
  treadDepth = 0.5,
  landingSize = width,
  turn = 90,
  well = 0,
  material,
  color = "#9a9a9a",
}: StaircaseOptions = {}): Mesh {
  const flightCount = Math.max(1, Math.round(flights));
  const steps = Math.max(1, Math.round(stepsPerFlight));

  const flightRise = steps * riserHeight;
  const turnRadians = MathUtils.degToRad(turn);

  // A flight into a landing stops at its last riser: the landing IS that flight's top tread, so the
  // flight runs one tread shorter. The final flight has no landing above it and keeps its own.
  const runToLanding = (steps - 1) * treadDepth;
  const runToTop = steps * treadDepth;

  // A reversing flight would climb straight back through the one below it, so a switchback has to
  // step sideways by a full stair width. A quarter turn needs no such shift: its new direction is
  // perpendicular, so the landing can simply pivot about its own center.
  const isSwitchback = Math.abs(turn) === 180;
  const shift = isSwitchback ? (Math.sign(turn) || 1) * (width + well) : 0;
  const landingWidth = isSwitchback ? Math.abs(shift) + width : width;

  const parts: BufferGeometry[] = [];

  // Walk the run: a cursor at the foot of the current flight, and the direction it faces.
  let x = 0;
  let y = 0;
  let z = 0;
  let yaw = 0;

  for (let flight = 0; flight < flightCount; flight++) {
    const isLast = flight === flightCount - 1;

    const steps3D = new StaircaseGeometry({
      width,
      riserHeight,
      treadDepth,
      stepCount: steps,
      topTread: isLast,
    });
    steps3D.rotateY(yaw);
    steps3D.translate(x, y, z);
    parts.push(steps3D);

    // Climb it: forward along this flight's own axis, and up.
    const run = isLast ? runToTop : runToLanding;
    x += Math.sin(yaw) * run;
    z += Math.cos(yaw) * run;
    y += flightRise;

    if (isLast) break;

    // Unit vectors in this flight's own frame: where "forward" and "sideways" point in the world.
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const sx = Math.cos(yaw);
    const sz = -Math.sin(yaw);

    if (isSwitchback) {
      // The landing sits beyond the flight it tops, spanning sideways to cover the next one too.
      const landing = new PlaneGeometry(landingWidth, landingSize);
      landing.rotateX(-Math.PI / 2);
      landing.rotateY(yaw);
      landing.translate(
        x + fx * (landingSize / 2) + sx * (shift / 2),
        y,
        z + fz * (landingSize / 2) + sz * (shift / 2),
      );
      parts.push(landing);

      // Step SIDEWAYS only. The next flight begins where this one ended — not beyond the landing —
      // so the two run parallel, front to back, the way a real dog-leg does. The landing's depth is
      // turning room, not travel: stepping forward through it would offset the flights and send the
      // next one climbing back over the platform it just left.
      x += sx * shift;
      z += sz * shift;
      yaw += turnRadians;
    } else {
      // Step to the landing's center, turn there, then step out to its far edge — which is where the
      // next flight begins. A square landing makes those half-steps equal, so the run pivots about
      // the landing's center exactly as a real quarter turn does.
      const half = landingSize / 2;

      x += fx * half;
      z += fz * half;

      const landing = new PlaneGeometry(landingWidth, landingSize);
      landing.rotateX(-Math.PI / 2); // stand it flat: +Y up, spanning X and Z
      landing.rotateY(yaw);
      landing.translate(x, y, z);
      parts.push(landing);

      yaw += turnRadians;

      x += Math.sin(yaw) * half;
      z += Math.cos(yaw) * half;
    }
  }

  const geometry = mergeGeometries(parts, false) as BufferGeometry;
  parts.forEach((part) => part.dispose());

  const stone =
    material ?? new MeshStandardMaterial({ color: new Color(color), flatShading: true, roughness: 0.9 });

  const stairs = new Mesh(geometry, stone);
  stairs.userData.totalHeight = flightCount * flightRise;
  stairs.userData.flights = flightCount;

  return stairs;
}

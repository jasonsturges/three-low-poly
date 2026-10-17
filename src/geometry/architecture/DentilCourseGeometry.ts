import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import type { MoldingFacing } from "./MoldingGeometry";

/** Where a run's slack goes: into its gaps alone, or into teeth and gaps together. */
export type DentilSlack = "gaps" | "stretch";

/** A tooth marked as a seat — where a corbel or modillion would stand. */
export interface DentilSeat {
  /** The center of the tooth's foot, halfway out through the projection. */
  position: Vector3;
  /** Along the run at the tooth. */
  tangent: Vector3;
  /** Out from the wall at the tooth. */
  outward: Vector3;
}

export interface DentilCourseGeometryOptions {
  /**
   * The WALL LINE the course hangs from — the top back edge of the strip, level. One point per vertex, in
   * order; a curve is just many points. Turns sharper than `cornerAngle` are corners.
   */
  points: Vector3[];
  /** Close the course back onto its first point. Defaults to `false`. */
  closed?: boolean;
  /**
   * Which side of the line the course stands on. Defaults to `"inward"`, as {@link MoldingGeometry} —
   * pass `"outward"` for a cornice round a building. Honored regardless of how the points are wound; a
   * perfectly straight run has no inside, so reverse its points if it lands on the wrong face.
   */
  facing?: MoldingFacing;
  /** Each tooth's width — a target; see `slack`. Defaults to `0.05`. */
  width?: number;
  /** The gap between teeth, the interdentil — a target; see `slack`. Defaults to `0.035`. */
  gap?: number;
  /** The teeth, below the band. Defaults to `0.06`. */
  height?: number;
  /** The continuous strip the teeth hang from. Defaults to `0.015`. */
  band?: number;
  /** How far the course stands out from the wall. Defaults to `0.045`. */
  projection?: number;
  /**
   * Where each run's slack goes. `"gaps"` keeps every tooth exactly `width` and spreads the slack over
   * the gaps; `"stretch"` scales teeth and gaps together, keeping their proportion. Either way it is
   * spread evenly through the run, never left at a corner. Defaults to `"gaps"`.
   */
  slack?: DentilSlack;
  /** A turn sharper than this, in radians, is a corner; gentler turns are a curve. Defaults to 20°. */
  cornerAngle?: number;
  /**
   * Mark every Nth tooth as a seat, the corner teeth counting as stations, so each run holds whole groups
   * of N and the seats fall symmetrically on every run. Read them from {@link DentilCourseGeometry.seats}.
   * `0` marks none and frees the count. Defaults to `0`.
   */
  seatEvery?: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * A dentil course — a row of teeth cut from one strip of stock, run along a wall line.
 *
 * Built the way a joiner sets it out: on the strip's **outer face**, with a full tooth `width` wide on
 * each face at every corner, mitered through it. Between two corners a run holds a whole number of teeth,
 * and its slack is spread evenly through the run — so the gaps beside a corner match the gaps in the
 * field, and the corner never absorbs the difference. Equal pitch from one run to the next is not
 * promised; runs of different lengths come out slightly different. A right corner is.
 *
 * Setting out on the wall line instead is the classic mistake: past an outside corner the outer face runs
 * on by `projection · tan(turn / 2)`, and that whole difference lands in the corner tooth — a chunk nearly
 * twice the width of its neighbors at a square corner, a sliver at an inside one.
 *
 * Each run is one solid: a comb in elevation — the band with its teeth — extruded through the projection.
 * A point on the outer face steps back to the wall square to its own segment; a point at a vertex steps
 * back along that vertex's miter. So corners close exactly, faces between stay square to the wall, and
 * round a curve the teeth fan radially. Runs share their miter faces, so a closed course is watertight.
 *
 * A closed line with no corner at all (a circle) starts at a seam on its first point, where one tooth is
 * split into two halves that close into one.
 *
 * **Short runs have a floor.** Every run holds its two corner teeth; between two inside corners the outer
 * face is shorter still. A run too short for two teeth simply does not fit, as on a real wall. Proportions
 * that cannot be built — a projection far deeper than the run allows — fold the solid inside out; nothing
 * is clamped.
 *
 * No origin of its own: it is drawn where its `points` are, hanging DOWN from them. Material groups:
 * none — pass one material.
 *
 * @example
 * ```ts
 * const eaves = [
 *   new Vector3(-2, 3, -1.5),
 *   new Vector3(2, 3, -1.5),
 *   new Vector3(2, 3, 1.5),
 *   new Vector3(-2, 3, 1.5),
 * ];
 *
 * const dentils = new Mesh(new DentilCourseGeometry({ points: eaves, closed: true, facing: "outward" }), stone);
 * ```
 */
export class DentilCourseGeometry extends BufferGeometry {
  /** The seats marked by `seatEvery`, in order along the line. Empty when `seatEvery` is `0`. */
  readonly seats: DentilSeat[] = [];

  constructor({
    points,
    closed = false,
    facing = "inward",
    width = 0.05,
    gap = 0.035,
    height = 0.06,
    band = 0.015,
    projection = 0.045,
    slack = "gaps",
    cornerAngle = (20 * Math.PI) / 180,
    seatEvery = 0,
  }: DentilCourseGeometryOptions) {
    super();

    if (points.length < 2) throw new Error("DentilCourseGeometry: a course needs at least two points.");

    // The course stands on the side `UP × direction` points to. That is OUTSIDE when the plan winds
    // positive in (x, z) — so measure the winding rather than ask the caller to remember it.
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      area += a.x * b.z - b.x * a.z;
    }
    const ordered = Math.abs(area) > 1e-9 && area > 0 === (facing === "inward") ? [...points].reverse() : points;

    const count = ordered.length;
    const segments = closed ? count : count - 1;
    const dir = Array.from({ length: segments }, (_, i) =>
      ordered[(i + 1) % count]!.clone().sub(ordered[i]!).setY(0).normalize(),
    );
    const out = dir.map((d) => UP.clone().cross(d));
    // The miter: `W + z · m` lies on both neighboring faces' offset lines. An open line's end is cut square.
    const miter = ordered.map((_, v) => {
      const before = closed ? out[(v + segments - 1) % segments] : out[v - 1];
      const after = closed ? out[v % segments] : out[v];
      if (!before) return after!.clone();
      if (!after) return before.clone();
      return before.clone().add(after).divideScalar(1 + before.dot(after));
    });
    const isCorner = ordered.map((_, v) => {
      if (!closed && (v === 0 || v === count - 1)) return true;
      return dir[(v + segments - 1) % segments]!.dot(dir[v % segments]!) < Math.cos(cornerAngle);
    });
    const corners = ordered.map((_, v) => v).filter((v) => isCorner[v]);
    const seam = corners.length === 0;
    const starts = seam ? [0] : closed ? corners : corners.slice(0, -1);

    const P = projection;
    const H = band + height;
    const positions: number[] = [];
    const push = (a: Vector3, b: Vector3, c: Vector3) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const quad = (q: Vector3[], outward: Vector3) => {
      const n = new Vector3();
      for (let k = 0; k < 4; k++) n.add(q[k]!.clone().cross(q[(k + 1) % 4]!));
      const [a, b, c, d] = n.dot(outward) < 0 ? [q[0]!, q[3]!, q[2]!, q[1]!] : (q as [Vector3, Vector3, Vector3, Vector3]);
      push(a, b, c);
      push(a, c, d);
    };

    starts.forEach((first, r) => {
      // The run's vertices, corner to corner — or all the way round to the seam.
      const verts = [first];
      for (let v = (first + 1) % count; ; v = (v + 1) % count) {
        verts.push(v);
        if (isCorner[v] || (seam && v === first)) break;
      }
      const last = verts.length - 1;
      const segOf = (k: number) => verts[k]! % segments;
      // Set out flat along the outer face: `station` is each vertex's distance along it.
      const outer = verts.map((v) => ordered[v]!.clone().addScaledVector(miter[v]!, P));
      const station = [0];
      for (let k = 1; k <= last; k++) station.push(station[k - 1]! + outer[k]!.distanceTo(outer[k - 1]!));
      const length = station[last]!;

      const segmentAt = (u: number) => {
        let k = 0;
        while (k < last - 1 && u > station[k + 1]! - 1e-9) k++;
        return k;
      };
      // (u along the outer face, y up from the line, z out from the wall) → world.
      const place = (u: number, y: number, z: number) => {
        for (let k = 0; k <= last; k++) {
          if (Math.abs(u - station[k]!) < 1e-9) {
            return ordered[verts[k]!]!.clone().addScaledVector(miter[verts[k]!]!, z).addScaledVector(UP, y);
          }
        }
        const k = segmentAt(u);
        const s = segOf(k);
        return outer[k]!.clone()
          .addScaledVector(dir[s]!, u - station[k]!)
          .addScaledVector(out[s]!, z - P)
          .addScaledVector(UP, y);
      };

      // A full corner tooth at each end; a seam's tooth is split, half at each end.
      const corner = seam ? width / 2 : width;
      const firstEdge = corner;
      const lastEdge = length - corner;
      const clear = lastEdge - firstEdge;

      const teeth =
        seatEvery > 0
          ? seatEvery * Math.max(1, Math.round((clear + gap + width) / (seatEvery * (width + gap)))) - 1
          : Math.max(0, Math.round((clear - gap) / (width + gap)));
      let tooth = width;
      let space = (clear - teeth * tooth) / (teeth + 1);
      if (slack === "stretch") {
        const f = clear / (teeth * width + (teeth + 1) * gap);
        tooth = width * f;
        space = gap * f;
      }
      const field: [number, number][] = [];
      for (let k = 0, s = firstEdge + space; k < teeth; k++, s += tooth + space) field.push([s, s + tooth]);
      const all: [number, number][] = [[0, firstEdge], ...field, [lastEdge, length]];

      if (seatEvery > 0) {
        const seat = (u: number) => {
          const s = segOf(segmentAt(u));
          this.seats.push({ position: place(u, -H, P / 2), tangent: dir[s]!.clone(), outward: out[s]!.clone() });
        };
        // The near corner tooth is station 0; the far one belongs to the next run, or ends an open line.
        [seam ? 0 : firstEdge / 2, ...field.map(([a, b]) => (a + b) / 2)].forEach((u, k) => k % seatEvery === 0 && seat(u));
        if (!closed && r === starts.length - 1) seat((lastEdge + length) / 2);
      }

      // Every place the elevation needs a vertex: the run's ends, each bend, each tooth edge.
      const breaks = [...station, ...all.flat()].sort((a, b) => a - b).filter((u, k, a) => k === 0 || u - a[k - 1]! > 1e-9);
      const inTooth = (a: number, b: number) => all.some(([l, h]) => a >= l - 1e-9 && b <= h + 1e-9);

      // Front and back: the band along the whole run, each tooth below it, split at every break.
      for (let k = 0; k < breaks.length - 1; k++) {
        const a = breaks[k]!;
        const b = breaks[k + 1]!;
        const n = out[segOf(segmentAt((a + b) / 2))]!;
        const rows: [number, number][] = [[-band, 0]];
        if (inTooth(a, b)) rows.push([-H, -band]);
        for (const [lo, hi] of rows) {
          quad([place(a, lo, P), place(b, lo, P), place(b, hi, P), place(a, hi, P)], n);
          quad([place(a, lo, 0), place(b, lo, 0), place(b, hi, 0), place(a, hi, 0)], n.clone().negate());
        }
      }

      // The outline in elevation — back along the top, down the near end, along the foot of the teeth and
      // gaps, up the far end — each edge a side wall through the projection.
      const outline: [number, number][] = [...breaks].reverse().map((u) => [u, 0] as [number, number]);
      outline.push([0, -band], [0, -H]);
      let y = -H;
      for (let k = 0; k < breaks.length - 1; k++) {
        const level = inTooth(breaks[k]!, breaks[k + 1]!) ? -H : -band;
        if (level !== y) outline.push([breaks[k]!, (y = level)]);
        outline.push([breaks[k + 1]!, y]);
      }
      outline.push([length, -band]);

      const openNear = !closed && r === 0;
      const openFar = !closed && r === starts.length - 1;
      for (let k = 0; k < outline.length; k++) {
        const [pu, py] = outline[k]!;
        const [qu, qy] = outline[(k + 1) % outline.length]!;
        // An end edge on a corner lies on the miter, shared with the next run: drawn only at an open end.
        if (pu === 0 && qu === 0 && !openNear) continue;
        if (pu === length && qu === length && !openFar) continue;
        const d = dir[segOf(segmentAt((pu + qu) / 2))]!;
        const outward = d.clone().multiplyScalar(qy - py).addScaledVector(UP, -(qu - pu));
        quad([place(pu, py, 0), place(qu, qy, 0), place(qu, qy, P), place(pu, py, P)], outward);
      }
    });

    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.computeVertexNormals();
    this.computeBoundingSphere();
  }
}

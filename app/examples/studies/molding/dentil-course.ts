import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Dentil Course",
  description:
    "STUDY — a dentil course cut like real stock: one toothed strip run along a wall line, a full tooth " +
    "mitered through every corner, and each run's slack spread evenly over its own gaps — never left at a " +
    "corner. Set out on the strip's OUTER face, the way a joiner measures. Ported from GeoNodes Lab.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  DENTIL       a tooth. INTERDENTIL is the gap. Width and gap are TARGETS — what you design with.
//  BAND         the continuous strip the teeth hang from. Teeth plus band are ONE piece of stock: a comb in
//               elevation, extruded to the projection. Nothing is assembled from loose blocks.
//  CORNER TOOTH a full tooth on each face at every corner, mitered through it. The run is set out FROM it.
//  OUTER FACE   where the strip is set out. Past an outside corner the outer face runs on by
//               `projection · tan(turn / 2)`; at an inside corner it stops short. Setting out on the WALL LINE
//               instead puts that whole difference into the corner tooth — the old oversized corner block.
//  SLACK        what is left of a run after its whole number of teeth. Spread over every gap in the run
//               (or over teeth and gaps together); the corner never absorbs it.
//  SEAT         every Nth tooth, the corner teeth counting as stations — where a corbel would stand. With
//               seats on, each run holds whole groups of N, so they fall symmetrically on every run.

const UP = new Vector3(0, 1, 0);

type Slack = "gaps" | "stretch";
type SetOut = "outer face" | "wall line";

interface DentilOptions {
  width: number;
  gap: number;
  height: number;
  band: number;
  projection: number;
  slack: Slack;
  setOut: SetOut;
  /** Seat every Nth tooth; 0 frees the count. */
  every: number;
  /** A turn sharper than this is a corner, in radians. Gentler turns are a curve and get an even run. */
  cornerAngle: number;
}

interface Run {
  teeth: number;
  /** Actual field tooth width and gap. */
  tooth: number;
  gap: number;
  /** The gaps either side of the field — the ones beside the corner teeth. */
  cornerGaps: [number, number];
  /** Corner tooth widths on the outer face, at each end. */
  cornerTeeth: [number, number];
}

interface CourseResult {
  geometry: BufferGeometry;
  runs: Run[];
  corners: number;
  /** Seat positions, at the tooth's center on the outer face, at its foot. */
  seats: Vector3[];
  openEdges: number;
  volume: number;
}

/**
 * The course, one closed solid per RUN — the stretch between two corners, which may bend at gentle vertices.
 *
 * A run is set out flat, as stations `u` along its outer face, then placed. A point at station `u`, depth `z`
 * (0 at the wall, `projection` at the face) sits on the outer face and steps back square to the segment it
 * lies in; a point exactly at a vertex steps back along that vertex's MITER instead. That one rule makes the
 * corner ends lean onto the miter, leaves every face between square to the wall, and fans the teeth radially
 * round a curve — the strip bent onto the path, not re-cut for it.
 */
function dentilCourse(points: Vector3[], closed: boolean, o: DentilOptions): CourseResult {
  const count = points.length;
  const segments = closed ? count : count - 1;
  const dir = Array.from({ length: segments }, (_, i) => points[(i + 1) % count]!.clone().sub(points[i]!).normalize());
  // Outward is `UP × direction`; the plans are wound so that faces out.
  const out = dir.map((d) => UP.clone().cross(d));
  // The miter: `W + z · m` lies on both neighboring faces' offset lines. An open path's end is cut square.
  const miter = points.map((_, v) => {
    const before = closed ? out[(v + segments - 1) % segments] : out[v - 1];
    const after = closed ? out[v % segments] : out[v];
    if (!before) return after!.clone();
    if (!after) return before.clone();
    return before.clone().add(after).divideScalar(1 + before.dot(after));
  });
  const isCorner = points.map((_, v) => {
    if (!closed && (v === 0 || v === count - 1)) return true;
    return dir[(v + segments - 1) % segments]!.dot(dir[v % segments]!) < Math.cos(o.cornerAngle);
  });
  const corners = points.map((_, v) => v).filter((v) => isCorner[v]);
  // A closed path with no corner at all (a circle) still needs a start: a SEAM at its first vertex, where a
  // tooth is split in two halves that close into one.
  const seam = corners.length === 0;
  const starts = seam ? [0] : closed ? corners : corners.slice(0, -1);

  const P = o.projection;
  const H = o.band + o.height;
  const positions: number[] = [];
  const runs: Run[] = [];
  const seats: Vector3[] = [];

  const push = (a: Vector3, b: Vector3, c: Vector3) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const quad = (q: Vector3[], outward: Vector3) => {
    const n = new Vector3();
    for (let k = 0; k < 4; k++) n.add(q[k]!.clone().cross(q[(k + 1) % 4]!));
    const [a, b, c, d] = n.dot(outward) < 0 ? [q[0]!, q[3]!, q[2]!, q[1]!] : (q as [Vector3, Vector3, Vector3, Vector3]);
    push(a, b, c);
    push(a, c, d);
  };

  starts.forEach((first, r) => {
    // The run's vertices, corner to corner (or round to the seam).
    const verts = [first];
    for (let v = (first + 1) % count; ; v = (v + 1) % count) {
      verts.push(v);
      if (isCorner[v] || (seam && v === first)) break;
    }
    const segOf = (k: number) => verts[k]! % segments; // the segment leaving run vertex k
    const outer = verts.map((v) => points[v]!.clone().addScaledVector(miter[v]!, P));
    const station = [0];
    for (let k = 1; k < verts.length; k++) station.push(station[k - 1]! + outer[k]!.distanceTo(outer[k - 1]!));
    const Lo = station[station.length - 1]!;
    const last = verts.length - 1;

    // Where (u, y, z) lands. `k` is the run segment `u` lies in.
    const segmentAt = (u: number) => {
      let k = 0;
      while (k < last - 1 && u > station[k + 1]! - 1e-9) k++;
      return k;
    };
    const place = (u: number, y: number, z: number) => {
      for (let k = 0; k <= last; k++) {
        if (Math.abs(u - station[k]!) < 1e-9) {
          return points[verts[k]!]!.clone().addScaledVector(miter[verts[k]!]!, z).addScaledVector(UP, y);
        }
      }
      const k = segmentAt(u);
      const s = segOf(k);
      return outer[k]!.clone()
        .addScaledVector(dir[s]!, u - station[k]!)
        .addScaledVector(out[s]!, z - P)
        .addScaledVector(UP, y);
    };

    // The set-out line: the outer face (a joiner's), or the wall line (the old way, which hands the corner
    // tooth the whole `projection · tan(turn/2)` difference). A seam's tooth is split, half at each end.
    const corner = seam ? o.width / 2 : o.width;
    const lean0 = o.setOut === "wall line" ? P * miter[verts[0]!]!.dot(dir[segOf(0)]!) : 0;
    const lean1 = o.setOut === "wall line" ? P * miter[verts[last]!]!.dot(dir[segOf(last - 1)]!) : 0;
    const firstEdge = corner - lean0;
    const lastEdge = Lo - corner - lean1;
    const clear = lastEdge - firstEdge;

    // A whole number of teeth between the corner teeth; with seats, whole groups of `every` stations.
    let teeth: number;
    if (o.every > 0) {
      const groups = Math.max(1, Math.round((clear + o.gap + o.width) / (o.every * (o.width + o.gap))));
      teeth = o.every * groups - 1;
    } else {
      teeth = Math.max(0, Math.round((clear - o.gap) / (o.width + o.gap)));
    }
    // The slack goes into the run, spread evenly — never left at a corner.
    let tooth = o.width;
    let gap = (clear - teeth * tooth) / (teeth + 1);
    if (o.slack === "stretch") {
      const f = clear / (teeth * o.width + (teeth + 1) * o.gap);
      tooth = o.width * f;
      gap = o.gap * f;
    }
    const field: [number, number][] = [];
    for (let k = 0, s = firstEdge + gap; k < teeth; k++, s += tooth + gap) field.push([s, s + tooth]);
    const all: [number, number][] = [[0, firstEdge], ...field, [lastEdge, Lo]];

    runs.push({
      teeth,
      tooth,
      gap,
      cornerGaps: [(field[0]?.[0] ?? lastEdge) - firstEdge, lastEdge - (field[field.length - 1]?.[1] ?? firstEdge)],
      cornerTeeth: seam ? [firstEdge * 2, (Lo - lastEdge) * 2] : [firstEdge, Lo - lastEdge],
    });

    // Seats: the near corner tooth is station 0; the far one belongs to the next run (or ends an open path).
    if (o.every > 0) {
      const centers = [seam ? 0 : firstEdge / 2, ...field.map(([a, b]) => (a + b) / 2)];
      centers.forEach((c, k) => k % o.every === 0 && seats.push(place(c, -H, P / 2)));
      if (!closed && r === starts.length - 1) seats.push(place((lastEdge + Lo) / 2, -H, P / 2));
    }

    // Every place the elevation needs a vertex: the run's ends, each bend, each tooth edge.
    const breaks = [...station, ...all.flat()].sort((a, b) => a - b).filter((u, k, a) => k === 0 || u - a[k - 1]! > 1e-9);
    const inTooth = (a: number, b: number) => all.some(([l, h]) => a >= l - 1e-9 && b <= h + 1e-9);

    // Faces: the band in front of and behind the whole run, each tooth below it, split at every break.
    for (let k = 0; k < breaks.length - 1; k++) {
      const a = breaks[k]!;
      const b = breaks[k + 1]!;
      const n = out[segOf(segmentAt((a + b) / 2))]!;
      const rows: [number, number][] = [[-o.band, 0]];
      if (inTooth(a, b)) rows.push([-H, -o.band]);
      for (const [lo, hi] of rows) {
        quad([place(a, lo, P), place(b, lo, P), place(b, hi, P), place(a, hi, P)], n);
        quad([place(a, lo, 0), place(b, lo, 0), place(b, hi, 0), place(a, hi, 0)], n.clone().negate());
      }
    }

    // The outline in elevation, round the run: back along the top, down the near end, along the foot of the
    // teeth and gaps, up the far end. Each edge becomes a side wall through the projection.
    const outline: [number, number][] = [...breaks].reverse().map((u) => [u, 0] as [number, number]);
    outline.push([0, -o.band]);
    let y = -H;
    outline.push([0, y]);
    for (let k = 0; k < breaks.length - 1; k++) {
      const level = inTooth(breaks[k]!, breaks[k + 1]!) ? -H : -o.band;
      if (level !== y) outline.push([breaks[k]!, (y = level)]);
      outline.push([breaks[k + 1]!, y]);
    }
    if (y !== -H) outline.push([Lo, -H]);
    outline.push([Lo, -o.band]);

    const openNear = !closed && r === 0;
    const openFar = !closed && r === starts.length - 1;
    for (let k = 0; k < outline.length; k++) {
      const [pu, py] = outline[k]!;
      const [qu, qy] = outline[(k + 1) % outline.length]!;
      // The end edges lie on a corner's miter, shared with the next run — drawn only at an open end.
      const atNear = pu === 0 && qu === 0 && py !== qy;
      const atFar = pu === Lo && qu === Lo && py !== qy;
      if ((atNear && !openNear) || (atFar && !openFar)) continue;
      const d = dir[segOf(segmentAt((pu + qu) / 2))]!;
      const outward = d.clone().multiplyScalar(qy - py).addScaledVector(UP, -(qu - pu));
      quad([place(pu, py, 0), place(qu, qy, 0), place(qu, qy, P), place(pu, py, P)], outward);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return {
    geometry,
    runs,
    corners: seam ? 0 : corners.length,
    seats,
    openEdges: openEdges(positions),
    volume: signedVolume(positions),
  };
}

/** Edges of a triangle soup not shared by exactly two triangles, positions welded at 1e-5. */
const openEdges = (array: number[]): number => {
  const ids = new Map<string, number>();
  const id = (i: number) => {
    const k = `${Math.round(array[i]! * 1e5)},${Math.round(array[i + 1]! * 1e5)},${Math.round(array[i + 2]! * 1e5)}`;
    if (!ids.has(k)) ids.set(k, ids.size);
    return ids.get(k)!;
  };
  const uses = new Map<string, number>();
  for (let t = 0; t < array.length; t += 9) {
    const v = [id(t), id(t + 3), id(t + 6)];
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue;
    for (let e = 0; e < 3; e++) {
      const a = v[e]!;
      const b = v[(e + 1) % 3]!;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      uses.set(k, (uses.get(k) ?? 0) + 1);
    }
  }
  return [...uses.values()].filter((c) => c !== 2).length;
};

const signedVolume = (p: number[]) => {
  let v = 0;
  for (let i = 0; i < p.length; i += 9) {
    v += p[i]! * (p[i + 4]! * p[i + 8]! - p[i + 5]! * p[i + 7]!);
    v -= p[i + 1]! * (p[i + 3]! * p[i + 8]! - p[i + 5]! * p[i + 6]!);
    v += p[i + 2]! * (p[i + 3]! * p[i + 7]! - p[i + 4]! * p[i + 6]!);
  }
  return v / 6;
};

/** Wall lines in plan (x, z), wound so `UP × direction` faces out. */
const PLANS: Record<string, { points: [number, number][]; closed: boolean }> = {
  square: { points: [[-1, -1], [1, -1], [1, 1], [-1, 1]], closed: true },
  // An inside corner, the way a chimney breast or a returned pier makes one.
  "L-plan": { points: [[-1.2, -1], [1.2, -1], [1.2, 0.2], [0, 0.2], [0, 1], [-1.2, 1]], closed: true },
  hexagon: {
    points: Array.from({ length: 6 }, (_, k) => {
      const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
      return [1.2 * Math.cos(a), 1.2 * Math.sin(a)] as [number, number];
    }),
    closed: true,
  },
  "open L": { points: [[-1.2, -1], [1, -1], [1, 1]], closed: false },
  // A semicircular bay on the front: two inside corners where it leaves the wall, and a curve between them
  // that is NOT a corner — it gets one even run, the teeth fanning round it.
  bay: {
    points: [
      [-1.2, -1],
      ...Array.from({ length: 17 }, (_, k) => {
        const a = Math.PI - (k / 16) * Math.PI;
        return [0.6 * Math.cos(a), -1 - 0.6 * Math.sin(a)] as [number, number];
      }),
      [1.2, -1],
      [1.2, 1],
      [-1.2, 1],
    ],
    closed: true,
  },
  // No corner at all: one run, closed on a seam where a tooth is split into two halves.
  circle: {
    points: Array.from({ length: 48 }, (_, k) => {
      const a = -Math.PI / 2 + (k / 48) * Math.PI * 2;
      return [1.2 * Math.cos(a), 1.2 * Math.sin(a)] as [number, number];
    }),
    closed: true,
  },
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x11141a,
    cameraPosition: [2.6, 1.2, -3.4],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.6);
  key.position.set(3, 4, -5);
  const fill = new DirectionalLight(0x8ea8cc, 0.5);
  fill.position.set(-4, -1, 2);
  scene.add(key, fill);

  const stock = new MeshStandardMaterial({ color: 0xece6da, roughness: 0.55, flatShading: true });
  const seatMaterial = new MeshStandardMaterial({ color: 0xc0583a, roughness: 0.6 });
  const wallLine = new LineBasicMaterial({ color: 0x5f6b7a });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    plan: "square",
    size: 1,
    width: 0.05,
    gap: 0.035,
    height: 0.06,
    band: 0.015,
    projection: 0.045,
    slack: "gaps" as Slack,
    setOut: "outer face" as SetOut,
    every: 0,
    cornerAngle: 20,
    wireframe: false,

    teeth: "",
    field: "",
    corners: "",
    closure: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments || child instanceof LineLoop) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const plan = PLANS[params.plan]!;
    const points = plan.points.map(([x, z]) => new Vector3(x * params.size, 0, z * params.size));
    const result = dentilCourse(points, plan.closed, {
      width: params.width,
      gap: params.gap,
      height: params.height,
      band: params.band,
      projection: params.projection,
      slack: params.slack,
      setOut: params.setOut,
      every: params.every,
      cornerAngle: (params.cornerAngle * Math.PI) / 180,
    });
    stage.add(new Mesh(result.geometry, stock));

    const line = new BufferGeometry().setFromPoints(points);
    stage.add(plan.closed ? new LineLoop(line, wallLine) : new LineSegments(line.setIndex(points.slice(1).flatMap((_, k) => [k, k + 1])), wallLine));

    for (const seat of result.seats) {
      const marker = new Mesh(new BoxGeometry(0.02, 0.04, 0.02), seatMaterial);
      marker.position.copy(seat).addScaledVector(UP, -0.03);
      stage.add(marker);
    }

    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(result.geometry), wire));

    const fmt = (v: number) => (v * 1000).toFixed(1);
    const runs = result.runs;
    const gaps = runs.map((r) => r.gap);
    const teeth = runs.map((r) => r.tooth);
    const cornerGaps = runs.flatMap((r) => r.cornerGaps);
    const cornerTeeth = runs.flatMap((r) => r.cornerTeeth);
    const worst = Math.max(...runs.flatMap((r) => r.cornerGaps.map((g) => Math.abs(g - r.gap))));
    params.teeth = `${runs.reduce((sum, r) => sum + r.teeth, 0)} field teeth · ${runs.length} runs · ${result.corners || "no"} corners`;
    params.field = `tooth ${fmt(Math.min(...teeth))}–${fmt(Math.max(...teeth))} · gap ${fmt(Math.min(...gaps))}–${fmt(Math.max(...gaps))} mm`;
    params.corners =
      `tooth ${fmt(Math.min(...cornerTeeth))}–${fmt(Math.max(...cornerTeeth))} on face · ` +
      (worst < 1e-9 ? "corner gaps = field gaps" : `corner gaps ${fmt(Math.min(...cornerGaps))}–${fmt(Math.max(...cornerGaps))} — OFF`);
    params.closure =
      result.openEdges === 0 ? `closed solid · volume ${result.volume > 0 ? "+" : "−"}` : `${result.openEdges} open edges`;
  };
  rebuild();
  // FRAME ONCE, NEVER ON REBUILD — re-framing on a dial change throws away the viewer's zoom and pan.
  frameObject(handle, stage, { fit: 1.3 });

  const gui = new GUI();
  gui.title("Dentil Course");

  const dentils = gui.addFolder("Dentils");
  dentils.add(params, "width", 0.01, 0.2, 0.001).name("Width").onChange(rebuild);
  dentils.add(params, "gap", 0.005, 0.2, 0.001).name("Gap").onChange(rebuild);
  dentils.add(params, "height", 0.01, 0.2, 0.001).name("Height").onChange(rebuild);
  dentils.add(params, "band", 0.003, 0.08, 0.001).name("Band").onChange(rebuild);
  dentils.add(params, "projection", 0.005, 0.2, 0.001).name("Projection").onChange(rebuild);
  dentils.open();

  const setOut = gui.addFolder("Set Out");
  setOut.add(params, "setOut", ["outer face", "wall line"]).name("From").onChange(rebuild);
  // Where a run's slack goes: into its gaps alone, or into teeth and gaps together. Never into a corner.
  setOut.add(params, "slack", ["gaps", "stretch"]).name("Slack Into").onChange(rebuild);
  setOut.add(params, "every", 0, 12, 1).name("Seat Every").onChange(rebuild);
  // A turn sharper than this is a corner and gets a corner tooth; gentler turns are a curve.
  setOut.add(params, "cornerAngle", 1, 90, 1).name("Corner Angle°").onChange(rebuild);
  setOut.open();

  const plan = gui.addFolder("Plan");
  plan.add(params, "plan", Object.keys(PLANS)).name("Plan").onChange(rebuild);
  plan.add(params, "size", 0.3, 3, 0.01).name("Size").onChange(rebuild);
  plan.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "teeth").name("Teeth").listen().disable();
  readout.add(params, "field").name("Field").listen().disable();
  readout.add(params, "corners").name("Corners").listen().disable();
  readout.add(params, "closure").name("Closure").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stock.dispose();
    seatMaterial.dispose();
    wallLine.dispose();
    wire.dispose();
    dispose();
  };
}

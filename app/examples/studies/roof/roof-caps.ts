import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Roof Caps",
  description:
    "STUDY — hip and ridge caps with THICKNESS, on any roof. Each roof vertex is offset to where its faces' " +
    "planes, each moved out by the thickness, meet; each face sets out its cap band as an inset polygon in " +
    "its own plane. Every cap piece shares its folds and miters with its neighbors exactly, so the caps " +
    "close at every apex and junction with nothing mitered. Ported from GeoNodes Lab's roof covering.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  SHELL       the slab between the roof and its exact offset. Never built whole: each face's share of it is
//              cut down to its cap band directly, so no boolean is needed.
//  OFFSET      per VERTEX, not per edge or face. A vertex moves to the point where all its faces' planes,
//              each moved out by the thickness, meet. ridge-and-hips' RELIEF lifted per face, and the folds
//              split; lifting per edge along its bisector splays. Per vertex, every offset face stays
//              parallel to its own at full thickness, so the offset roof keeps its folds on its own edges.
//  BAND        a face's cap region: its capped edges inset by half the cap width (each corner a 2×2 line
//              solve), exactly ridge-and-hips' WING, now extruded through the shell.
//  END         where a cap meets the roof's boundary. LEVEL: an eave vertex offsets horizontally, so a hip
//              cap runs down past the fascia and ends flush at the eave's height. PLUMB: it keeps to the
//              eave's vertical plane and ends square at the fascia. Rakes are always plumb.

const UP = new Vector3(0, 1, 0);

interface RoofMesh {
  vertices: Vector3[];
  /** Planar convex faces, counter-clockwise from outside. */
  faces: number[][];
}

interface CapOptions {
  width: number;
  thickness: number;
  ends: "level" | "plumb";
}

interface CapResult {
  caps: BufferGeometry;
  roofing: BufferGeometry;
  /** Capped edges. */
  capped: number;
  /** Worst departure of an offset face from its exact thickness. */
  planeError: number;
  /** Edges used by other than exactly two triangles: 0 is a closed solid. */
  openEdges: number;
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const newellNormal = (points: Vector3[]): Vector3 => {
  const n = new Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  return n.normalize();
};

/** Symmetric 3×3 solve, `A` row-major. */
const solve3 = (A: number[], b: number[]): Vector3 => {
  const [a, b1, c, d, e, f, g, h, i] = A as [number, number, number, number, number, number, number, number, number];
  const det = a * (e * i - f * h) - b1 * (d * i - f * g) + c * (d * h - e * g);
  const x = (b[0]! * (e * i - f * h) - b1 * (b[1]! * i - f * b[2]!) + c * (b[1]! * h - e * b[2]!)) / det;
  const y = (a * (b[1]! * i - f * b[2]!) - b[0]! * (d * i - f * g) + c * (d * b[2]! - b[1]! * g)) / det;
  const z = (a * (e * b[2]! - b[1]! * h) - b1 * (d * b[2]! - b[1]! * g) + b[0]! * (d * h - e * g)) / det;
  return new Vector3(x, y, z);
};

/**
 * Per vertex, the offset for unit thickness: least squares over `n · x = 1` for each face at the vertex, plus,
 * on the roof's boundary, a heavily weighted `h · x = 0` per boundary edge so the shell ends square. `ε·I`
 * keeps a two-face vertex (rank 2) solvable — it settles on the bisector.
 */
const vertexOffsets = (roof: RoofMesh, normals: Vector3[], edges: Map<string, number[]>, ends: CapOptions["ends"]) => {
  const A = roof.vertices.map(() => [1e-9, 0, 0, 0, 1e-9, 0, 0, 0, 1e-9]);
  const b = roof.vertices.map(() => [0, 0, 0]);
  const add = (v: number, n: Vector3, weight: number, rhs: number) => {
    const m = A[v]!;
    const c = [n.x, n.y, n.z];
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3; k++) m[r * 3 + k]! += weight * c[r]! * c[k]!;
      b[v]![r]! += weight * c[r]! * rhs;
    }
  };
  roof.faces.forEach((face, f) => face.forEach((v) => add(v, normals[f]!, 1, 1)));
  for (const [key, faces] of edges) {
    if (faces.length !== 1) continue;
    const [p, q] = key.split("|").map(Number) as [number, number];
    const run = roof.vertices[q]!.clone().sub(roof.vertices[p]!).normalize();
    const eave = Math.abs(run.y) < 1e-6;
    const h = ends === "level" && eave ? UP : run.clone().cross(UP).normalize();
    add(p, h, 1e6, 0);
    add(q, h, 1e6, 0);
  }
  return roof.vertices.map((_, v) => solve3(A[v]!, b[v]!));
};

/** Caps on every convex fold of `roof`, plus the roofing left between them. */
function roofCaps(roof: RoofMesh, { width, thickness, ends }: CapOptions): CapResult {
  const P = roof.vertices;
  const normals = roof.faces.map((face) => newellNormal(face.map((v) => P[v]!)));

  const edges = new Map<string, number[]>();
  roof.faces.forEach((face, f) =>
    face.forEach((v, i) => {
      const k = edgeKey(v, face[(i + 1) % face.length]!);
      edges.set(k, [...(edges.get(k) ?? []), f]);
    }),
  );
  // A fold is capped when it is CONVEX: the other face's far vertex lies below this face's plane. A valley
  // would be concave, and wants flashing, not a cap.
  const isCapped = (a: number, b: number) => {
    const faces = edges.get(edgeKey(a, b))!;
    if (faces.length !== 2) return false;
    const [f, g] = faces as [number, number];
    const far = roof.faces[g]!.find((v) => v !== a && v !== b)!;
    return normals[f]!.dot(P[far]!.clone().sub(P[a]!)) < -1e-9;
  };

  const x = vertexOffsets(roof, normals, edges, ends);
  const at = (v: number, d: number) => P[v]!.clone().addScaledVector(x[v]!, d);

  let planeError = 0;
  roof.faces.forEach((face, f) =>
    face.forEach((v) => (planeError = Math.max(planeError, Math.abs(normals[f]!.dot(x[v]!) - 1) * thickness))),
  );

  const caps: number[] = [];
  const roofing: number[] = [];
  const quad = (out: number[], q: Vector3[], outward: Vector3) => {
    const pts = newellNormal(q).dot(outward) < 0 ? [...q].reverse() : q;
    for (const t of [1, 2]) {
      for (const p of [pts[0]!, pts[t]!, pts[t + 1]!]) out.push(p.x, p.y, p.z);
    }
  };

  let capped = 0;
  roof.faces.forEach((face, f) => {
    const count = face.length;
    const n = normals[f]!;
    const o = P[face[0]!]!;
    const u = P[face[1]!]!.clone().sub(o).normalize();
    const w = n.clone().cross(u);
    const to2 = (p: Vector3) => {
      const r = p.clone().sub(o);
      return [r.dot(u), r.dot(w)] as const;
    };
    const from2 = ([a, c]: readonly [number, number], d: number) =>
      o.clone().addScaledVector(u, a).addScaledVector(w, c).addScaledVector(n, d);

    // The face's edges as lines `m · p = c`, `m` the inward normal in the face's own plane.
    type Line = { m: [number, number]; c: number };
    const lineThrough = (a: readonly [number, number], b: readonly [number, number], inset: number): Line => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const m: [number, number] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      return { m, c: m[0] * a[0] + m[1] * a[1] + inset };
    };
    const cross = (l: Line, k: Line): [number, number] => {
      const det = l.m[0] * k.m[1] - k.m[0] * l.m[1];
      return [(l.c * k.m[1] - k.c * l.m[1]) / det, (l.m[0] * k.c - k.m[0] * l.c) / det];
    };

    const cap = face.map((v, i) => isCapped(v, face[(i + 1) % count]!));
    // A capped edge's band edge is fixed in the plane: inset by half the width. A bare edge is the shell's own
    // side at layer `d`, which is where a cap ENDS — level or plumb, whatever the offset solve made of it.
    const edgeLine = (i: number, d: number): Line => {
      const a = face[i]!;
      const b = face[(i + 1) % count]!;
      return cap[i] ? lineThrough(to2(P[a]!), to2(P[b]!), width / 2) : lineThrough(to2(at(a, d)), to2(at(b, d)), 0);
    };
    // The band's inner corner at face vertex `i` — the 2×2 solve that IS the miter.
    const inner = (i: number, d: number) => from2(cross(edgeLine((i + count - 1) % count, d), edgeLine(i, d)), d);
    const inward = (i: number) => {
      const { m } = edgeLine(i, 0);
      return u.clone().multiplyScalar(m[0]).addScaledVector(w, m[1]);
    };

    const interior = face.map((v, i) => (cap[i] || cap[(i + count - 1) % count] ? inner(i, 0) : P[v]!));
    for (let i = 1; i < count - 1; i++) {
      for (const p of [interior[0]!, interior[i]!, interior[i + 1]!]) roofing.push(p.x, p.y, p.z);
    }

    for (let i = 0; i < count; i++) {
      if (!cap[i]) continue;
      capped += 0.5;
      const j = (i + 1) % count;
      const [qa0, qb0, qa1, qb1] = [at(face[i]!, 0), at(face[j]!, 0), at(face[i]!, thickness), at(face[j]!, thickness)];
      const [ia0, ib0, ia1, ib1] = [inner(i, 0), inner(j, 0), inner(i, thickness), inner(j, thickness)];
      quad(caps, [qa1, qb1, ib1, ia1], n);
      quad(caps, [qa0, qb0, ib0, ia0], n.clone().negate());
      quad(caps, [ia0, ib0, ib1, ia1], inward(i));
      // The fold side and the miter sides are shared with the neighboring pieces, so they are never drawn.
      // Only an END, where the next edge is bare, closes the piece.
      if (!cap[(i + count - 1) % count]) quad(caps, [qa0, ia0, ia1, qa1], inward((i + count - 1) % count).negate());
      if (!cap[j]) quad(caps, [qb0, ib0, ib1, qb1], inward(j).negate());
    }
  });

  const toGeometry = (array: number[]) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(array), 3));
    g.computeVertexNormals();
    return g;
  };
  return { caps: toGeometry(caps), roofing: toGeometry(roofing), capped, planeError, openEdges: openEdges(caps) };
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
      const k = edgeKey(v[e]!, v[(e + 1) % 3]!);
      uses.set(k, (uses.get(k) ?? 0) + 1);
    }
  }
  return [...uses.values()].filter((c) => c !== 2).length;
};

/** The ridge family on a rectangle: 0 a pyramid, `width - depth` the equal-pitch hip, full length a gable. */
const hipRoof = (halfWidth: number, halfDepth: number, y: number, rise: number, ridge: number): RoofMesh => {
  const c = [
    new Vector3(-halfWidth, y, -halfDepth),
    new Vector3(halfWidth, y, -halfDepth),
    new Vector3(halfWidth, y, halfDepth),
    new Vector3(-halfWidth, y, halfDepth),
  ];
  if (ridge < 1e-6) {
    return { vertices: [...c, new Vector3(0, y + rise, 0)], faces: [[1, 0, 4], [3, 2, 4], [0, 3, 4], [2, 1, 4]] };
  }
  const vertices = [...c, new Vector3(-ridge / 2, y + rise, 0), new Vector3(ridge / 2, y + rise, 0)];
  const slopes = [[1, 0, 4, 5], [3, 2, 5, 4]];
  if (ridge >= halfWidth * 2 - 1e-6) return { vertices, faces: slopes };
  return { vertices, faces: [...slopes, [0, 3, 4], [2, 1, 5]] };
};

/** A pyramid on a regular N-gon, a flat side to the front. */
const polygonRoof = (sides: number, radius: number, y: number, rise: number): RoofMesh => {
  const vertices = Array.from({ length: sides }, (_, k) => {
    const a = ((k + 0.5) / sides) * Math.PI * 2;
    return new Vector3(radius * Math.sin(a), y, radius * Math.cos(a));
  });
  vertices.push(new Vector3(0, y + rise, 0));
  return { vertices, faces: Array.from({ length: sides }, (_, k) => [k, (k + 1) % sides, sides]) };
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x11141a,
    cameraPosition: [7.4, 4.6, 8.2],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(4, 6, 3.5);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-3.5, 0.5, -2.5);
  scene.add(key, bounce);

  const roofing = new MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.62,
    metalness: 0.32,
    flatShading: true,
    side: DoubleSide,
  });
  const capping = new MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.45, metalness: 0.35, flatShading: true });
  const masonry = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true, side: DoubleSide });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    form: "hip" as "hip" | "polygon",
    width: 4.4,
    depth: 2.6,
    sides: 6,
    radius: 1.8,
    rise: 2.0,
    overhang: 0.16,
    ridgeLength: 1.8,

    caps: true,
    capWidth: 0.12,
    thickness: 0.05,
    ends: "level" as CapOptions["ends"],

    wall: true,
    wallHeight: 2.2,
    wireframe: false,

    capped: "",
    exact: "",
    closed: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const { rise, overhang, wallHeight: y } = params;

    let roof: RoofMesh;
    if (params.form === "hip") {
      const halfWidth = params.width / 2 + overhang;
      const halfDepth = params.depth / 2 + overhang;
      const ridge = Math.max(0, Math.min(params.ridgeLength, halfWidth * 2));
      roof = hipRoof(halfWidth, halfDepth, y, rise, ridge);
      if (params.wall) {
        const wall = new Mesh(new BoxGeometry(params.width, y, params.depth), masonry);
        wall.position.y = y / 2;
        stage.add(wall);
      }
    } else {
      // Overhang measured square to each side, not along the corner.
      const radius = params.radius + overhang / Math.cos(Math.PI / params.sides);
      roof = polygonRoof(params.sides, radius, y, rise);
      if (params.wall) {
        const wall = new Mesh(new CylinderGeometry(params.radius, params.radius, y, params.sides, 1, false, Math.PI / params.sides), masonry);
        wall.position.y = y / 2;
        stage.add(wall);
      }
    }

    const result = roofCaps(roof, { width: params.caps ? params.capWidth : 0, thickness: params.thickness, ends: params.ends });
    stage.add(new Mesh(result.roofing, roofing));
    if (params.caps) stage.add(new Mesh(result.caps, capping));
    else result.caps.dispose();

    if (params.wireframe) {
      for (const child of [...stage.children]) {
        if (child instanceof Mesh) stage.add(new LineSegments(new WireframeGeometry(child.geometry), wire));
      }
    }

    params.capped = params.caps ? `${result.capped} folds capped · ${params.ends} ends` : "caps off — bare faces";
    params.exact =
      result.planeError < 1e-9
        ? `every face offset exactly (${result.planeError.toExponential(1)})`
        : `worst face off by ${result.planeError.toFixed(4)} — a least-squares vertex`;
    params.closed = !params.caps
      ? "no caps"
      : result.openEdges === 0
        ? "one closed solid — no open edges"
        : `${result.openEdges} open edges`;
  };
  rebuild();
  // FRAME ONCE, NEVER ON REBUILD — re-framing on a dial change throws away the viewer's zoom and pan.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Roof Caps");

  const cap = gui.addFolder("Caps");
  cap.add(params, "caps").name("Caps").onChange(rebuild);
  cap.add(params, "capWidth", 0.02, 0.6, 0.005).name("Width").onChange(rebuild);
  cap.add(params, "thickness", 0.005, 0.3, 0.005).name("Thickness").onChange(rebuild);
  cap.add(params, "ends", ["level", "plumb"]).name("Eave Ends").onChange(rebuild);
  cap.open();

  const form = gui.addFolder("Roof");
  form.add(params, "form", ["hip", "polygon"]).name("Form").onChange(rebuild);
  form.add(params, "ridgeLength", 0, 10, 0.05).name("Ridge Length (hip)").onChange(rebuild);
  form.add(params, "width", 1, 9, 0.1).name("Width (hip)").onChange(rebuild);
  form.add(params, "depth", 1, 9, 0.1).name("Depth (hip)").onChange(rebuild);
  form.add(params, "sides", 3, 12, 1).name("Sides (polygon)").onChange(rebuild);
  form.add(params, "radius", 0.5, 4, 0.05).name("Radius (polygon)").onChange(rebuild);
  form.add(params, "rise", 0.4, 6, 0.1).name("Rise").onChange(rebuild);
  form.add(params, "overhang", 0, 0.8, 0.01).name("Overhang").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wall").name("Wall").onChange(rebuild);
  inspect.add(params, "wallHeight", 0.5, 5, 0.1).name("Wall Height").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "capped").name("Caps").listen().disable();
  readout.add(params, "exact").name("Offset").listen().disable();
  readout.add(params, "closed").name("Closure").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    roofing.dispose();
    capping.dispose();
    masonry.dispose();
    wire.dispose();
    dispose();
  };
}

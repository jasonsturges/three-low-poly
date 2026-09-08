import GUI from "lil-gui";
import {
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";
import { createPumpkinStemGeometry, pumpkinStemMatrix } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Jack-o’-lantern",
  description:
    "A shell built with openings: triangulate a flat pattern, subdivide, wrap onto a ribbed sphere, then bridge to an inner skin. No CSG or additional dependencies. Face points live in longitude/latitude space; thickness is a concentric scale, not a constant normal offset.",
};

interface ShellOptions {
  thickness: number;
  squash: number;
  ribs: number;
  ribDepth: number;
  faceScale: number;
  detail: number;
}

type Triangle = [number, number, number];

/**
 * Study-local prototype. The outer rectangle covers the entire sphere, with its seam at the back.
 * Uniform midpoint subdivision makes opposite seam edges match exactly. The horizontal boundaries
 * collapse to the poles. Subdivide in parameter space BEFORE wrapping, including every hole edge,
 * so the opening walls use exactly the same vertices as both skins.
 *
 * This constructs new topology; it cannot cut arbitrary existing meshes. Keep it in the study until
 * a second use establishes which parts deserve to become general modeling tools.
 */
export function createJackolanternShell(options: ShellOptions): BufferGeometry {
  const { thickness, squash, ribs, ribDepth, faceScale, detail } = options;
  const outline = [
    new Vector2(-Math.PI, -Math.PI / 2),
    new Vector2(Math.PI, -Math.PI / 2),
    new Vector2(Math.PI, Math.PI / 2),
    new Vector2(-Math.PI, Math.PI / 2),
  ];
  const face = (points: number[][]) => points.map(([u, v]) => new Vector2(u * faceScale, v * faceScale));
  const holes = [
    face([
      [-0.67, 0.14],
      [-0.19, 0.17],
      [-0.4, 0.56],
    ]),
    face([
      [0.19, 0.17],
      [0.67, 0.14],
      [0.4, 0.56],
    ]),
    face([
      [-0.12, -0.13],
      [0.12, -0.13],
      [0, 0.09],
    ]),
    // A concave grin, with two teeth left attached to the upper lip.
    face([
      [-0.72, -0.23],
      [-0.39, -0.26],
      [-0.36, -0.39],
      [-0.23, -0.4],
      [-0.22, -0.28],
      [0.22, -0.28],
      [0.23, -0.4],
      [0.36, -0.39],
      [0.39, -0.26],
      [0.72, -0.23],
      [0.51, -0.55],
      [0.26, -0.65],
      [-0.26, -0.65],
      [-0.51, -0.55],
    ]),
  ];
  const points = [...outline, ...holes.flat()];
  let triangles = ShapeUtils.triangulateShape(outline, holes) as Triangle[];
  let offset = outline.length;
  let rims = holes.map((hole) => {
    const ring = hole.map((_, i) => offset + i);
    offset += hole.length;
    return ring;
  });

  for (let level = 0; level < detail; level++) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      let index = midpoints.get(key);
      if (index === undefined) {
        index = points.length;
        points.push(points[a].clone().add(points[b]).multiplyScalar(0.5));
        midpoints.set(key, index);
      }
      return index;
    };
    triangles = triangles.flatMap(([a, b, c]): Triangle[] => {
      const ab = midpoint(a, b),
        bc = midpoint(b, c),
        ca = midpoint(c, a);
      return [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ];
    });
    rims = rims.map((ring) => ring.flatMap((a, i) => [a, midpoint(a, ring[(i + 1) % ring.length])]));
  }

  // Ear clipping creates long diagonals around the holes. After subdivision, flip interior
  // edges toward a Delaunay triangulation in parameter space: skinny triangles otherwise fold
  // visibly across ribs when wrapped. Boundary edges (including holes) never move.
  const orient = (a: number, b: number, c: number) =>
    (points[b].x - points[a].x) * (points[c].y - points[a].y) - (points[b].y - points[a].y) * (points[c].x - points[a].x);
  for (let pass = 0; pass < 40; pass++) {
    const edges = new Map<string, { triangle: number; a: number; b: number; c: number }>();
    const changed = new Set<number>();
    for (let t = 0; t < triangles.length; t++) {
      if (changed.has(t)) continue;
      const triangle = triangles[t];
      for (let e = 0; e < 3; e++) {
        const a = triangle[e],
          b = triangle[(e + 1) % 3],
          c = triangle[(e + 2) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const other = edges.get(key);
        if (!other) {
          edges.set(key, { triangle: t, a, b, c });
          continue;
        }
        if (changed.has(other.triangle)) continue;
        const d = other.c;
        if (orient(c, d, b) <= 1e-12 || orient(d, c, a) <= 1e-12) continue;
        const ax = points[a].x - points[d].x,
          ay = points[a].y - points[d].y;
        const bx = points[b].x - points[d].x,
          by = points[b].y - points[d].y;
        const cx = points[c].x - points[d].x,
          cy = points[c].y - points[d].y;
        const inCircle =
          (ax * ax + ay * ay) * (bx * cy - by * cx) -
          (bx * bx + by * by) * (ax * cy - ay * cx) +
          (cx * cx + cy * cy) * (ax * by - ay * bx);
        if (inCircle <= 1e-12) continue;
        triangles[t] = [c, d, b];
        triangles[other.triangle] = [d, c, a];
        changed.add(t);
        changed.add(other.triangle);
        break;
      }
    }
    if (changed.size === 0) break;
  }

  const surface = (p: Vector2, scale: number): Vector3 => {
    const radial = Math.cos(p.y) * (1 + Math.cos((Math.PI / 2 - p.x) * ribs) * ribDepth);
    return new Vector3(Math.sin(p.x) * radial * scale, squash + Math.sin(p.y) * squash * scale, Math.cos(p.x) * radial * scale);
  };
  const outer = points.map((p) => surface(p, 1));
  const inner = points.map((p) => surface(p, 1 - thickness));
  const positions: number[] = [],
    uvs: number[] = [];
  const geometry = new BufferGeometry();
  const edge = new Vector3(),
    cross = new Vector3();
  const emit = (a: Vector3, b: Vector3, c: Vector3, uv: Vector2[]) => {
    // Pole boundaries collapse; omit their zero-area triangles rather than emit invalid normals.
    cross.subVectors(b, a).cross(edge.subVectors(c, a));
    if (cross.lengthSq() < 1e-20) return;
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (const p of uv) uvs.push(p.x / (2 * Math.PI) + 0.5, p.y / Math.PI + 0.5);
  };
  const group = (material: number, build: () => void) => {
    const start = positions.length / 3;
    build();
    geometry.addGroup(start, positions.length / 3 - start, material);
  };
  group(0, () => {
    for (const [a, b, c] of triangles) emit(outer[a], outer[b], outer[c], [points[a], points[b], points[c]]);
  });
  group(1, () => {
    for (const [a, b, c] of triangles) emit(inner[c], inner[b], inner[a], [points[c], points[b], points[a]]);
  });
  group(2, () => {
    for (const ring of rims) {
      // Hole loops must run clockwise in parameter space: the surviving surface is to their left.
      const ordered = ShapeUtils.isClockWise(ring.map((i) => points[i])) ? ring : [...ring].reverse();
      for (let i = 0; i < ordered.length; i++) {
        const a = ordered[i],
          b = ordered[(i + 1) % ordered.length];
        emit(outer[b], outer[a], inner[a], [points[b], points[a], points[a]]);
        emit(outer[b], inner[a], inner[b], [points[b], points[a], points[b]]);
      }
    }
  });
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    cameraPosition: [1.25, 1.55, 3.1],
    background: "#14131b",
  });
  const keyLight = new DirectionalLight("#ffe0be", 1.8);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);
  controls.target.set(0, 0.9, 0);
  controls.update();
  const params = {
    thickness: 0.13,
    squash: 0.82,
    ribs: 8,
    ribDepth: 0.075,
    faceScale: 1,
    detail: 4,
    wireframe: false,
    glow: true,
    rotate: false,
  };
  const rind = new MeshStandardMaterial({ color: "#c85a16", roughness: 0.85, flatShading: true });
  const inside = new MeshStandardMaterial({ color: "#d88c35", roughness: 1, flatShading: true });
  const cut = new MeshStandardMaterial({ color: "#ffc66c", roughness: 0.85, flatShading: true });
  const shell = new Mesh(createJackolanternShell(params), [rind, inside, cut]);
  // Avoid shadow-map self-acne on the thin cut edges. The shell still
  // casts real shadows through the openings onto the floor.
  shell.castShadow = true;
  shell.receiveShadow = false;
  scene.add(shell);
  const stemMaterial = new MeshStandardMaterial({ color: "#474d28", roughness: 1, flatShading: true });
  const stem = new Mesh(createPumpkinStemGeometry(), stemMaterial);
  const seatStem = () => {
    stem.matrix.copy(pumpkinStemMatrix({ rindSquash: params.squash, stemLean: 0.22 }));
    stem.matrixAutoUpdate = false;
    stem.matrixWorldNeedsUpdate = true;
  };
  seatStem();
  stem.castShadow = true;
  shell.add(stem);

  const candleMaterial = new MeshStandardMaterial({ color: "#fff0bf", emissive: "#ff992d", emissiveIntensity: 1 });
  const candle = new Mesh(new CylinderGeometry(0.11, 0.12, 0.27, 12), candleMaterial);
  candle.position.y = 0.3;
  shell.add(candle);
  const light = new PointLight("#ffae48", 5, 6, 2);
  light.position.set(0, 0.65, 0.05);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.05;
  light.shadow.bias = -0.0002;
  shell.add(light);

  const floorMaterial = new MeshStandardMaterial({ color: "#302c37", roughness: 1 });
  const floor = new Mesh(new PlaneGeometry(200, 200), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  const stats = { triangles: shell.geometry.getAttribute("position").count / 3 };
  const rebuild = () => {
    const geometry = createJackolanternShell(params);
    shell.geometry.dispose();
    shell.geometry = geometry;
    seatStem();
    stats.triangles = geometry.getAttribute("position").count / 3;
  };
  const gui = new GUI();
  gui.title("Jack-o’-lantern study");
  const shape = gui.addFolder("Shell");
  shape.add(params, "thickness", 0.06, 0.24, 0.01).name("Rind thickness").onChange(rebuild);
  shape.add(params, "squash", 0.65, 1, 0.01).name("Height").onChange(rebuild);
  shape.add(params, "ribs", 4, 12, 1).name("Ribs").onChange(rebuild);
  shape.add(params, "ribDepth", 0, 0.12, 0.005).name("Rib depth").onChange(rebuild);
  shape.add(params, "faceScale", 0.7, 1.2, 0.05).name("Face size").onChange(rebuild);
  const view = gui.addFolder("Inspect");
  view.add(params, "detail", 2, 4, 1).name("Subdivisions").onChange(rebuild);
  view
    .add(params, "wireframe")
    .name("Wireframe")
    .onChange((value: boolean) => {
      for (const material of [rind, inside, cut]) material.wireframe = value;
    });
  view
    .add(params, "glow")
    .name("Candle light")
    .onChange((value: boolean) => {
      light.visible = value;
      candleMaterial.emissiveIntensity = value ? 1 : 0;
    });
  view.add(params, "rotate").name("Turntable");
  view.add(stats, "triangles").name("Shell triangles").listen().disable();
  let elapsed = 0;
  const stop = onFrame((delta) => {
    elapsed += delta;
    light.intensity = 5 + 0.3 * Math.sin(elapsed * 7) + 0.15 * Math.sin(elapsed * 13);
    if (params.rotate) shell.rotation.y += delta * 0.25;
  });
  return () => {
    stop();
    gui.destroy();
    shell.geometry.dispose();
    stem.geometry.dispose();
    candle.geometry.dispose();
    floor.geometry.dispose();
    for (const material of [rind, inside, cut, stemMaterial, candleMaterial, floorMaterial]) material.dispose();
    light.dispose();
    dispose();
  };
}

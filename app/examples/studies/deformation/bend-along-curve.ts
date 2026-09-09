import GUI from "lil-gui";
import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { EdgedBoxGeometry, thickenSurface, transportFrames, triangulateRegion } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Bend Along Curve",
  description:
    "STUDY — deform existing vertices, preserving holes, edge treatments, UVs and material groups. " +
    "Arc uses an analytic circular bend; S curve and Spatial curve use sampled parallel-transport frames. " +
    "The selected source anchor keeps its centerline position and local frame. Fit guide stretches the " +
    "reference axis to the whole path. Keep axis length uses source distances and extends endpoint tangents " +
    "when the source exceeds the guide. Neither mode preserves every fiber: the inside of a bend compresses " +
    "and the outside stretches. Refinement splits the source triangles before deformation; the deformation " +
    "itself does not add vertices. Compare coarse geometry to see the chords. Jacobian normals use the " +
    "inverse transpose of a numerical derivative, while Facet normals follow the rendered triangles. " +
    "All materials are single-sided. Nonpositive sampled determinants indicate local folding or collapse; " +
    "the study reports these cases for inspection and does not certify global non-intersection. " +
    "Everything here remains experimental and local to the study.",
};
export type BendSource = "Beam" | "Edged box" | "Perforated panel";
export type BendAxis = "X" | "Y" | "Z";
export interface BendSettings {
  guide: "Arc" | "S curve" | "Spatial curve";
  angle: number;
  roll?: number;
  amplitude: number;
  guideScale: number;
  anchor: "Start" | "Center" | "End";
  fit: "Fit guide" | "Keep axis length";
  axis: BendAxis;
  normals: "Jacobian" | "Facet";
}
const basis = (axis: BendAxis): [Vector3, Vector3, Vector3] =>
  axis === "X"
    ? [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
    : axis === "Y"
      ? [new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)]
      : [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0)];

export function bendStudySource(kind: BendSource, refinement: number, axis: BendAxis): BufferGeometry {
  let geometry: BufferGeometry;
  if (kind === "Beam") geometry = new BoxGeometry(3, 0.65, 0.35, 4, 1, 1);
  else if (kind === "Edged box")
    geometry = new EdgedBoxGeometry({
      width: 3,
      height: 0.7,
      depth: 0.35,
      axis: "y",
      radius: 0.12,
      edge: "round",
      segments: 3,
    }).translate(0, -0.35, 0);
  else {
    const outline = [new Vector2(-1.5, -0.5), new Vector2(1.5, -0.5), new Vector2(1.5, 0.5), new Vector2(-1.5, 0.5)];
    const holes = [-0.85, 0, 0.85].map((x) =>
      Array.from(
        { length: 16 },
        (_, i) => new Vector2(x + 0.23 * Math.cos((i * Math.PI) / 8), 0.23 * Math.sin((i * Math.PI) / 8)),
      ),
    );
    const region = triangulateRegion(outline, holes);
    geometry = thickenSurface(
      {
        points: region.points.map((p) => new Vector3(p.x, p.y, 0)),
        triangles: region.triangles,
        uv: region.points.map((p) => new Vector2(p.x / 3 + 0.5, p.y + 0.5)),
      },
      { thickness: 0.18 },
    ).geometry;
  }
  if (geometry.index) {
    const plain = geometry.toNonIndexed();
    geometry.dispose();
    geometry = plain;
  }
  // Uniform midpoint subdivision preserves triangle boundaries, attributes and group membership.
  for (let level = 0; level < refinement; level++) {
    const next = new BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      const attr = geometry.getAttribute(name);
      if (!attr) continue;
      const output: number[] = [];
      for (let i = 0; i < attr.count; i += 3) {
        const read = (k: number) => Array.from({ length: attr.itemSize }, (_, j) => attr.array[(i + k) * attr.itemSize + j]);
        const [a, b, c] = [read(0), read(1), read(2)];
        const mid = (a: number[], b: number[]) => a.map((v, j) => (v + b[j]) / 2);
        const ab = mid(a, b),
          bc = mid(b, c),
          ca = mid(c, a);
        for (const p of [a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca]) output.push(...p);
      }
      next.setAttribute(name, new Float32BufferAttribute(output, attr.itemSize));
    }
    geometry.groups.forEach((g) => next.addGroup(g.start * 4, g.count * 4, g.materialIndex));
    geometry.dispose();
    geometry = next;
  }
  const [a, b, c] = basis(axis);
  geometry.applyMatrix4(new Matrix4().makeBasis(a, b, c));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

type Frame = { p: Vector3; q: Quaternion };
/** Maps local source positions; guide evaluation and source tessellation are deliberately independent. */
export function bendStudyMap(source: BufferGeometry, settings: BendSettings) {
  const [a, b, c] = basis(settings.axis),
    bounds = new Box3().setFromBufferAttribute(source.getAttribute("position") as Float32BufferAttribute);
  const center = bounds.getCenter(new Vector3()),
    size = bounds.getSize(new Vector3()),
    length = Math.abs(size.dot(a));
  if (!(length > 0)) throw new Error("The source axis must have positive length.");
  const start = center.dot(a) - length / 2,
    anchor = settings.anchor === "Start" ? 0 : settings.anchor === "End" ? 1 : 0.5;
  const anchorX = start + anchor * length,
    guideLengthTarget = length * settings.guideScale;
  let guideLength = guideLengthTarget;
  let evaluate: (s: number) => Frame;
  if (settings.guide === "Arc") {
    const curvature = settings.angle / guideLength;
    evaluate = (s) => {
      const at = Math.max(0, Math.min(guideLength, s)),
        theta = curvature * at;
      const p =
        Math.abs(curvature) < 1e-10
          ? new Vector3(at, 0, 0)
          : new Vector3(Math.sin(theta) / curvature, (2 * Math.sin(theta / 2) ** 2) / curvature, 0);
      p.addScaledVector(new Vector3(Math.cos(theta), Math.sin(theta), 0), s - at);
      return { p, q: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), theta) };
    };
  } else {
    const samples = 256;
    const positions = Array.from({ length: samples + 1 }, (_, i) => {
      const t = i / samples;
      return new Vector3(
        length * t,
        settings.amplitude * 0.7 * Math.sin(2 * Math.PI * t),
        settings.guide === "Spatial curve" ? settings.amplitude * 0.6 * Math.sin(Math.PI * t) : 0,
      );
    });
    const path = positions.map((p, i) => ({
      position: p,
      tangent: positions[Math.min(samples, i + 1)]
        .clone()
        .sub(positions[Math.max(0, i - 1)])
        .normalize(),
    }));
    const stations = transportFrames(path, new Vector3(0, 1, 0));
    const distances = [0];
    for (let i = 1; i < positions.length; i++) distances.push(distances[i - 1] + positions[i].distanceTo(positions[i - 1]));
    const factor = guideLengthTarget / distances[samples];
    positions.forEach((p) => p.multiplyScalar(factor));
    distances.forEach((d, i) => (distances[i] = d * factor));
    const rotations = stations.map((f) =>
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(f.tangent, f.normal, f.binormal)),
    );
    evaluate = (s) => {
      if (s < 0 || s > guideLength) {
        const i = s < 0 ? 0 : samples;
        return { p: positions[i].clone().addScaledVector(stations[i].tangent, s - distances[i]), q: rotations[i].clone() };
      }
      let lo = 0,
        hi = samples;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (distances[m] <= s) lo = m;
        else hi = m;
      }
      const t = (s - distances[lo]) / (distances[hi] - distances[lo]);
      return { p: positions[lo].clone().lerp(positions[hi], t), q: rotations[lo].clone().slerp(rotations[hi], t) };
    };
  }
  const anchorDistance = anchor * guideLength,
    originFrame = evaluate(anchorDistance),
    inverse = originFrame.q.clone().invert();
  const anchorPoint = center.clone().addScaledVector(a, anchorX - center.dot(a));
  const toWorld = (p: Vector3) => anchorPoint.clone().addScaledVector(a, p.x).addScaledVector(b, p.y).addScaledVector(c, p.z);
  const sFor = (x: number) =>
    settings.fit === "Fit guide" ? ((x - start) / length) * guideLength : anchorDistance + x - anchorX;
  const roll = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), settings.roll ?? 0);
  const unroll = roll.clone().invert();
  const map = (point: Vector3) => {
    const frame = evaluate(sFor(point.dot(a)));
    const transverse = new Vector3(0, point.clone().sub(center).dot(b), point.clone().sub(center).dot(c))
      .applyQuaternion(unroll)
      .applyQuaternion(frame.q);
    return toWorld(frame.p.clone().sub(originFrame.p).add(transverse).applyQuaternion(inverse).applyQuaternion(roll));
  };
  const s0 = sFor(start),
    s1 = sFor(start + length);
  const guide = Array.from({ length: 257 }, (_, i) =>
    toWorld(
      evaluate((i / 256) * guideLength)
        .p.clone()
        .sub(originFrame.p)
        .applyQuaternion(inverse)
        .applyQuaternion(roll),
    ),
  );
  return {
    map,
    guide,
    length,
    guideLength,
    usedLength: s1 - s0,
    extension: Math.max(0, -s0) + Math.max(0, s1 - guideLength),
    anchorPoint,
  };
}

export function deformStudyGeometry(source: BufferGeometry, settings: BendSettings) {
  const mapping = bendStudyMap(source, settings),
    geometry = source.clone(),
    position = source.getAttribute("position"),
    output = geometry.getAttribute("position"),
    normals = source.getAttribute("normal");
  const transformed: number[] = [],
    epsilon = mapping.length * 1e-5;
  let minDet = Infinity,
    folded = 0;
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  for (let i = 0; i < position.count; i++) {
    const p = new Vector3().fromBufferAttribute(position, i),
      mapped = mapping.map(p);
    output.setXYZ(i, mapped.x, mapped.y, mapped.z);
    const derivative = axes.map((axis) =>
      mapping
        .map(p.clone().addScaledVector(axis, epsilon))
        .sub(mapping.map(p.clone().addScaledVector(axis, -epsilon)))
        .divideScalar(2 * epsilon),
    );
    const matrix = new Matrix3().set(
      derivative[0].x,
      derivative[1].x,
      derivative[2].x,
      derivative[0].y,
      derivative[1].y,
      derivative[2].y,
      derivative[0].z,
      derivative[1].z,
      derivative[2].z,
    );
    const determinant = matrix.determinant();
    minDet = Math.min(minDet, determinant);
    if (determinant <= 1e-6) folded++;
    const normal = normals ? new Vector3().fromBufferAttribute(normals, i) : new Vector3();
    if (Math.abs(determinant) > 1e-8) normal.applyMatrix3(matrix.invert().transpose()).normalize();
    else normal.set(0, 0, 0);
    transformed.push(...normal.toArray());
  }
  if (settings.normals === "Facet") geometry.computeVertexNormals();
  else geometry.setAttribute("normal", new Float32BufferAttribute(transformed, 3));
  output.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // Chord error evaluates the deformation at edge midpoints, where the mesh has no new vertex.
  let chordError = 0;
  const index = source.index,
    count = index?.count ?? position.count;
  for (let i = 0; i < count; i += 3)
    for (let k = 0; k < 3; k++) {
      const j = index ? index.getX(i + k) : i + k,
        l = index ? index.getX(i + ((k + 1) % 3)) : i + ((k + 1) % 3);
      const a = new Vector3().fromBufferAttribute(position, j),
        b = new Vector3().fromBufferAttribute(position, l);
      chordError = Math.max(
        chordError,
        mapping.map(a.clone().add(b).multiplyScalar(0.5)).distanceTo(mapping.map(a).add(mapping.map(b)).multiplyScalar(0.5)),
      );
    }
  return { geometry, ...mapping, minDet, folded, chordError };
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [2, 2, 5] });
  const key = new DirectionalLight(0xffeee0, 2);
  key.position.set(3, 4, 5);
  const fill = new DirectionalLight(0xb4ccff, 1.5);
  fill.position.set(-3, -2, -4);
  handle.scene.add(key, fill);
  const stage = new Group();
  handle.scene.add(stage);
  const material = new MeshStandardMaterial({ color: 0x79adc4, roughness: 0.6, side: FrontSide });
  const wire = new LineBasicMaterial({ color: 0x172b36, transparent: true, opacity: 0.45 }),
    ghost = new LineBasicMaterial({ color: 0x8392a1, transparent: true, opacity: 0.3 });
  const coarseMat = new LineBasicMaterial({ color: 0xf0ad70 }),
    guideMat = new LineBasicMaterial({ color: 0xe8ca74 }),
    normalMat = new LineBasicMaterial({ color: 0xa2e8ad });
  const params = {
    source: "Perforated panel" as BendSource,
    guide: "Arc",
    angle: 1.8,
    roll: Math.PI / 2,
    amplitude: 0.65,
    guideScale: 1,
    anchor: "Center",
    fit: "Fit guide",
    axis: "X",
    normals: "Jacobian",
    refinement: 3,
    sourceOverlay: false,
    coarse: false,
    wireframe: false,
    path: true,
    showNormals: false,
    lengths: "",
    quality: "",
    status: "",
    triangles: "",
  } as BendSettings & {
    source: BendSource;
    refinement: number;
    sourceOverlay: boolean;
    coarse: boolean;
    wireframe: boolean;
    path: boolean;
    showNormals: boolean;
    lengths: string;
    quality: string;
    status: string;
    triangles: string;
  };
  const clear = () => {
    stage.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
    });
    stage.clear();
  };
  const line = (points: Vector3[], mat: LineBasicMaterial) =>
    stage.add(new LineSegments(new BufferGeometry().setFromPoints(points), mat));
  const rebuild = () => {
    clear();
    const source = bendStudySource(params.source, params.refinement, params.axis),
      result = deformStudyGeometry(source, params);
    stage.add(new Mesh(result.geometry, material));
    if (params.sourceOverlay) stage.add(new LineSegments(new WireframeGeometry(source), ghost));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(result.geometry), wire));
    if (params.coarse) {
      const original = bendStudySource(params.source, 0, params.axis),
        coarse = deformStudyGeometry(original, params);
      stage.add(new LineSegments(new WireframeGeometry(coarse.geometry), coarseMat));
      original.dispose();
      coarse.geometry.dispose();
    }
    if (params.path)
      line(
        result.guide.slice(1).flatMap((p, i) => [result.guide[i], p]),
        guideMat,
      );
    if (params.showNormals) {
      const p = result.geometry.getAttribute("position"),
        n = result.geometry.getAttribute("normal"),
        lines: Vector3[] = [];
      for (let i = 0; i < p.count; i += Math.max(1, Math.ceil(p.count / 100))) {
        const at = new Vector3().fromBufferAttribute(p, i);
        lines.push(at, at.clone().addScaledVector(new Vector3().fromBufferAttribute(n, i), 0.13));
      }
      line(lines, normalMat);
    }
    const a = result.anchorPoint,
      r = 0.07;
    line(
      [
        a.clone().add(new Vector3(-r, 0, 0)),
        a.clone().add(new Vector3(r, 0, 0)),
        a.clone().add(new Vector3(0, -r, 0)),
        a.clone().add(new Vector3(0, r, 0)),
        a.clone().add(new Vector3(0, 0, -r)),
        a.clone().add(new Vector3(0, 0, r)),
      ],
      guideMat,
    );
    params.lengths = `${result.length.toFixed(2)} → ${result.usedLength.toFixed(2)} · guide ${result.guideLength.toFixed(2)}`;
    params.quality = `${result.chordError.toFixed(4)} midpoint error`;
    params.status = result.folded
      ? `${result.folded} folded/collapsed samples`
      : `Min determinant ${result.minDet.toFixed(3)} · extension ${result.extension.toFixed(2)}`;
    params.triangles = `${result.geometry.getAttribute("position").count / 3} triangles`;
    source.dispose();
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.25 });
  const gui = new GUI({ width: 340 });
  gui.title("Bend Along Curve");
  const shape = gui.addFolder("Source");
  shape.add(params, "source", ["Beam", "Edged box", "Perforated panel"]).name("Geometry").onChange(rebuild);
  shape.add(params, "refinement", 0, 3, 1).name("Refinement").onChange(rebuild);
  shape.add(params, "axis", ["X", "Y", "Z"]).name("Source axis").onChange(rebuild);
  const curve = gui.addFolder("Deformation");
  curve.add(params, "guide", ["Arc", "S curve", "Spatial curve"]).name("Guide").onChange(rebuild);
  curve.add(params, "roll", -Math.PI, Math.PI, 0.05).name("Bend plane rotation").onChange(rebuild);
  curve.add(params, "angle", -4, 4, 0.05).name("Arc angle (rad)").onChange(rebuild);
  curve.add(params, "amplitude", 0, 1.5, 0.05).name("Curve amplitude").onChange(rebuild);
  curve.add(params, "guideScale", 0.5, 1.8, 0.05).name("Guide length scale").onChange(rebuild);
  curve.add(params, "anchor", ["Start", "Center", "End"]).name("Anchor").onChange(rebuild);
  curve.add(params, "fit", ["Fit guide", "Keep axis length"]).name("Length mode").onChange(rebuild);
  curve.add(params, "normals", ["Jacobian", "Facet"]).name("Normals").onChange(rebuild);
  const inspect = gui.addFolder("Inspect — single sided");
  for (const [key, label] of [
    ["sourceOverlay", "Original overlay"],
    ["coarse", "Coarse comparison"],
    ["wireframe", "Wireframe"],
    ["path", "Guide + anchor"],
    ["showNormals", "Normal indicators"],
  ] as const)
    inspect.add(params, key).name(label).onChange(rebuild);
  inspect.add({ frame: () => frameObject(handle, stage, { fit: 1.25 }) }, "frame").name("Frame study");
  const readout = gui.addFolder("Measurements");
  readout.add(params, "lengths").name("Reference lengths").listen().disable();
  readout.add(params, "quality").name("Chord error").listen().disable();
  readout.add(params, "status").name("Local map").listen().disable();
  readout.add(params, "triangles").name("Geometry").listen().disable();
  return () => {
    gui.destroy();
    clear();
    [material, wire, ghost, coarseMat, guideMat, normalMat].forEach((m) => m.dispose());
    handle.dispose();
  };
}

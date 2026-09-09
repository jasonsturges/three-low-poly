import { Box3, BufferGeometry, Curve, Float32BufferAttribute, Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import { transportFrames } from "../surfaces/Sweep";

/** Deforms existing vertices in geometry-local coordinates; never subdivides the mesh. */
export interface CurveDeformationOptions {
  axis?: "X" | "Y" | "Z";
  anchor?: "Start" | "Center" | "End";
  fit?: "Fit guide" | "Keep axis length";
  /** Rotation around the source axis, in radians. */
  roll?: number;
  /** Uniformly scale the guide to this length; defaults to the sampled curve length. */
  guideLength?: number;
  /** Number of curve intervals (default 256). Independent of mesh tessellation. */
  samples?: number;
  normals?: "Jacobian" | "Facet";
  /** Local fold detection only; does not certify global non-intersection. */
  onInvalid?: "throw" | "report";
}
export interface BendGeometryOptions extends CurveDeformationOptions {
  /** Signed arc angle in radians. Zero produces a straight guide. */
  angle: number;
}
type ResolvedOptions = Required<Omit<BendGeometryOptions, "guideLength">> & { guideLength?: number };

function resolve(options: CurveDeformationOptions, angle = 0): ResolvedOptions {
  const o = {
    axis: "X",
    anchor: "Center",
    fit: "Fit guide",
    roll: 0,
    samples: 256,
    normals: "Jacobian",
    onInvalid: "throw",
    ...options,
    angle,
  } as ResolvedOptions;
  if (
    !["X", "Y", "Z"].includes(o.axis) ||
    !["Start", "Center", "End"].includes(o.anchor) ||
    !["Fit guide", "Keep axis length"].includes(o.fit) ||
    !["Jacobian", "Facet"].includes(o.normals) ||
    !["throw", "report"].includes(o.onInvalid)
  )
    throw new Error("Invalid deformation option.");
  if (
    !Number.isFinite(o.angle) ||
    !Number.isFinite(o.roll) ||
    (o.guideLength !== undefined && !(Number.isFinite(o.guideLength) && o.guideLength > 0)) ||
    !Number.isInteger(o.samples) ||
    o.samples < 2 ||
    o.samples > 65536
  )
    throw new Error("Deformation requires finite angles, positive guide length, and 2–65536 sample intervals.");
  return o;
}
function validateSource(source: BufferGeometry) {
  const p = source.getAttribute("position");
  if (!p || p.itemSize !== 3 || !p.count) throw new Error("A nonempty position attribute of size 3 is required.");
  if (Object.keys(source.morphAttributes).length || source.drawRange.start !== 0 || source.drawRange.count !== Infinity)
    throw new Error("Morph attributes and partial draw ranges are unsupported.");
  for (const name of Object.keys(source.attributes)) {
    const a = source.getAttribute(name);
    if (
      !["position", "normal", "uv", "color"].includes(name) ||
      a.count !== p.count ||
      ((name === "position" || name === "normal") && a.itemSize !== 3)
    )
      throw new Error(`Unsupported or mismatched attribute: ${name}.`);
    for (let i = 0; i < a.count; i++)
      for (let j = 0; j < a.itemSize; j++)
        if (!Number.isFinite(a.getComponent(i, j))) throw new Error(`Nonfinite ${name} attribute.`);
  }
  const count = source.index?.count ?? p.count;
  if (count % 3) throw new Error("Geometry must contain complete triangles.");
  if (source.index)
    for (let i = 0; i < count; i++) {
      const n = source.index.getX(i);
      if (!Number.isInteger(n) || n < 0 || n >= p.count) throw new Error("Invalid triangle index.");
    }
  for (const g of source.groups)
    if (
      !Number.isInteger(g.start) ||
      !Number.isInteger(g.count) ||
      g.start < 0 ||
      g.count < 0 ||
      g.start % 3 ||
      g.count % 3 ||
      g.start + g.count > count
    )
      throw new Error("Invalid material group.");
}

/** Bend around an analytic circular guide; default guide length is the source-axis extent. */
export function bendGeometry(source: BufferGeometry, options: BendGeometryOptions) {
  if (!Number.isFinite(options.angle)) throw new Error("A finite bend angle is required.");
  return deform(source, resolve(options, options.angle));
}
/** Use an open Three.js Curve, including splines. The selected source anchor retains its position and frame. */
export function deformAlongCurve(source: BufferGeometry, curve: Curve<Vector3>, options: CurveDeformationOptions = {}) {
  return deform(source, resolve(options), curve);
}
const basis = (axis: "X" | "Y" | "Z"): [Vector3, Vector3, Vector3] =>
  axis === "X"
    ? [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
    : axis === "Y"
      ? [new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)]
      : [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0)];

type Frame = { p: Vector3; q: Quaternion };
/** Maps local source positions; guide evaluation and source tessellation are deliberately independent. */
function createMapping(source: BufferGeometry, settings: ResolvedOptions, curve?: Curve<Vector3>) {
  const [a, b, c] = basis(settings.axis),
    bounds = new Box3().setFromBufferAttribute(source.getAttribute("position") as Float32BufferAttribute);
  const center = bounds.getCenter(new Vector3()),
    size = bounds.getSize(new Vector3()),
    length = Math.abs(size.dot(a));
  if (!(Number.isFinite(length) && length > 0)) throw new Error("The source axis must have positive length.");
  const start = center.dot(a) - length / 2,
    anchor = settings.anchor === "Start" ? 0 : settings.anchor === "End" ? 1 : 0.5;
  const anchorX = start + anchor * length,
    guideLengthTarget = settings.guideLength ?? length;
  let guideLength = guideLengthTarget;
  let evaluate: (s: number) => Frame;
  if (!curve) {
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
    const samples = settings.samples;
    const positions = Array.from({ length: samples + 1 }, (_, i) => curve.getPoint(i / samples).clone());
    if (positions.some((p) => !p.toArray().every(Number.isFinite))) throw new Error("Curve points must be finite.");
    const distances = [0];
    for (let i = 1; i <= samples; i++) {
      const d = positions[i].distanceTo(positions[i - 1]);
      if (!(d > 0)) throw new Error("Curve samples must be distinct; use a regular open curve.");
      distances.push(distances[i - 1] + d);
    }
    if (!Number.isFinite(distances[samples]) || positions[0].distanceTo(positions[samples]) <= distances[samples] * 1e-10)
      throw new Error("Curve must have finite length and open endpoints.");
    guideLength = settings.guideLength ?? distances[samples];
    const path = positions.map((p, i) => {
      const tangent = curve.getTangent(i / samples).clone();
      if (!tangent.toArray().every(Number.isFinite) || tangent.lengthSq() < 1e-20)
        throw new Error("Curve tangents must be finite and nonzero.");
      tangent.normalize();
      return { position: p, tangent };
    });
    for (let i = 1; i <= samples; i++)
      if (path[i].tangent.dot(path[i - 1].tangent) < -0.999)
        throw new Error("Curve has an unresolved tangent reversal; increase samples or remove the cusp.");
    const reference = Math.abs(path[0].tangent.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    const stations = transportFrames(
      path.map((p) => ({ ...p, position: p.position.clone().sub(positions[0]).divideScalar(distances[samples]) })),
      reference,
    );
    if (stations.length !== positions.length) throw new Error("Curve samples are too closely spaced.");
    const factor = guideLength / distances[samples];
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
    anchorPoint: anchorPoint.clone(),
  };
}

function deform(source: BufferGeometry, settings: ResolvedOptions, curve?: Curve<Vector3>) {
  validateSource(source);
  const mapping = createMapping(source, settings, curve);
  let geometry = source.clone();
  const sourcePosition = source.getAttribute("position");
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      Array.from({ length: sourcePosition.count * 3 }, (_, i) => sourcePosition.getComponent(Math.floor(i / 3), i % 3)),
      3,
    ),
  );
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const position = source.getAttribute("position"),
    output = geometry.getAttribute("position"),
    normals = geometry.getAttribute("normal");
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
    if (!Number.isFinite(determinant) || determinant <= 1e-6) folded++;
    const normal = normals ? new Vector3().fromBufferAttribute(normals, i) : new Vector3();
    if (Math.abs(determinant) > 1e-8) normal.applyMatrix3(matrix.invert().transpose()).normalize();
    else normal.set(0, 0, 0);
    transformed.push(...normal.toArray());
  }
  if (settings.normals === "Facet") {
    if (geometry.index) {
      const plain = geometry.toNonIndexed();
      geometry.dispose();
      geometry = plain;
    }
    geometry.computeVertexNormals();
  } else geometry.setAttribute("normal", new Float32BufferAttribute(transformed, 3));
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
  const finalPosition = geometry.getAttribute("position");
  for (let i = 0; i < finalPosition.count; i++) {
    if (![finalPosition.getX(i), finalPosition.getY(i), finalPosition.getZ(i)].every(Number.isFinite)) {
      geometry.dispose();
      throw new Error("Deformed positions exceed finite Float32 storage.");
    }
  }
  if (folded && settings.onInvalid === "throw") {
    geometry.dispose();
    throw new Error(`Deformation has ${folded} folded or collapsed vertex samples.`);
  }
  return { geometry, ...mapping, diagnostics: { minDet, folded, chordError, selfIntersectionsChecked: false as const } };
}

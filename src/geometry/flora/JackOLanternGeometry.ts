import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { triangulateRegion } from "../../modeling/mesh/TriangulateRegion";
import {
  createPumpkinStemGeometry,
  pumpkinStemMatrix,
  type PumpkinStemGeometryOptions,
  type PumpkinAssemblyOptions,
} from "./PumpkinGeometry";

export interface JackOLanternRindGeometryOptions {
  /** Overall radius. Positive; defaults to 1. The rind rests on y = 0. */
  rindRadius?: number;
  /** Vertical radius divided by horizontal radius. Positive; defaults to 0.82. */
  rindSquash?: number;
  /** Integer rib count, 0–16. Defaults to 8. */
  rindRibs?: number;
  /** Radial rib amplitude, 0–0.2. Defaults to 0.075. */
  rindRibDepth?: number;
  /** Fractional concentric inset, strictly between 0 and 1. Default 0.13.
   * Inner scale = 1 - rindThickness; this is NOT a constant normal offset or a world-unit distance. */
  rindThickness?: number;
  /** Uniform parameter-space subdivisions, 2–4. Default 4; each level quadruples skin triangles. */
  rindSubdivisions?: number;
  /** Scale of the fixed face in longitude/latitude space, 0.1–1.5. Default 1. */
  faceScale?: number;
}

export interface JackOLanternGeometryOptions
  extends JackOLanternRindGeometryOptions, PumpkinStemGeometryOptions, PumpkinAssemblyOptions {}

/**
 * A hollow ribbed rind with triangular eyes/nose and a toothed grin facing +Z.
 * Material groups: 0 outer skin, 1 inner skin, 2 cut walls. Returned geometry is non-indexed,
 * with flat normals. Skin UVs are spherical; each opening wall has its own unwrapped 0–1 strip.
 *
 * The face is triangulated in longitude/latitude space before wrapping. Corresponding inner and
 * outer boundaries are bridged to close the rind. This constructs openings; it does not subtract
 * from an existing mesh. The back seam and poles are closed explicitly. Caller owns the result.
 */
export function createJackOLanternRindGeometry({
  rindRadius = 1,
  rindSquash: squash = 0.82,
  rindRibs: ribs = 8,
  rindRibDepth: ribDepth = 0.075,
  rindThickness: thickness = 0.13,
  rindSubdivisions: detail = 4,
  faceScale = 1,
}: JackOLanternRindGeometryOptions = {}): BufferGeometry {
  if (!Number.isFinite(rindRadius) || rindRadius <= 0 || !Number.isFinite(squash) || squash <= 0) {
    throw new RangeError("JackOLanternGeometry: rindRadius and rindSquash must be finite and positive.");
  }
  if (!Number.isFinite(thickness) || thickness <= 0 || thickness >= 1)
    throw new RangeError("JackOLanternGeometry: rindThickness must be between 0 and 1, exclusive.");
  if (!Number.isInteger(ribs) || ribs < 0 || ribs > 16)
    throw new RangeError("JackOLanternGeometry: rindRibs must be an integer from 0 to 16.");
  if (!Number.isFinite(ribDepth) || ribDepth < 0 || ribDepth > 0.2)
    throw new RangeError("JackOLanternGeometry: rindRibDepth must be from 0 to 0.2.");
  if (!Number.isInteger(detail) || detail < 2 || detail > 4)
    throw new RangeError("JackOLanternGeometry: rindSubdivisions must be an integer from 2 to 4.");
  if (!Number.isFinite(faceScale) || faceScale < 0.1 || faceScale > 1.5)
    throw new RangeError("JackOLanternGeometry: faceScale must be from 0.1 to 1.5.");
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
  const { points, triangles, holes: rims } = triangulateRegion(outline, holes, { subdivisions: detail });
  const surface = (p: Vector2, scale: number): Vector3 => {
    const radial = Math.cos(p.y) * (1 + Math.cos((Math.PI / 2 - p.x) * ribs) * ribDepth);
    return new Vector3(
      Math.abs(p.x) === Math.PI || Math.abs(p.y) === Math.PI / 2 ? 0 : Math.sin(p.x) * radial * scale,
      squash + Math.sin(p.y) * squash * scale,
      Math.abs(p.y) === Math.PI / 2 ? 0 : Math.cos(p.x) * radial * scale,
    );
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
    for (const p of uv) uvs.push(p.x, p.y);
  };
  const group = (material: number, build: () => void) => {
    const start = positions.length / 3;
    build();
    geometry.addGroup(start, positions.length / 3 - start, material);
  };
  const skinUvs = points.map((p) => new Vector2(p.x / (2 * Math.PI) + 0.5, p.y / Math.PI + 0.5));
  group(0, () => {
    for (const [a, b, c] of triangles) emit(outer[a], outer[b], outer[c], [skinUvs[a], skinUvs[b], skinUvs[c]]);
  });
  group(1, () => {
    for (const [a, b, c] of triangles) emit(inner[c], inner[b], inner[a], [skinUvs[c], skinUvs[b], skinUvs[a]]);
  });
  group(2, () => {
    for (const ring of rims) {
      // Hole loops must run clockwise in parameter space: the surviving surface is to their left.
      const ordered = ShapeUtils.isClockWise(ring.map((i) => points[i])) ? ring : [...ring].reverse();
      const lengths = ordered.map((a, i) => outer[a].distanceTo(outer[ordered[(i + 1) % ordered.length]]));
      const perimeter = lengths.reduce((sum, length) => sum + length, 0);
      let distance = 0;
      for (let i = 0; i < ordered.length; i++) {
        const a = ordered[i],
          b = ordered[(i + 1) % ordered.length];
        // U follows arc length around this opening; V crosses the rind from outer to inner.
        const u0 = distance / perimeter,
          u1 = (distance + lengths[i]) / perimeter;
        emit(outer[b], outer[a], inner[a], [new Vector2(u1, 0), new Vector2(u0, 0), new Vector2(u0, 1)]);
        emit(outer[b], inner[a], inner[b], [new Vector2(u1, 0), new Vector2(u0, 1), new Vector2(u1, 1)]);
        distance += lengths[i];
      }
    }
  });
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.scale(rindRadius, rindRadius, rindRadius);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** One geometry with material groups 0 outer rind, 1 inner rind, 2 cut walls, 3 stem.
 * Stem dimensions are world units, matching PumpkinGeometry; they do not scale with rindRadius. */
export function createJackOLanternGeometry(options: JackOLanternGeometryOptions = {}): BufferGeometry {
  for (const name of [
    "stemTopRadius",
    "stemBottomRadius",
    "stemHeight",
    "stemSegments",
    "stemSink",
    "stemLean",
    "stemTwist",
  ] as const) {
    const value = options[name];
    if (value !== undefined && !Number.isFinite(value)) throw new RangeError(`JackOLanternGeometry: ${name} must be finite.`);
  }
  if (
    (options.stemTopRadius ?? 0.1) < 0 ||
    (options.stemBottomRadius ?? 0.14) <= 0 ||
    (options.stemHeight ?? 0.38) <= 0 ||
    !Number.isInteger(options.stemSegments ?? 5) ||
    (options.stemSegments ?? 5) < 3
  ) {
    throw new RangeError("JackOLanternGeometry: invalid stem dimensions or segment count.");
  }
  const rind = createJackOLanternRindGeometry(options);
  const sourceStem = createPumpkinStemGeometry(options);
  const stem = sourceStem.toNonIndexed();
  sourceStem.dispose();
  try {
    stem.applyMatrix4(pumpkinStemMatrix(options));
    const merged = mergeGeometries([rind, stem], false);
    if (!merged) throw new Error("JackOLanternGeometry: incompatible component attributes.");
    // mergeGeometries does not carry nested groups forward. Preserve the rind's three slots.
    for (const group of rind.groups) merged.addGroup(group.start, group.count, group.materialIndex);
    merged.addGroup(rind.getAttribute("position").count, stem.getAttribute("position").count, 3);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  } finally {
    rind.dispose();
    stem.dispose();
  }
}

/** A reusable geometry; lighting and materials belong to the consuming scene. */
export class JackOLanternGeometry extends BufferGeometry {
  readonly type = "JackOLanternGeometry";

  constructor(options: JackOLanternGeometryOptions = {}) {
    super();
    const geometry = createJackOLanternGeometry(options);
    this.copy(geometry);
    geometry.dispose();
    this.userData.parameters = { ...options };
  }
}

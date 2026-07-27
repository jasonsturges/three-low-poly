import { BufferGeometry, CylinderGeometry, Matrix4, SphereGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

//------------------------------
//  Rind
//------------------------------

export interface PumpkinRindGeometryOptions {
  rindRadius?: number;
  rindWidthSegments?: number;
  rindHeightSegments?: number;
  rindRibs?: number;
  rindRibDepth?: number;
  rindSquash?: number;
}

/** Builds only the ribbed rind, resting on the local XZ plane. */
export function createPumpkinRindGeometry({
  rindRadius = 1,
  rindWidthSegments = 16,
  rindHeightSegments = 8,
  rindRibs = 8,
  rindRibDepth = 0.075,
  rindSquash = 0.82,
}: PumpkinRindGeometryOptions = {}): BufferGeometry {
  const geometry = new SphereGeometry(
    rindRadius,
    rindWidthSegments,
    rindHeightSegments,
  );
  const position = geometry.getAttribute("position");

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const theta = Math.atan2(z, x);
    const rib = 1 + Math.cos(theta * rindRibs) * rindRibDepth;
    position.setX(i, x * rib);
    position.setZ(i, z * rib);
    position.setY(i, position.getY(i) * rindSquash);
  }

  position.needsUpdate = true;
  geometry.translate(0, rindRadius * rindSquash, 0);
  geometry.computeVertexNormals();
  return geometry;
}

//------------------------------
//  Stem
//------------------------------

export interface PumpkinStemGeometryOptions {
  stemTopRadius?: number;
  stemBottomRadius?: number;
  stemHeight?: number;
  stemSegments?: number;
}

/**
 * Builds a standalone stem: a cylinder whose base pivot sits at the local
 * origin, resting on the XZ plane. This factory has no knowledge of anything it
 * sits on — lean, seating, and placement are the assembly layer's concern.
 */
export function createPumpkinStemGeometry({
  stemTopRadius = 0.1,
  stemBottomRadius = 0.14,
  stemHeight = 0.38,
  stemSegments = 5,
}: PumpkinStemGeometryOptions = {}): BufferGeometry {
  const geometry = new CylinderGeometry(
    stemTopRadius,
    stemBottomRadius,
    stemHeight,
    stemSegments,
  );

  // Base pivot at the local origin: the stem's only responsibility is to sit its
  // bottom on the XZ plane. The anchor point the assembly layer translates into
  // place — nothing here rotates or seats the stem.
  geometry.translate(0, stemHeight / 2, 0);

  return geometry;
}

//------------------------------
//  Assembly
//------------------------------

export interface PumpkinAssemblyOptions {
  /**
   * Extra depth the stem base is buried past its natural seat on the rind, for a
   * rooted look. `0` rests the stem's footprint exactly on the surface. An
   * assembly-tier option: it belongs to neither part, only to how they join.
   *
   * Subject-prefixed (`stem…`) so the vocabulary stays unambiguous as the unit
   * gains its own lean/twist/sink at the placement tier above.
   */
  stemSink?: number;
  /**
   * Tilt (pitch) of the stem away from vertical, in radians, pivoting about its
   * seated base. `0` stands straight up.
   */
  stemLean?: number;
  /**
   * Yaw of the stem about the vertical axis, in radians. On its own it is
   * invisible for an axisymmetric stem; combined with `stemLean` it yaws the tilt
   * into a chosen compass direction.
   */
  stemTwist?: number;
}

/**
 * The stem's placement relative to the rind, as a single transform: seat the
 * base where the footprint rests on the rind (buried by `sink`), then lean and
 * twist it about that seated pivot.
 *
 * Positioning expressed once, so both mechanics can consume it — the
 * single-instance merge bakes it into the stem's vertices via `applyMatrix4`,
 * while the instanced patch composes it into each per-instance matrix. Applied
 * to a point the order is translate · Ry(twist) · Rz(lean): lean tips the stem,
 * twist yaws the tipped stem, and the translate lifts the pivot onto the rind.
 */
export function pumpkinStemMatrix({
  rindRadius = 1,
  rindSquash = 0.82,
  stemBottomRadius = 0.14,
  stemSink = 0.1,
  stemLean = 0,
  stemTwist = 0,
}: PumpkinGeometryOptions = {}): Matrix4 {
  // Seat height: where the stem's circular base makes full-ring contact with the
  // rind, treating the rind as its underlying ellipsoid (ribs vanish at the pole,
  // so they don't matter here). The rind's base sits at y = 0, so this is measured
  // from the ground, and it stays honest as rindRadius and rindSquash change.
  const halfHeight = rindRadius * rindSquash;
  const ratio = Math.min(stemBottomRadius / rindRadius, 1);
  const seatHeight = halfHeight * (1 + Math.sqrt(1 - ratio * ratio));

  // Seat, then orient about that seated base: bury by stemSink, yaw by stemTwist,
  // tip by stemLean. Applied to a point the order is translate · Ry · Rz.
  return new Matrix4()
    .makeTranslation(0, seatHeight - stemSink, 0)
    .multiply(new Matrix4().makeRotationY(stemTwist))
    .multiply(new Matrix4().makeRotationZ(stemLean));
}

//------------------------------
//  Geometry
//------------------------------

export interface PumpkinGeometryOptions
  extends PumpkinRindGeometryOptions,
    PumpkinStemGeometryOptions,
    PumpkinAssemblyOptions {}

/** Creates one grouped geometry: material 0 is rind, material 1 is stem. */
export function createPumpkinGeometry(
  options: PumpkinGeometryOptions = {},
): BufferGeometry {
  const rind = createPumpkinRindGeometry(options);
  const stem = createPumpkinStemGeometry(options);

  // Assembly owns placement, expressed once as pumpkinStemMatrix. Here the merge
  // mechanic bakes that transform into the stem's vertices; the instanced patch
  // composes the same matrix per instance. Neither part knows the other exists.
  stem.applyMatrix4(pumpkinStemMatrix(options));

  const merged = mergeGeometries([rind, stem], true);
  rind.dispose();
  stem.dispose();
  return merged;
}

/** A cohesive single-instance geometry, analogous to Three.js built-in geometries. */
export class PumpkinGeometry extends BufferGeometry {
  readonly type = "PumpkinGeometry";

  constructor(options: PumpkinGeometryOptions = {}) {
    super();
    const geometry = createPumpkinGeometry(options);
    this.copy(geometry);
    geometry.dispose();
    this.userData.parameters = { ...options };
  }
}

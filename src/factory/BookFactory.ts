import { BookGeometry } from "../geometry/books/BookGeometry";
import { InstancedMesh, Matrix4, Material, Quaternion, Vector3 } from "three";
import { createRandom, type RandomSource } from "../utils/Random";
import { logarithmicRandomMax, logarithmicRandomMin, randomFloat } from "../utils/RandomNumberUtils";

/** Default {@link BookGeometry} spine depth — stack layer height when books lay flat. */
const BOOK_UNIT_DEPTH = 0.5;

/** Lay a book flat on its cover (+90° X) so spine depth becomes stack height (Y+). */
const LAY_FLAT_X = Math.PI / 2;

interface RandomScaleOptions {
  scaleXMin?: number;
  scaleXMax?: number;
  scaleYMin?: number;
  scaleYMax?: number;
  scaleZMin?: number;
  scaleZMax?: number;
  source: RandomSource;
}

// Define a generic interface for book row options using scales
interface RowOfBooksByScalesOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  scales: Vector3[];
  /** Shared stream for shelf jitter — must be the same source that built `scales`. */
  source: RandomSource;
}

export interface RowOfBooksOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  count?: number;
  length?: number;
  scaleXMin?: number;
  scaleXMax?: number;
  scaleYMin?: number;
  scaleYMax?: number;
  scaleZMin?: number;
  scaleZMax?: number;
  /** Optional seed for reproducible layout. Omit for unique runtime. */
  seed?: number;
}

export interface StackOfBooksOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  /** Number of books in the stack. Defaults to `6`. */
  count?: number;
  scaleXMin?: number;
  scaleXMax?: number;
  scaleYMin?: number;
  scaleYMax?: number;
  scaleZMin?: number;
  scaleZMax?: number;
  /**
   * Max in-plane spin (world Y, radians) once the book is laid flat — a lazy
   * turn on the floor, not a tilt. Defaults to `0.55` (~31°).
   */
  yawMax?: number;
  /** Max horizontal drift per layer on X/Z. Defaults to `0.06`. */
  offsetMax?: number;
  /** Optional seed for reproducible layout. Omit for unique runtime. */
  seed?: number;
}

function randomScale({
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
  source,
}: RandomScaleOptions): Vector3 {
  return new Vector3(
    randomFloat(scaleXMin, scaleXMax, source),
    logarithmicRandomMax(0.25, scaleYMin, scaleYMax, source),
    logarithmicRandomMin(0.8, scaleZMin, scaleZMax, source),
  );
}

/**
 * Creates a row of books from the scales array of Vector3.
 */
export function rowOfBooksByScales<T extends Material>({
  coverMaterial,
  pagesMaterial,
  scales,
  source,
}: RowOfBooksByScalesOptions<T>): InstancedMesh {
  const geometry = new BookGeometry();
  const row = new InstancedMesh(geometry, [coverMaterial, pagesMaterial], scales.length);
  const matrix = new Matrix4();
  let currentZ = 0;

  for (let i = 0; i < scales.length; i++) {
    const scale = scales[i];
    const scaleMatrix = new Matrix4();
    scaleMatrix.makeScale(scale.x, scale.y, scale.z);
    matrix.identity();
    matrix.multiply(scaleMatrix);
    matrix.setPosition(0.01 + source.float(0, 0.1), 0, currentZ + scale.z * 0.5);
    row.setMatrixAt(i, matrix);
    currentZ += scale.z * 0.5;
  }
  return row;
}

/**
 * Creates a row of books with a given count.
 */
export function rowOfBooksByCount<T extends Material>({
  coverMaterial,
  pagesMaterial,
  count = 10,
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
  seed,
}: RowOfBooksOptions<T>): InstancedMesh {
  const source = createRandom(seed);
  const scales = Array.from({ length: count }, () =>
    randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax, source }),
  );

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales, source });
}

/**
 * Creates a row of books with a total length.
 */
export function rowOfBooksByLength<T extends Material>({
  coverMaterial,
  pagesMaterial,
  length = 10,
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
  seed,
}: RowOfBooksOptions<T>): InstancedMesh {
  const source = createRandom(seed);
  const scales: Vector3[] = [];
  let remainingZ = length;
  while (remainingZ > 0) {
    const scale = randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax, source });
    scale.z = Math.min(scale.z, remainingZ);
    scales.push(scale);
    remainingZ -= scale.z;
  }

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales, source });
}

/**
 * Stack of books on the floor — each book lays flat on its cover; count sets stack height.
 * Each layer is laid flat (+90° X), then given a small in-plane spin (world Y)
 * around the book's geometric center — not the spine corner.
 *
 * Local frame: bottom of the stack at Y=0, centered on X/Z.
 *
 * @example
 * ```ts
 * const stack = stackOfBooks({
 *   coverMaterial,
 *   pagesMaterial,
 *   count: 8,
 *   yawMax: 0.6,
 *   seed: 1337,
 * });
 * scene.add(stack);
 * ```
 */
export function stackOfBooks<T extends Material>({
  coverMaterial,
  pagesMaterial,
  count = 6,
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
  yawMax = 0.55,
  offsetMax = 0.06,
  seed,
}: StackOfBooksOptions<T>): InstancedMesh {
  const source = createRandom(seed);
  const geometry = new BookGeometry();
  const stack = new InstancedMesh(geometry, [coverMaterial, pagesMaterial], count);

  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const layFlatQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), LAY_FLAT_X);
  const spinQuat = new Quaternion();
  const scale = new Vector3();
  /** Upright geometry center — spin pivots here, not the bottom-front-spine corner. */
  const localCenter = new Vector3(
    geometry.width * 0.5,
    geometry.height * 0.5,
    -geometry.depth * 0.5,
  );
  const scaledCenter = new Vector3();
  const centerOffset = new Vector3();

  let currentY = 0;

  for (let i = 0; i < count; i++) {
    const layerScale = randomScale({
      scaleXMin,
      scaleXMax,
      scaleYMin,
      scaleYMax,
      scaleZMin,
      scaleZMax,
      source,
    });

    scale.copy(layerScale);
    const layerHeight = BOOK_UNIT_DEPTH * layerScale.z;

    spinQuat.setFromAxisAngle(new Vector3(0, 1, 0), source.float(-yawMax, yawMax));
    quaternion.copy(layFlatQuat).premultiply(spinQuat);

    scaledCenter.copy(localCenter).multiply(scale);
    centerOffset.copy(scaledCenter).applyQuaternion(quaternion);

    position.set(
      source.float(-offsetMax, offsetMax),
      currentY + layerHeight * 0.5,
      source.float(-offsetMax, offsetMax),
    );
    position.sub(centerOffset);

    matrix.compose(position, quaternion, scale);
    stack.setMatrixAt(i, matrix);

    currentY += layerHeight;
  }

  stack.instanceMatrix.needsUpdate = true;
  return stack;
}

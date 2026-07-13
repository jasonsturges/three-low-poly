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

export interface RowOfBooksByScalesOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  /** One scale per book. `z` is the thickness, and thickness is what fills the shelf. */
  scales: Vector3[];
  /** Shared stream for shelf jitter — must be the same source that built `scales`. */
  source: RandomSource;
}

interface BookScaleOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  scaleXMin?: number;
  scaleXMax?: number;
  scaleYMin?: number;
  scaleYMax?: number;
  scaleZMin?: number;
  scaleZMax?: number;
  /** Optional seed for reproducible layout. Omit for unique runtime. */
  seed?: number;
}

export interface RowOfBooksByCountOptions<T extends Material = Material> extends BookScaleOptions<T> {
  /** Number of books. The row is as long as they turn out. Defaults to `10`. */
  count?: number;
}

export interface RowOfBooksByLengthOptions<T extends Material = Material> extends BookScaleOptions<T> {
  /**
   * Shelf length to pack, in world units along Z. Defaults to `10`.
   *
   * Book count is an *output* of packing, never an input — see {@link rowOfBooksByLength}.
   */
  length?: number;
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
 * Row of books from scales you supply yourself — the escape hatch beneath
 * {@link rowOfBooksByCount} and {@link rowOfBooksByLength}, for when you want to choose every
 * book's size rather than have one drawn for you.
 *
 * Both of the other row factories are thin wrappers over this: they only differ in how they build
 * the `scales` array.
 *
 * Local frame: the row starts at Z=0 and grows along +Z.
 *
 * @example
 * ```ts
 * const source = createRandom(1337);
 * const scales = [
 *   new Vector3(0.5, 0.9, 0.3),  // z is the thickness
 *   new Vector3(0.5, 0.7, 0.2),
 *   new Vector3(0.6, 0.8, 0.4),
 * ];
 * const row = rowOfBooksByScales({ coverMaterial, pagesMaterial, scales, source });
 * ```
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
 * Row of books by count — the row is however long the books turn out.
 *
 * This is the **partially-filled shelf**, and it is the more common one: a real bookshelf is almost
 * never packed wall to wall. Ask for twelve books, get a run you then position on a shelf with space
 * beside it. Pinning `count` is safe here precisely *because* nothing else is pinned — the books
 * keep their natural thicknesses and the length simply falls out.
 *
 * Reach for {@link rowOfBooksByLength} instead when the shelf is the fixed thing and you want it
 * full.
 *
 * Local frame: the row starts at Z=0 and grows along +Z. Read the row's bounding box to place it —
 * its length is not knowable in advance.
 *
 * @example
 * ```ts
 * // Twelve books; the row is as long as they happen to be.
 * const row = rowOfBooksByCount({ coverMaterial, pagesMaterial, count: 12, seed: 1337 });
 * scene.add(row);
 *
 * // Same count, different seed -> a different length. That is the point.
 * //   seed 1337 -> 12 books spanning 2.00
 * //   seed 7    -> 12 books spanning 1.87
 * ```
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
}: RowOfBooksByCountOptions<T>): InstancedMesh {
  const source = createRandom(seed);
  const scales = Array.from({ length: count }, () =>
    randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax, source }),
  );

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales, source });
}

/**
 * Pack a shelf of a given length with plausibly-sized books.
 *
 * **Book count is an output, not an input.** Books touch — there is no gap to absorb slack — so
 * the only variable left to solve is thickness, and thickness has a physical floor (`scaleZMin`).
 * Pinning both `length` and `count` would drive the solver straight through that floor and produce
 * paper-thin books, so `count` is deliberately not accepted here. Ask for a shelf; get however many
 * books fit.
 *
 * Packing stops once the space left is thinner than the thinnest legal book, leaving a small gap at
 * the end — the way a real shelf does. A final book is trimmed to close the gap only when trimming
 * still leaves it above `scaleZMin`.
 *
 * This is the **shelf packed full**, wall to wall. For a partially-filled shelf — the more common
 * look — use {@link rowOfBooksByCount} and position the row within the shelf.
 *
 * Local frame: the row starts at Z=0 and grows along +Z.
 *
 * @example
 * ```ts
 * // Fill a 6-unit shelf. You do not say how many books; you find out.
 * const shelf = rowOfBooksByLength({ coverMaterial, pagesMaterial, length: 6, seed: 1337 });
 * scene.add(shelf);
 *
 * shelf.count; // 34 — an output. A different seed gives a different number.
 * ```
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
}: RowOfBooksByLengthOptions<T>): InstancedMesh {
  const source = createRandom(seed);
  const scales: Vector3[] = [];

  /** Shelf space the thinnest legal book occupies. A book is `BOOK_UNIT_DEPTH * scale.z` deep. */
  const minDepth = BOOK_UNIT_DEPTH * scaleZMin;
  let remaining = length;

  while (remaining >= minDepth) {
    const scale = randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax, source });

    if (BOOK_UNIT_DEPTH * scale.z > remaining) {
      // Trim the last book to close the gap. The loop guard means `remaining >= minDepth`,
      // so the trimmed book still clears `scaleZMin`.
      scale.z = remaining / BOOK_UNIT_DEPTH;
    }

    scales.push(scale);
    remaining -= BOOK_UNIT_DEPTH * scale.z;
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

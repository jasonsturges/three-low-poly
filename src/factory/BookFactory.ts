import { BookGeometry } from "../geometry/books/BookGeometry";
import { InstancedMesh, Matrix4, Vector3, Material } from "three";
import { logarithmicRandomMax, logarithmicRandomMin, randomFloat } from "../utils/RandomNumberUtils";

// Define an interface for the scaling options
interface RandomScaleOptions {
  scaleXMin?: number;
  scaleXMax?: number;
  scaleYMin?: number;
  scaleYMax?: number;
  scaleZMin?: number;
  scaleZMax?: number;
}

// Define a generic interface for book row options using scales
interface RowOfBooksByScalesOptions<T extends Material = Material> {
  coverMaterial: T;
  pagesMaterial: T;
  scales: Vector3[];
}

// Define a generic interface for book row options using count or length
interface RowOfBooksOptions<T extends Material = Material> {
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
}

function randomScale({
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
}: RandomScaleOptions = {}): Vector3 {
  return new Vector3(
    randomFloat(scaleXMin, scaleXMax),
    logarithmicRandomMax(0.25, scaleYMin, scaleYMax),
    logarithmicRandomMin(0.8, scaleZMin, scaleZMax),
  );
}

/**
 * Creates a row of books from the scales array of Vector3.
 */
export function rowOfBooksByScales<T extends Material>({
  coverMaterial,
  pagesMaterial,
  scales,
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
    matrix.setPosition(0.01 + Math.random() * 0.1, 0, currentZ + scale.z * 0.5);
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
}: RowOfBooksOptions<T>): InstancedMesh {
  const scales = Array.from({ length: count }, () =>
    randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax }),
  );

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales });
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
}: RowOfBooksOptions<T>): InstancedMesh {
  const scales: Vector3[] = [];
  let remainingZ = length;
  while (remainingZ > 0) {
    const scale = randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax });
    scale.z = Math.min(scale.z, remainingZ);
    scales.push(scale);
    remainingZ -= scale.z;
  }

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales });
}

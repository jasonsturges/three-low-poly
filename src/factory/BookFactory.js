import { BookGeometry } from "../geometry/books/BookGeometry.js";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { logarithmicRandomMax, logarithmicRandomMin, randomFloat } from "../utils/RandomNumberUtils.js";

function randomScale({
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
} = {}) {
  return new Vector3(
    randomFloat(scaleXMin, scaleXMax),
    logarithmicRandomMax(0.25, scaleYMin, scaleYMax),
    logarithmicRandomMin(0.8, scaleZMin, scaleZMax),
  );
}

/**
 * Creates a row of books from the scales array of Vector3.
 */
export function rowOfBooksByScales({ coverMaterial, pagesMaterial, scales = [] } = {}) {
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
export function rowOfBooksByCount({
  coverMaterial,
  pagesMaterial,
  count = 10,
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
} = {}) {
  const scales = Array.from({ length: count }, () =>
    randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax }),
  );

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales });
}

/**
 * Creates a row of books with a total length.
 */
export function rowOfBooksByLength({
  coverMaterial,
  pagesMaterial,
  length = 10,
  scaleXMin = 0.4,
  scaleXMax = 0.7,
  scaleYMin = 0.3,
  scaleYMax = 0.95,
  scaleZMin = 0.1,
  scaleZMax = 0.5,
} = {}) {
  const scales = [];
  let remainingZ = length;
  while (remainingZ > 0) {
    const scale = randomScale({ scaleXMin, scaleXMax, scaleYMin, scaleYMax, scaleZMin, scaleZMax });
    scale.z = Math.min(scale.z, remainingZ);
    scales.push(scale);
    remainingZ -= scale.z;
  }

  return rowOfBooksByScales({ coverMaterial, pagesMaterial, scales });
}

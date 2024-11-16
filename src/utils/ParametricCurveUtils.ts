import { ParametricCurve } from "../constants/ParametricCurve";
import { Vector2 } from "three";

/**
 * Function to create cubic Bezier curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createCubicCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the cubic curve
 *     new THREE.Vector2(1.5, 3),    // First control point (outward curve)
 *     new THREE.Vector2(1.5, 4),    // Second control point (outward curve)
 *     new THREE.Vector2(0.5, 5),    // End of the curve
 *     24,                           // Resolution of the quadratic curve
 * ),
 * ]
 * ```
 */
export const createCubicCurvePoints = (start: Vector2, control1: Vector2, control2: Vector2, end: Vector2, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.CUBIC(t, start.x, control1.x, control2.x, end.x);
    const y = ParametricCurve.CUBIC(t, start.y, control1.y, control2.y, end.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create damped curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createDampedCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the damped curve
 *     new THREE.Vector2(1.5, 5),    // End of the damped curve
 *     5,                            // Damping factor
 *     24,                           // Resolution of the damped curve
 *   ),
 * ]
 * ```
 */
export const createDampedCurvePoints = (start: Vector2, end: Vector2, damping: number, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.DAMPED(t, damping) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create exponential curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createExponentialCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the exponential curve
 *     new THREE.Vector2(1.5, 5),    // End of the exponential curve
 *     0.5,                          // Base of the exponential function
 *     2,                            // Exponential factor
 *     24                            // Resolution of the exponential curve
 *   ),
 * ]
 * ```
 */
export const createExponentialCurvePoints = (start: Vector2, end: Vector2, base: number, factor: number, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.EXPONENTIAL(t, base, factor) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create logarithmic curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createLogarithmicCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the logarithmic curve
 *     new THREE.Vector2(1.5, 5),    // End of the logarithmic curve
 *     0.5,                          // Base of the logarithmic function
 *     10,                           // Logarithmic factor
 *     24,                           // Resolution of the logarithmic curve
 *   ),
 * ]
 * ```
 */
export const createLogarithmicCurvePoints = (start: Vector2, end: Vector2, base: number, factor: number, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.LOGARITHMIC(t, base, factor) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create parabolic curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createParabolicCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start point
 *     new THREE.Vector2(0.5, 5),    // End point
 *     1,                            // Coefficient for t^2 (controls curvature)
 *     0,                            // Coefficient for t (linear component)
 *     0,                            // Constant term (vertical offset)
 *     24,                           // Resolution
 *   ),
 * ]
 * ```
 */
export const createParabolicCurvePoints = (start: Vector2, end: Vector2, a: number, b: number, c: number, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = a * t * t + b * t + c + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create quadratic Bezier curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createQuadraticCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the quadratic curve
 *     new THREE.Vector2(1.5, 5),    // Control point (outward curve)
 *     new THREE.Vector2(0.5, 5),    // End of the curve
 *     24,                           // Resolution of the quadratic curve
 *   ),
 * ]
 * ```
 */
export const createQuadraticCurvePoints = (start: Vector2, control: Vector2, end: Vector2, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.QUADRATIC(t, start.x, control.x, end.x);
    const y = ParametricCurve.QUADRATIC(t, start.y, control.y, end.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

/**
 * Function to create sigmoid curve points
 *
 * Example:
 * ```
 * const points = [
 *   ...ParametricCurveUtils.createSigmoidCurvePoints(
 *     new THREE.Vector2(0.5, 2),    // Start of the sigmoid curve
 *     new THREE.Vector2(1.5, 5),    // End of the sigmoid curve
 *     20,                           // Sigmoid steepness factor
 *     24,                           // Resolution of the sigmoid curve
 *   ),
 * ]
 */
export const createSigmoidCurvePoints = (start: Vector2, end: Vector2, a: number, segments = 24) => {
  let curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = ParametricCurve.SIGMOID(t, a) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

export const ParametricCurveUtils = {
  createCubicCurvePoints,
  createDampedCurvePoints,
  createExponentialCurvePoints,
  createLogarithmicCurvePoints,
  createParabolicCurvePoints,
  createQuadraticCurvePoints,
  createSigmoidCurvePoints,
};

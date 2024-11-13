import { ParametricCurve } from "../constants/ParametricCurve.js";
import { Vector2 } from "three";

// Function to create cubic Bezier curve points
export const createCubicCurvePoints = (start, control1, control2, end, resolution) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = ParametricCurve.CUBIC(t, start.x, control1.x, control2.x, end.x);
    const y = ParametricCurve.CUBIC(t, start.y, control1.y, control2.y, end.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create damped curve points
export const createDampedCurvePoints = (start, end, resolution, damping) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = ParametricCurve.DAMPED(t, damping) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create exponential curve points
export const createExponentialCurvePoints = (start, end, resolution, base, factor) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = ParametricCurve.EXPONENTIAL(t, base, factor) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create logarithmic curve points
export const createLogarithmicCurvePoints = (start, end, resolution, base, factor) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = ParametricCurve.LOGARITHMIC(t, base, factor) * (end.x - start.x) + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create parabolic curve points
export const createParabolicCurvePoints = (start, end, resolution, a, b, c) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = a * t * t + b * t + c + start.x;
    const y = start.y + t * (end.y - start.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create quadratic Bezier curve points
export const createQuadraticCurvePoints = (start, control, end, resolution) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = ParametricCurve.QUADRATIC(t, start.x, control.x, end.x);
    const y = ParametricCurve.QUADRATIC(t, start.y, control.y, end.y);
    curvePoints.push(new Vector2(x, y));
  }
  return curvePoints;
};

// Function to create sigmoid curve points
export const createSigmoidCurvePoints = (start, end, resolution, a) => {
  let curvePoints = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
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

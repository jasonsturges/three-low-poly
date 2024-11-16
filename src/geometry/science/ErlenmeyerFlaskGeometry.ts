import { BufferGeometry, LatheGeometry, Vector2 } from "three";
import {mergeBufferGeometries} from "three-stdlib";

export class ErlenmeyerFlaskGeometry extends BufferGeometry {
  constructor({
    flaskRadius = 1, //
    neckRadius = 0.3,
    height = 2.5,
    neckHeight = 1,
    radialSegments = 16,
  } = {}) {
    super();

    // Recalculating other radii to keep proportions consistent
    const points = [
      new Vector2(0, 0), // Bottom of the flask
      new Vector2(flaskRadius * 0.875, 0), // Flat base with minimum width
      new Vector2(flaskRadius, 0.1), // End of the rounded base
      new Vector2(neckRadius, height), // Start of the straight neck
      new Vector2(neckRadius, height + neckHeight), // End of the straight neck
      new Vector2(neckRadius * 1.1, height + neckHeight + 0.3), // Slight outward lip at the top
    ];

    const flaskGeometry = new LatheGeometry(points, radialSegments);

    this.copy(mergeBufferGeometries([flaskGeometry], false) as BufferGeometry);
  }
}

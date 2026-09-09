import { Vector3 } from "three";

/** Position and tangent for frame generation. Transport framing requires finite nonzero tangents. */
export interface PathPoint {
  position: Vector3;
  tangent: Vector3;
  /** Per-station section scale; overrides the sweep scale callback, including when zero. */
  scale?: number;
}

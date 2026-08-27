import { LatheGeometry, Vector2 } from "three";

export interface CorkGeometryOptions {
  /** Radius of the head, above the rim. Defaults to `0.5`. */
  topRadius?: number;
  /** Radius of the plug, seated into the neck. Defaults to `0.42`. */
  bottomRadius?: number;
  /** Overall height. Defaults to `0.4`. */
  height?: number;
  /** Circumference segments. Defaults to `16`. */
  radialSegments?: number;
}

/**
 * Cork stopper — a tapered plug: narrower at the bottom (into the neck), wider at the head (resting on the
 * rim), with a lightly rounded top. Local frame: bottom on Y=0.
 *
 * Sized and seated by {@link ApothecaryJar} against a vessel's rim, but usable on its own.
 */
export class CorkGeometry extends LatheGeometry {
  readonly height: number;

  constructor({ topRadius = 0.5, bottomRadius = 0.42, height = 0.4, radialSegments = 16 }: CorkGeometryOptions = {}) {
    super(
      [
        new Vector2(0, 0),
        new Vector2(bottomRadius, 0),
        new Vector2(topRadius, height * 0.85),
        new Vector2(topRadius * 0.88, height), // rounded-over top edge
        new Vector2(0, height),
      ],
      radialSegments,
    );
    this.height = height;
  }
}

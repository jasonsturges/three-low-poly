import { ExtrudeGeometry, Shape } from "three";

export interface WoodPicketGeometryOptions {
  /** Plank width. Defaults to `0.35`. */
  width?: number;
  /** Height to the shoulder, where the point begins. Defaults to `1.2`. */
  height?: number;
  /** Plank thickness. Defaults to `0.04`. */
  thickness?: number;
  /** Height of the triangular point above the shoulder. `0` gives a flat-topped plank. Defaults to `0.18`. */
  pointHeight?: number;
}

/**
 * Wooden fence picket — a plank with a pointed top, the white-picket-fence silhouette.
 *
 * Built as an extruded profile, so the top style lives in the outline rather than in the mesh: a
 * `pointHeight` of `0` gives a flat plank, and dog-ear or gothic tops are a change of profile.
 *
 * Unlike a fence post, a picket publishes no width profile — it is infill, not structure. Nothing
 * attaches to it, so nothing needs to ask how wide it is at a given height.
 *
 * Local frame: base at Y=0, centered on X and Z.
 *
 * @example
 * ```ts
 * const geometry = new WoodPicketGeometry({ width: 0.35, height: 1.2 });
 * const picket = new Mesh(geometry, woodMaterial);
 * scene.add(picket);
 * ```
 */
export class WoodPicketGeometry extends ExtrudeGeometry {
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly pointHeight: number;

  constructor({
    width = 0.35,
    height = 1.2,
    thickness = 0.04,
    pointHeight = 0.18,
  }: WoodPicketGeometryOptions = {}) {
    const half = width / 2;

    const profile = new Shape();
    profile.moveTo(-half, 0);
    profile.lineTo(half, 0);
    profile.lineTo(half, height);
    if (pointHeight > 0) {
      profile.lineTo(0, height + pointHeight);
    }
    profile.lineTo(-half, height);
    profile.closePath();

    super(profile, { depth: thickness, bevelEnabled: false });

    this.width = width;
    this.height = height;
    this.thickness = thickness;
    this.pointHeight = pointHeight;

    // Extrude runs +Z from the profile plane; center it on Z so the plank straddles the run.
    this.translate(0, 0, -thickness / 2);
  }

  /** Overall height, point included. */
  get totalHeight(): number {
    return this.height + this.pointHeight;
  }
}

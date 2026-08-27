import { LatheGeometry, Vector2 } from "three";

export interface BeakerGeometryOptions {
  /** Body radius. Defaults to `0.8`. */
  radius?: number;
  /** Overall height. Defaults to `1.6`. */
  height?: number;
  /** Pour-spout reach, as a fraction of the radius — how far the lip juts out. `0` is a plain cylinder. Defaults to `0.3`. */
  spout?: number;
  /** Angular half-width of the spout, in radians. Defaults to `0.5`. */
  spoutWidth?: number;
  /** Circumference segments — also the spout's smoothness. Defaults to `48`. */
  radialSegments?: number;
}

/**
 * Beaker — a straight-walled cylinder with a flat base and a pour spout.
 *
 * The body is a lathe of its silhouette (exposed as `.profile`, so the fill works like any vessel). The
 * SPOUT is not a lathe — it breaks rotational symmetry — so it is a post-pass: the top rings of the wall
 * are pushed radially outward over a narrow arc (centered on +Z), tapering to nothing below the lip and at
 * the arc's edges. Normals are recomputed afterward.
 *
 * Local frame: flat base on Y=0, opening up +Y, spout facing +Z.
 */
export class BeakerGeometry extends LatheGeometry {
  readonly profile: Vector2[];
  readonly radius: number;
  readonly height: number;

  constructor({ radius = 0.8, height = 1.6, spout = 0.3, spoutWidth = 0.5, radialSegments = 48 }: BeakerGeometryOptions = {}) {
    const chamfer = radius * 0.12;
    const silhouette = [
      new Vector2(0, 0),
      new Vector2(radius - chamfer, 0),
      new Vector2(radius, chamfer),
      new Vector2(radius, height * 0.8), // a ring partway up, so the spout flare has vertical resolution
      new Vector2(radius, height),
    ];
    super(silhouette, radialSegments);
    this.profile = silhouette;
    this.radius = radius;
    this.height = height;

    if (spout > 0) {
      const pos = this.getAttribute("position");
      const reach = spout * radius;
      const flareStart = height * 0.8;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (y < flareStart - 1e-6) continue;
        const r = Math.hypot(x, z);
        if (r < 1e-4) continue;
        // Angular distance from the spout centre (+Z, phi = atan2(x, z) = 0), wrapped.
        let d = Math.atan2(x, z);
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) > spoutWidth) continue;
        const across = 1 - Math.abs(d) / spoutWidth; // 1 at centre → 0 at the arc edges
        const smooth = across * across * (3 - 2 * across); // smoothstep
        const vertical = (y - flareStart) / (height - flareStart); // 0 at the ring → 1 at the rim
        const push = reach * smooth * vertical;
        pos.setX(i, x + (x / r) * push);
        pos.setZ(i, z + (z / r) * push);
      }
      pos.needsUpdate = true;
      this.computeVertexNormals();
    }
  }
}

import { Vector2 } from "three";
import { type GeometryBuffers, pushQuad, type Vec3 } from "./GeometryBuffers";

/** End extension and cut normal for a rectangular XZ member. */
export interface PrismEnd {
  /** Outward extension from this endpoint, along the member run. */
  reach?: number;
  /** Cut-plane normal in XZ plan; omitted normal gives a square end. */
  wall?: Vector2;
}

/**
 * Append a rectangular beam spanning two XZ points, between heights y0 and y1.
 * End normals shear the corners along the run to meet an angled surface.
 * Parallel cuts fall back to square ends; other shears are limited to twice the width.
 * Appends six quads; degenerate spans, nonpositive widths, and inverted heights add nothing.
 */
export function pushMiteredPrism(
  buffers: GeometryBuffers,
  from: Vector2,
  to: Vector2,
  width: number,
  y0: number,
  y1: number,
  near: PrismEnd = {},
  far: PrismEnd = {},
): void {
  const run = to.clone().sub(from);
  if (run.lengthSq() < 1e-12 || width <= 0 || y1 <= y0) return;
  const dir = run.clone().normalize();
  //  Across the member, in plan. The world equivalent of `dir × up`.
  const side = new Vector2(-dir.y, dir.x);
  const half = width / 2;

  const shear = (wall: Vector2 | undefined): number => {
    if (!wall) return 0;
    const grazing = dir.dot(wall);
    if (Math.abs(grazing) < 1e-6) return 0;
    return Math.min(Math.max((-half * side.dot(wall)) / grazing, -width * 2), width * 2);
  };

  const heel = from.clone().addScaledVector(dir, -(near.reach ?? 0));
  const seat = to.clone().addScaledVector(dir, far.reach ?? 0);
  const nearSkew = shear(near.wall);
  const farSkew = shear(far.wall);

  const a0 = heel.clone().addScaledVector(side, half).addScaledVector(dir, nearSkew);
  const a1 = heel.clone().addScaledVector(side, -half).addScaledVector(dir, -nearSkew);
  const b0 = seat.clone().addScaledVector(side, half).addScaledVector(dir, farSkew);
  const b1 = seat.clone().addScaledVector(side, -half).addScaledVector(dir, -farSkew);

  const lo = (p: Vector2): Vec3 => [p.x, y0, p.y];
  const hi = (p: Vector2): Vec3 => [p.x, y1, p.y];
  pushQuad(buffers, [lo(a0), lo(b0), hi(b0), hi(a0)], undefined);
  pushQuad(buffers, [lo(a1), hi(a1), hi(b1), lo(b1)], undefined);
  pushQuad(buffers, [lo(a0), lo(a1), lo(b1), lo(b0)], undefined);
  pushQuad(buffers, [hi(a0), hi(b0), hi(b1), hi(a1)], undefined);
  pushQuad(buffers, [lo(a0), hi(a0), hi(a1), lo(a1)], undefined);
  pushQuad(buffers, [lo(b0), lo(b1), hi(b1), hi(b0)], undefined);
}

/** A surface's normal in plan, from the direction it runs. */
export function wallNormal(tangent: Vector2): Vector2 {
  return new Vector2(tangent.y, -tangent.x);
}

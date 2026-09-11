import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { createCanvasText } from "./canvasText";
import type { TextSpriteOptions } from "./createTextSprite";

/** Same rasterization, sizing, and centered placement as a sprite label. */
export interface TextPlaneOptions extends TextSpriteOptions {}

/**
 * Text on a fixed XY plane, facing +Z. Rotate the mesh or parent it to orient the label.
 * Viewed head-on, its bounds and text placement match createTextSprite with the same options.
 * Depth testing is retained; transparent pixels do not write depth. The back displays mirrored text.
 * The caller owns the geometry, material, and material.map texture and must dispose all three.
 */
export function createTextPlane(
  text: string,
  { scale = 1, x = 0, y = 0, z = 0, ...textOptions }: TextPlaneOptions = {},
) {
  const { texture, aspectRatio } = createCanvasText(text, textOptions);
  const material = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.scale.set(scale * aspectRatio, scale, 1);
  mesh.position.set(x, y, z);
  return mesh;
}

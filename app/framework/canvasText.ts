import { CanvasTexture } from "three";

export interface CanvasTextOptions {
  font?: string;
  weight?: string;
  size?: number;
  color?: string;
}

/** Internal rasterization shared by sprite and plane labels. Each call owns a new texture. */
export function createCanvasText(
  text: string,
  { font = "Arial", weight = "normal", size = 96, color = "#ffffff" }: CanvasTextOptions = {},
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = `${weight} ${size}px ${font}`;

  const textMetrics = context.measureText(text);
  const textWidth = textMetrics.width;
  // Compatibility: sprite scale describes a 100px-high canvas, not tightly cropped glyph bounds.
  // Preserve the original width coercion, baseline, and empty space to keep existing labels identical.
  const textHeight = 100;

  canvas.width = textWidth;
  canvas.height = textHeight;

  context.font = `${weight} ${size}px ${font}`;
  context.fillStyle = color;
  context.textBaseline = "top";
  context.fillText(text, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { texture, aspectRatio: canvas.width / canvas.height };
}

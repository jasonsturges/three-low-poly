import { CanvasTexture, Sprite, SpriteMaterial } from "three";

export interface TextSpriteOptions {
  font?: string;
  weight?: string;
  size?: number;
  scale?: number;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
}

/** Wrap text as a billboard sprite (ported from legacy examples/utils/TextFactory). */
export function createTextSprite(
  text: string,
  {
    font = "Arial",
    weight = "normal",
    size = 96,
    scale = 1,
    color = "#ffffff",
    x = 0,
    y = 0,
    z = 0,
  }: TextSpriteOptions = {},
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = `${weight} ${size}px ${font}`;

  const textMetrics = context.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = 100;

  canvas.width = textWidth;
  canvas.height = textHeight;

  context.font = `${weight} ${size}px ${font}`;
  context.fillStyle = color;
  context.textBaseline = "top";
  context.fillText(text, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  const sprite = new Sprite(new SpriteMaterial({ map: texture }));
  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(scale * aspectRatio, scale, 1);
  sprite.position.set(x, y, z);

  return sprite;
}
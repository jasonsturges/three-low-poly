import { Sprite, SpriteMaterial } from "three";
import { createCanvasText, type CanvasTextOptions } from "./canvasText";

export interface TextSpriteOptions extends CanvasTextOptions {
  scale?: number;
  x?: number;
  y?: number;
  z?: number;
}

/** Wrap text as a billboard sprite (ported from legacy examples/utils/TextFactory). */
export function createTextSprite(
  text: string,
  { scale = 1, x = 0, y = 0, z = 0, ...textOptions }: TextSpriteOptions = {},
) {
  const { texture, aspectRatio } = createCanvasText(text, textOptions);
  const sprite = new Sprite(new SpriteMaterial({ map: texture }));
  sprite.scale.set(scale * aspectRatio, scale, 1);
  sprite.position.set(x, y, z);
  return sprite;
}

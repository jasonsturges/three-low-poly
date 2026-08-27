import { DirectionalLight, type Scene } from "three";
import { createLinearGradientTexture } from "three-low-poly";

export interface GradientBackdropOptions {
  /** Colour at the bottom of the view. Defaults to a slate blue-grey. */
  bottom?: number;
  /** Colour at the top of the view. Defaults to near-black. */
  top?: number;
  /** Back-rim light colour. Defaults to a cool sky blue. */
  rimColor?: number;
  /** Back-rim light intensity. Defaults to `0.7`. */
  rimIntensity?: number;
}

/**
 * The moody gradient wash the vessel examples share — a vertical slate → near-black background with a cool
 * back-rim light to catch glass edges against the dark. No ground grid, so the transparent vessels can be
 * inspected from any angle (including underneath); pair with `frameObject` to keep the subject grounded and
 * centred. Returns a disposer that restores the prior background and releases the texture and light.
 */
export function gradientBackdrop(scene: Scene, options: GradientBackdropOptions = {}): () => void {
  const { bottom = 0x28323f, top = 0x0c1016, rimColor = 0xaad2f0, rimIntensity = 0.7 } = options;

  const background = createLinearGradientTexture({
    stops: [
      { offset: 0, color: bottom }, // bottom of the view
      { offset: 1, color: top }, // top
    ],
  });
  const previous = scene.background;
  scene.background = background;

  const rim = new DirectionalLight(rimColor, rimIntensity);
  rim.position.set(5, 7, -9);
  scene.add(rim);

  return () => {
    scene.background = previous;
    scene.remove(rim);
    rim.dispose();
    background.dispose();
  };
}

import { Light } from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface LightFlickerAnimationOptions {
  light?: Light;
  minIntensity: number;
  maxIntensity: number;
  x: number;
  y: number;
  z: number;
  jitterX: number;
  jitterY: number;
  jitterZ: number;
}

/**
 * Create a light flicker animation that will randomly change the intensity and position of a light.
 * Effect resembles a flickering flame of candlelight.
 *
 * Example usage:
 * ```
 *    // Create a candle
 *    const candle = new Candle({
 *      height: 1,
 *      flameHeight: 0.25,
 *    });
 *    scene.add(candle);
 *
 *    // Create a point light
 *    const candleLight = new THREE.PointLight(0xffa500, 1, 5);
 *    scene.add(candleLight);
 *
 *    // Apply the animator to the light
 *    const lightAnimation = new LightFlickerAnimation({
 *      light: candleLight,
 *      maxIntensity: 2.2,
 *      x: candle.position.x,
 *      y: candle.position.y + 1 + 0.125, // height + half flame height
 *      z: candle.position.z,
 *    });
 *    animations.push(lightAnimation);
 *
 *    // Update the light animation in the render loop
 *    renderer.setAnimationLoop(() => {
 *      lightAnimation.update();
 *    });
 * ```
 */
export class LightFlickerAnimation {
  private light?: Light;
  public minIntensity: number;
  public maxIntensity: number;
  public x: number;
  public y: number;
  public z: number;
  public jitterX: number;
  public jitterY: number;
  public jitterZ: number;

  constructor({
    light,
    minIntensity = 0.8,
    maxIntensity = 1.2,
    x = 0,
    y = 0,
    z = 0,
    jitterX = 0.02,
    jitterY = 0.0,
    jitterZ = 0.02,
  }: Partial<LightFlickerAnimationOptions> = {}) {
    this.light = light;
    this.minIntensity = minIntensity;
    this.maxIntensity = maxIntensity;
    this.x = x;
    this.y = y;
    this.z = z;
    this.jitterX = jitterX;
    this.jitterY = jitterY;
    this.jitterZ = jitterZ;
  }

  public update(): void {
    if (this.light) {
      this.light.intensity = randomFloat(this.minIntensity, this.maxIntensity);
      this.light.position.x = Math.random() * this.jitterX - this.jitterX / 2 + this.x;
      this.light.position.y = Math.random() * this.jitterY - this.jitterY / 2 + this.y;
      this.light.position.z = Math.random() * this.jitterZ - this.jitterZ / 2 + this.z;
    }
  }
}

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

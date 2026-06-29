import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";

export interface GlowHaloOptions {
  /** Warm glow tint. Defaults to `0xffaa44`. */
  color?: ColorRepresentation;
  /** Billboard plane edge length in world units. Defaults to `1.2`. */
  size?: number;
  /** Base opacity before flicker scaling. Defaults to `0.75`. */
  opacity?: number;
}

function createGlowTexture(color: Color): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const hex = `#${color.getHexString()}`;
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, `${hex}ff`);
  gradient.addColorStop(0.25, `${hex}aa`);
  gradient.addColorStop(1, `${hex}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Soft additive glow billboard — reads as light without a {@link PointLight}.
 * Pair with {@link FlameFlickerEffect} for organic pulse, or use alone for
 * cheap mass lighting (many halos + bloom, no light-count limit).
 *
 * Call `faceCamera(camera.position)` each frame so the card faces the eye.
 */
export class GlowHalo extends Object3D {
  public readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private texture: CanvasTexture;
  private readonly baseColor: Color;

  constructor({
    color = 0xffaa44,
    size = 1.2,
    opacity = 0.75,
  }: GlowHaloOptions = {}) {
    super();

    this.baseColor = new Color(color);
    this.texture = createGlowTexture(this.baseColor);
    const material = new MeshBasicMaterial({
      map: this.texture,
      color: this.baseColor,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.mesh = new Mesh(new PlaneGeometry(size, size), material);
    this.add(this.mesh);
  }

  /** Billboard toward the camera (or any eye position). */
  faceCamera(eye: Vector3): void {
    this.mesh.lookAt(eye);
  }

  /** Set halo opacity (e.g. scaled each frame by {@link FlameFlickerEffect}). */
  setOpacity(opacity: number): void {
    this.mesh.material.opacity = opacity;
  }

  get opacity(): number {
    return this.mesh.material.opacity;
  }

  setColor(color: ColorRepresentation): void {
    this.baseColor.set(color);
    this.mesh.material.color.copy(this.baseColor);
    this.texture.dispose();
    this.texture = createGlowTexture(this.baseColor);
    this.mesh.material.map = this.texture;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }
}
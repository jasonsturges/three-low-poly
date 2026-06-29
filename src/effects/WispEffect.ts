import {
  Color,
  ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  SphereGeometry,
  Vector3,
} from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

export interface WispEffectOptions {
  /** Number of drifting wisps. Defaults to `3`. */
  count?: number;
  /** Horizontal spawn extent (world units, centered on the effect). Defaults to `16`. */
  width?: number;
  /** Depth spawn maximum (world units, from z = 0). Defaults to `8`. */
  depth?: number;
  /** Minimum spawn height. Defaults to `1`. */
  heightMin?: number;
  /** Maximum spawn height. Defaults to `2`. */
  heightMax?: number;
  /** Wisp tint. Defaults to `0x6dffb0` (portfolio graveyard). */
  color?: ColorRepresentation;
  /** Orb radius. Defaults to `0.08`. */
  orbRadius?: number;
  /** Horizontal drift radius (X). Defaults to `1.6`. */
  driftX?: number;
  /** Vertical drift radius (Y). Defaults to `0.3`. */
  driftY?: number;
  /** Depth drift radius (Z). Defaults to `1.6`. */
  driftZ?: number;
  /** Minimum motion speed multiplier. Defaults to `0.3`. */
  speedMin?: number;
  /** Maximum motion speed multiplier. Defaults to `0.7`. */
  speedMax?: number;
  /**
   * Attach a {@link PointLight} per wisp (keep `count` low).
   * Defaults to `true` to match the portfolio graveyard.
   */
  castLight?: boolean;
  /** Point light distance when `castLight`. Defaults to `6`. */
  lightDistance?: number;
  /** Point light decay when `castLight`. Defaults to `2`. */
  lightDecay?: number;
  /**
   * Light intensity = `lightIntensity + sin(t * lightPulseSpeed) * lightPulseAmplitude`.
   * Defaults to `2.5`.
   */
  lightIntensity?: number;
  /** Defaults to `1.2`. */
  lightPulseAmplitude?: number;
  /** Defaults to `3`. */
  lightPulseSpeed?: number;
}

interface WispInstance {
  orb: Mesh<SphereGeometry, MeshBasicMaterial>;
  home: Vector3;
  phase: number;
  speed: number;
  light?: PointLight;
}

/**
 * Will-o'-the-wisps drifting through a bounded volume — eerie green orbs that
 * bob around spawn points with a pulsing point light. Ported from the portfolio
 * graveyard scene.
 *
 * @example
 * ```ts
 * const wisps = new WispEffect({ count: 3 });
 * scene.add(wisps);
 * onFrame((dt) => wisps.update(dt));
 * ```
 */
export class WispEffect extends Object3D {
  private readonly wisps: WispInstance[] = [];
  private readonly orbGeometry: SphereGeometry;
  private readonly orbMaterial: MeshBasicMaterial;
  private readonly halfWidth: number;
  private readonly depth: number;
  private readonly heightMin: number;
  private readonly heightMax: number;
  private readonly driftX: number;
  private readonly driftY: number;
  private readonly driftZ: number;
  private readonly speedMin: number;
  private readonly speedMax: number;
  private readonly castLight: boolean;
  private readonly lightDistance: number;
  private readonly lightDecay: number;
  private readonly lightIntensity: number;
  private readonly lightPulseAmplitude: number;
  private readonly lightPulseSpeed: number;

  private elapsed = 0;

  constructor({
    count = 3,
    width = 16,
    depth = 8,
    heightMin = 1,
    heightMax = 2,
    color = 0x6dffb0,
    orbRadius = 0.08,
    driftX = 1.6,
    driftY = 0.3,
    driftZ = 1.6,
    speedMin = 0.3,
    speedMax = 0.7,
    castLight = true,
    lightDistance = 6,
    lightDecay = 2,
    lightIntensity = 2.5,
    lightPulseAmplitude = 1.2,
    lightPulseSpeed = 3,
  }: WispEffectOptions = {}) {
    super();

    this.halfWidth = width / 2;
    this.depth = depth;
    this.heightMin = heightMin;
    this.heightMax = heightMax;
    this.driftX = driftX;
    this.driftY = driftY;
    this.driftZ = driftZ;
    this.speedMin = speedMin;
    this.speedMax = speedMax;
    this.castLight = castLight;
    this.lightDistance = lightDistance;
    this.lightDecay = lightDecay;
    this.lightIntensity = lightIntensity;
    this.lightPulseAmplitude = lightPulseAmplitude;
    this.lightPulseSpeed = lightPulseSpeed;

    this.orbGeometry = new SphereGeometry(orbRadius, 8, 8);
    this.orbMaterial = new MeshBasicMaterial({ color: new Color(color), toneMapped: false });

    for (let i = 0; i < count; i++) {
      const home = new Vector3(
        randomFloat(-this.halfWidth, this.halfWidth),
        randomFloat(this.heightMin, this.heightMax),
        randomFloat(0, this.depth),
      );

      const orb = new Mesh(this.orbGeometry, this.orbMaterial);
      orb.position.copy(home);
      this.add(orb);

      let light: PointLight | undefined;
      if (castLight) {
        light = new PointLight(color, 3, this.lightDistance, this.lightDecay);
        orb.add(light);
      }

      this.wisps.push({
        orb,
        home,
        phase: randomFloat(0, Math.PI * 2),
        speed: randomFloat(this.speedMin, this.speedMax),
        light,
      });
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    for (const wisp of this.wisps) {
      const t = this.elapsed * wisp.speed + wisp.phase;
      wisp.orb.position.set(
        wisp.home.x + Math.sin(t) * this.driftX,
        wisp.home.y + Math.sin(t * 1.7) * this.driftY,
        wisp.home.z + Math.cos(t * 0.8) * this.driftZ,
      );

      if (wisp.light) {
        wisp.light.intensity =
          this.lightIntensity + Math.sin(t * this.lightPulseSpeed) * this.lightPulseAmplitude;
      }
    }
  }

  dispose(): void {
    this.orbGeometry.dispose();
    this.orbMaterial.dispose();
    for (const wisp of this.wisps) {
      wisp.light?.dispose();
    }
    this.clear();
    this.wisps.length = 0;
  }
}
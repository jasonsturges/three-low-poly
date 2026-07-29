import {
  AdditiveBlending,
  CircleGeometry,
  ColorRepresentation,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from "three";
import { createRadialGradientTexture, type RadialGradientStop } from "../textures/radialGradient";
import { lockToViewer } from "../utils/LockToViewer";

/** Cool blue-white haze: hot core, quick falloff, long faint tail. */
const DEFAULT_HALO_STOPS: RadialGradientStop[] = [
  { offset: 0, color: 0xd6e2ff, alpha: 0.48 },
  { offset: 0.24, color: 0x8baae6, alpha: 0.16 },
  { offset: 1, color: 0x5878be, alpha: 0 },
];

export interface FullMoonHaloOptions {
  /**
   * Halo extent as a multiple of the moon radius, measured at the moon's distance.
   * Defaults to `6.2`.
   */
  scale?: number;
  /** Overall halo opacity, scaling the stop alphas. Defaults to `0.72`. */
  opacity?: number;
  /** Radial falloff, core to rim. Any number of stops; defaults to a cool blue-white haze. */
  stops?: RadialGradientStop[];
}

export interface FullMoonOptions {
  /** Moon disc radius in world units. Defaults to `14`. */
  radius?: number;
  /**
   * Compass bearing in degrees, following the astronomical horizontal (alt-az) convention:
   * `0` is north (`-Z`), `90` east (`+X`), `180` south, `270` west — clockwise seen from
   * above. Defaults to `18`.
   */
  azimuth?: number;
  /**
   * Degrees above the horizon, `-90` to `90`. Defaults to `1.15` — a low moon just clear of
   * the horizon. Negative values sit below it.
   */
  elevation?: number;
  /**
   * Distance along the resolved direction. Defaults to `300`, and should sit inside the
   * camera's far plane.
   */
  distance?: number;
  /** Disc color. Defaults to `0xd8e3ff`. */
  color?: ColorRepresentation;
  /**
   * Disc edge count. Defaults to `64` — smooth, because a moon is the canonical round thing
   * and a chunky one reads as broken rather than stylized. Drop it for a deliberately faceted
   * moon; the disc is flat, so even a high count costs almost nothing.
   */
  segments?: number;
  /** Halo settings, or `false` for a bare disc. */
  halo?: FullMoonHaloOptions | false;
  /**
   * Whether `scene.fog` tints the moon. Defaults to `false`, so the disc stays crisp and reads
   * as a light source rather than a distant lit sphere.
   *
   * Because the moon rides at a fixed distance from the camera, enabling this yields a
   * *constant* haze wash rather than fog that varies as the viewer moves.
   */
  fog?: boolean;
}

/**
 * Horizontal (alt-az) angles to a unit direction. North is `-Z` and up is `+Y`, so east
 * resolves to `+X` (`east = north × up`) and bearings run clockwise viewed from above,
 * matching how sun and moon positions are actually specified.
 */
function directionFromAngles(azimuthDeg: number, elevationDeg: number): Vector3 {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  const horizontal = Math.cos(elevation);
  return new Vector3(horizontal * Math.sin(azimuth), Math.sin(elevation), -horizontal * Math.cos(azimuth));
}

/**
 * A **full moon** — a bright unlit disc wrapped in a soft additive haze, for the hazy ring you get
 * on a humid night.
 *
 * Deliberately the full-moon case, not a general moon. The haze is a *filled* additive gradient
 * sitting in front of the disc, so the moon can only ever read brighter than its surroundings; a
 * crescent, a new moon, or an eclipse would need an occluding terminator and a halo that follows the
 * lit limb, which is different machinery rather than another option.
 *
 * This is a **sky layer, not a skybox**: it owns the moon and nothing else, so it composes freely
 * with {@link StarField}, a scene background, or a dome of your own. Nothing here paints
 * the rest of the sky.
 *
 * **Placement** — `azimuth` and `elevation` are horizontal (alt-az) angles in degrees, the way sun
 * and moon positions are normally given: `0°` azimuth is north, `90°` east, and elevation climbs
 * from the horizon. The resolved unit vector is exposed as {@link direction} for aiming a
 * `DirectionalLight` along the same bearing.
 *
 * The moon is **viewer-relative — direction without location.** It pins itself to the active camera
 * every frame (see {@link lockToViewer}), so `scene.add(moon)` is the whole contract: there is no
 * per-frame call, and no amount of dollying brings the moon closer. `distance` is a render depth,
 * not a place. If you want a moon that can actually be reached, build geometry instead.
 *
 * **Both parts are flat and neither billboards.** The disc is unlit and uniformly colored, so a
 * sphere would be pixel-identical to a circle while costing an order of magnitude more triangles —
 * only the silhouette does any work. Both the disc and the haze are oriented once, perpendicular
 * to {@link direction}: because the moon rides the camera, the world-space line of sight to it is
 * always `direction`, so a fixed orientation is square-on at every orbit angle, exactly and with
 * no per-frame call.
 *
 * A `Sprite` is the trap here. Sprites align to the camera's view *plane*, not toward the camera's
 * *position*, so off screen-center the card tilts off the moon axis and dips behind the disc, which
 * then depth-occludes its own glow. Sprite cut-through scales with the sprite's own size versus its
 * clearance, not with distance from the camera.
 *
 * **Depth** — the disc is a normal depth-tested opaque mesh, so terrain and trees silhouette
 * against it. The halo is additive and writes no depth, so it never occludes what's in front.
 *
 * Uses only standard materials and a {@link createRadialGradientTexture}, so it renders under either
 * `WebGPURenderer` or `WebGLRenderer`, and constructs with no DOM.
 *
 * @example
 * ```typescript
 * const moon = new FullMoon({ radius: 14, azimuth: 18, elevation: 1.15 });
 * const stars = new StarField({ radius: 480, twinkle: true });
 * scene.add(moon, stars); // both pin themselves to the viewer — nothing per frame
 *
 * // Rake moonlight in from wherever the moon actually is.
 * const moonlight = new DirectionalLight(0xc8d8ff, 1.8);
 * moonlight.position.copy(moon.direction).multiplyScalar(40);
 * scene.add(moonlight);
 * ```
 *
 * Call {@link dispose} when removing the effect to free geometry, materials, and the halo texture.
 */
export class FullMoon extends Object3D {
  /** The moon body. Depth-tested and opaque, so scene geometry silhouettes against it. */
  readonly disc: Mesh<CircleGeometry, MeshBasicMaterial>;
  /** The additive haze card, or `undefined` when `halo` is `false`. */
  readonly halo?: Mesh<PlaneGeometry, MeshBasicMaterial>;
  /**
   * Unit direction resolved from `azimuth` / `elevation`, pointing from the viewer toward the
   * moon. Read-only output, not an input — copy it onto a `DirectionalLight` to rake moonlight
   * in from wherever the moon actually is.
   */
  readonly direction: Vector3;
  /** Distance from this object's origin to the disc center. */
  readonly distance: number;

  private readonly haloTexture?: DataTexture;

  constructor({
    radius = 14,
    azimuth = 18,
    elevation = 1.15,
    distance = 300,
    color = 0xd8e3ff,
    segments = 64,
    halo = {},
    fog = false,
  }: FullMoonOptions = {}) {
    super();

    const unit = directionFromAngles(azimuth, elevation);
    this.direction = unit;
    this.distance = distance;

    this.disc = new Mesh(
      new CircleGeometry(radius, segments),
      // Unlit and untone-mapped so the disc holds its brightness as a light source rather than
      // being graded down with the rest of the scene.
      new MeshBasicMaterial({ color, toneMapped: false, fog }),
    );
    this.disc.position.copy(unit).multiplyScalar(distance);
    this.disc.lookAt(0, 0, 0);
    this.add(this.disc);

    if (halo !== false) {
      const { scale = 6.2, opacity = 0.72, stops = DEFAULT_HALO_STOPS } = halo;

      // Nudge the card in front of the disc so it wins the depth test where the two overlap.
      // The offset is a fraction of radius rather than a fixed value so it holds at any size,
      // and the card is scaled by the same ratio to keep `scale` an honest angular measure.
      const haloDistance = Math.max(distance - radius * 0.05, Number.EPSILON);
      const size = radius * scale * (haloDistance / distance);

      this.haloTexture = createRadialGradientTexture({ stops });
      this.halo = new Mesh(
        new PlaneGeometry(size, size),
        new MeshBasicMaterial({
          map: this.haloTexture,
          blending: AdditiveBlending,
          transparent: true,
          opacity,
          depthWrite: false,
          toneMapped: false,
          fog,
        }),
      );
      this.halo.position.copy(unit).multiplyScalar(haloDistance);
      this.halo.lookAt(0, 0, 0);
      this.add(this.halo);
    }

    lockToViewer(this, this.halo ? [this.disc, this.halo] : [this.disc]);
  }

  /** Release GPU resources held by the moon. */
  dispose(): void {
    this.disc.geometry.dispose();
    this.disc.material.dispose();
    this.halo?.geometry.dispose();
    this.halo?.material.dispose();
    this.haloTexture?.dispose();
  }
}

import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { instancedBufferAttribute, instancedDynamicBufferAttribute } from "three/tsl";
import { PointsNodeMaterial } from "three/webgpu";
import { BurstGeometry, type BurstGeometryOptions } from "../geometry/shapes/BurstGeometry";
import { lockToViewer } from "../utils/LockToViewer";

/** How each star is turned to face the viewer. */
export type StarFieldOrientation = "points" | "radial";

export interface StarBurstShapeOptions extends BurstGeometryOptions {
  /** Number of burst points. Defaults to `4` — a diffraction-spike star. */
  points?: number;
  /** Extrusion depth (`orientation: "radial"` only — screen-aligned stars are flat). Defaults to `0.05`. */
  depth?: number;
}

export interface StarFieldOptions {
  /**
   * How each star faces the viewer. This also decides which size options apply.
   *
   * - `points` (default) — screen-aligned, so the field holds its orientation as the camera
   *   orbits. Only the geometry's **XY profile** is drawn; any Z extent is ignored. Sized with
   *   `pixelSizeMin` / `pixelSizeMax`. **Requires `WebGPURenderer`** (node material).
   * - `radial` — full 3D geometry rotated to face the shell center. Depth is real here, and stars
   *   shear as the camera moves, the way any world-space mesh does. Sized with `sizeMin` /
   *   `sizeMax` as angular extents. Uses only standard materials, so it runs on either renderer.
   */
  orientation?: StarFieldOrientation;
  /** Star shape used to build the default {@link BurstGeometry}. */
  burst?: StarBurstShapeOptions;
  /** Replace the star geometry entirely. Billboards use its XY profile; radial uses all of it. */
  geometry?: BufferGeometry;
  /**
   * Override the default field material. In `points` mode this must be a `PointsNodeMaterial` —
   * per-star position, size, and rotation are assigned onto it as node inputs.
   */
  material?: Material;
  /** Number of stars. Defaults to `1500`. */
  count?: number;
  /** Shell radius when `minRadius` / `maxRadius` are omitted. Defaults to `500`. */
  radius?: number;
  /** Inner shell radius. Defaults to `radius`. */
  minRadius?: number;
  /** Outer shell radius. Defaults to `radius`. */
  maxRadius?: number;
  /**
   * Minimum angular size (radians at 1 unit distance). Scaled by each star's shell distance
   * so apparent size stays consistent. Defaults to `0.008`.
   */
  sizeMin?: number;
  /** Maximum angular size. Defaults to `0.025`. */
  sizeMax?: number;
  /**
   * Star radius in logical (CSS) pixels — **`points` only**. Defaults to `4` / `14`.
   *
   * Screen-aligned stars are naturally sized in screen space, so there is no distance term at all:
   * a star is the same size wherever it sits in the shell, and nothing depends on the viewer being
   * at the shell's centre. The trade against angular sizing is that pixels are absolute, so stars
   * occupy a smaller fraction of a larger display.
   */
  pixelSizeMin?: number;
  /** Star radius in logical pixels, maximum — **`points` only**. Defaults to `14`. */
  pixelSizeMax?: number;
  /** Single color or palette; multiple entries pick a random color per star. */
  color?: ColorRepresentation | ColorRepresentation[];
  /**
   * Whether `scene.fog` tints the stars. Defaults to `false` — the shell sits far enough out
   * that any usable fog density saturates and flattens the whole field to fog color.
   *
   * Ignored when you supply your own `material`; set the flag on that material instead.
   */
  fog?: boolean;
  /** Enable pulsing brightness; call {@link StarField.update} each frame when `true`. */
  twinkle?: boolean;
  /**
   * Base star rotation, in radians. Defaults to `0`.
   *
   * Measured in screen space for `points` and world space for `radial` — the same knob means
   * different things, because a screen-aligned star re-aligns every frame and a radial star
   * does not.
   */
  rotation?: number;
  /**
   * Random rotation spread added per star, in radians. Defaults to `Math.PI * 2`.
   *
   * `0` aligns every star — with `points` that yields a coherent diffraction-spike field that
   * stays locked as the camera orbits. `2π` is fully random.
   */
  rotationJitter?: number;
}

const SHELL_CENTER = new Vector3(0, 0, 0);

function randomUnitVector(target: Vector3): Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = Math.PI * 2 * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  return target.set(sinPhi * Math.cos(theta), Math.cos(phi), sinPhi * Math.sin(theta));
}

function resolvePalette(color: ColorRepresentation | ColorRepresentation[]): Color[] {
  return (Array.isArray(color) ? color : [color]).map((entry) => new Color(entry));
}

/**
 * Largest radius in the XY plane. A screen-aligned star only ever draws the XY profile, so measuring
 * the full bounding sphere would let an extruded geometry's depth shrink the visible star.
 */
function profileRadiusXY(geometry: BufferGeometry): number {
  const position = geometry.getAttribute("position");
  let maxSquared = 0;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const squared = x * x + y * y;
    if (squared > maxSquared) maxSquared = squared;
  }
  return Math.sqrt(maxSquared) || 1;
}

/**
 * Procedural star field distributed on a spherical shell — intended as an infinite sky dome.
 *
 * The shell pins itself to the active camera every frame (see {@link lockToViewer}), so
 * `scene.add(stars)` is the whole contract — the field is unreachable no matter how far the
 * viewer travels, and there is no per-frame placement call. {@link update} remains necessary
 * only for `twinkle`.
 *
 * **Orientation** decides how stars are drawn *and* how they are sized — the two travel together,
 * because screen-aligned stars are naturally measured in screen space and real geometry in world
 * space:
 *
 * - `points` — screen-aligned via `PointsNodeMaterial`, with per-star position, size, and rotation
 *   supplied as instanced attributes. The field stays visually fixed as the camera orbits. Flat by
 *   construction: only the geometry's XY profile is used. Sized by `pixelSizeMin` / `pixelSizeMax`
 *   in logical pixels, with **no distance term at all**. Requires `WebGPURenderer`.
 * - `radial` — instanced 3D meshes rotated to face the shell center, drawn `DoubleSide` so stars
 *   stay visible from inside the shell. Sized by `sizeMin` / `sizeMax` as angular extents (radians
 *   at unit distance), scaled by each star's distance from the origin so stars look similar
 *   regardless of shell depth. That conversion assumes the viewer sits at the shell's centre, which
 *   {@link lockToViewer} guarantees. Uses only standard materials, so it runs on either renderer.
 *
 * Both render as a single instanced draw call, so the geometry you pass is a matter of looks rather
 * than cost.
 *
 * @example
 * ```typescript
 * const stars = new StarField({
 *   count: 2500,
 *   radius: 480,
 *   rotationJitter: 0, // every burst locked vertical on screen
 *   twinkle: true,
 * });
 *
 * scene.add(stars); // pins itself to the viewer — no placement call needed
 *
 * function animate() {
 *   stars.update(); // only for twinkle; a no-op when twinkle is false
 *   renderer.render(scene, camera);
 * }
 * ```
 *
 * Call {@link dispose} when removing the effect to free geometry and materials.
 */
// TODO: split the two strategies. `points` and `radial` share only *data* — the shell distribution
// (offsets, rotations, colours, twinkle phases) — while diverging on material, sizing units, twinkle
// write-back, and renderer requirement. Extract a `starShellDistribution()` returning plain arrays and
// give each strategy its own thin class. Payoff: the radial variant becomes importable WITHOUT
// `three/webgpu`, since only `points` needs a node material. Do not name the classes after their
// implementations (`StarFieldInstancedMesh`) — name them for what they are to a consumer.
export class StarField extends Object3D {
  readonly orientation: StarFieldOrientation;

  private readonly field: InstancedMesh;
  private readonly twinkle: boolean;
  private readonly baseScales?: Float32Array;
  private readonly twinklePhases?: Float32Array;
  /** Billboard scale attribute, rewritten each frame while twinkling. */
  private scaleAttribute?: InstancedBufferAttribute;
  private readonly dummy = new Object3D();

  constructor(options: StarFieldOptions = {}) {
    super();

    const {
      orientation = "points",
      count = 1500,
      radius = 500,
      minRadius = radius,
      maxRadius = radius,
      sizeMin = 0.008,
      sizeMax = 0.025,
      pixelSizeMin = 4,
      pixelSizeMax = 14,
      color = [0xffffff, 0xcad7ff, 0xfff4e0],
      fog = false,
      twinkle = false,
      rotation = 0,
      rotationJitter = Math.PI * 2,
      material,
      burst = {},
      geometry,
    } = options;

    this.orientation = orientation;
    this.frustumCulled = false;
    this.twinkle = twinkle;

    if (twinkle) {
      this.twinklePhases = new Float32Array(count);
      this.baseScales = new Float32Array(count);
    }

    const starGeometry =
      geometry ??
      new BurstGeometry({
        points: burst.points ?? 4,
        innerRadius: burst.innerRadius ?? 0.6,
        outerRadius: burst.outerRadius ?? 1.9,
        depth: burst.depth ?? 0.05,
      });

    const shared = {
      count,
      minRadius,
      maxRadius,
      sizeMin,
      sizeMax,
      pixelSizeMin,
      pixelSizeMax,
      color,
      fog,
      material,
      geometry: starGeometry,
      rotation,
      rotationJitter,
    };

    this.field =
      orientation === "points" ? this.createPointsField(shared) : this.createRadialField(shared);

    this.add(this.field);
    lockToViewer(this, [this.field]);
  }

  get mesh(): InstancedMesh {
    return this.field;
  }

  get geometry(): BufferGeometry {
    return this.field.geometry;
  }

  get material(): Material | Material[] {
    return this.field.material;
  }

  /** Release GPU resources held by the field. */
  dispose(): void {
    this.geometry.dispose();
    const materials = Array.isArray(this.material) ? this.material : [this.material];
    for (const entry of materials) entry.dispose();
  }

  /**
   * Animate twinkling. No-op when `twinkle` is `false`.
   *
   * Each star pulses on its own phase offset so the field twinkles out of sync. Billboards
   * rewrite the instanced scale attribute; radial stars rebuild each instance matrix.
   * Pass elapsed time in seconds (defaults to `performance.now()`).
   */
  update(elapsed = performance.now() * 0.001): void {
    if (!this.twinkle || !this.baseScales || !this.twinklePhases) return;

    if (this.orientation !== "radial") {
      const attribute = this.scaleAttribute;
      if (!attribute) return;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < this.baseScales.length; i++) {
        const pulse = 0.75 + 0.25 * Math.sin(elapsed * 2.5 + this.twinklePhases[i]);
        array[i] = this.baseScales[i] * pulse;
      }
      attribute.needsUpdate = true;
      return;
    }

    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    for (let i = 0; i < this.field.count; i++) {
      this.field.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);

      const pulse = 0.75 + 0.25 * Math.sin(elapsed * 2.5 + this.twinklePhases[i]);
      const s = this.baseScales[i] * pulse;
      this.dummy.position.copy(position);
      this.dummy.quaternion.copy(quaternion);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.field.setMatrixAt(i, this.dummy.matrix);
    }

    this.field.instanceMatrix.needsUpdate = true;
  }

  /**
   * EXPERIMENTAL — screen-aligned stars sized in **screen pixels** instead of world units.
   *
   * `PointsNodeMaterial` extends `SpriteNodeMaterial`, aligning the geometry's XY to the view plane
   * the same way, but scaling that offset by a pixel size and dividing by the viewport. A star is
   * therefore N pixels wherever it sits in the shell — no angular-to-world conversion, and no
   * dependence on where the viewer is.
   *
   * The geometry is normalized so its XY profile radius is `1`, which makes `pixelSize` mean an
   * honest pixel radius rather than a multiple of whatever the burst happened to measure.
   *
   * Note the dispatch in `PointsNodeMaterial.setupVertex`: the pixel path runs for objects that are
   * **not** `isPoints`, so an `InstancedMesh` is precisely what selects it.
   */
  private createPointsField({
    count,
    minRadius,
    maxRadius,
    pixelSizeMin,
    pixelSizeMax,
    color,
    fog,
    material,
    geometry,
    rotation,
    rotationJitter,
  }: {
    count: number;
    minRadius: number;
    maxRadius: number;
    pixelSizeMin: number;
    pixelSizeMax: number;
    color: ColorRepresentation | ColorRepresentation[];
    fog: boolean;
    material?: Material;
    geometry: BufferGeometry;
    rotation: number;
    rotationJitter: number;
  }): InstancedMesh {
    const palette = resolvePalette(color);
    const direction = new Vector3();
    const shellSpan = Math.max(maxRadius - minRadius, 0);

    const centered = geometry.clone();
    centered.center();
    const profile = profileRadiusXY(centered);
    const inverse = 1 / profile;
    centered.scale(inverse, inverse, inverse);

    const offsets = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const perStarColor = palette.length > 1;
    const colors = perStarColor ? new Float32Array(count * 3) : null;

    for (let i = 0; i < count; i++) {
      const distance = minRadius + Math.random() * shellSpan;
      randomUnitVector(direction).multiplyScalar(distance);
      offsets[i * 3] = direction.x;
      offsets[i * 3 + 1] = direction.y;
      offsets[i * 3 + 2] = direction.z;

      // No distance term — that is what makes shell depth irrelevant to apparent size.
      sizes[i] = pixelSizeMin + Math.random() * (pixelSizeMax - pixelSizeMin);
      rotations[i] = rotation + Math.random() * rotationJitter;

      if (this.baseScales) this.baseScales[i] = sizes[i];
      if (this.twinklePhases) this.twinklePhases[i] = Math.random() * Math.PI * 2;

      if (colors) {
        const starColor = palette[Math.floor(Math.random() * palette.length)]!;
        colors[i * 3] = starColor.r;
        colors[i * 3 + 1] = starColor.g;
        colors[i * 3 + 2] = starColor.b;
      }
    }

    const offsetAttribute = new InstancedBufferAttribute(offsets, 3);
    const sizeAttribute = new InstancedBufferAttribute(sizes, 1);
    const rotationAttribute = new InstancedBufferAttribute(rotations, 1);
    // `update()` rewrites this attribute for twinkle.
    this.scaleAttribute = sizeAttribute;

    const starMaterial =
      (material as PointsNodeMaterial | undefined) ??
      new PointsNodeMaterial({
        color: perStarColor ? 0xffffff : palette[0]!.getHex(),
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
        fog,
      });
    // Pure pixel size — no perspective falloff, so a star never shrinks with shell depth.
    starMaterial.sizeAttenuation = false;

    starMaterial.positionNode = instancedBufferAttribute(offsetAttribute, "vec3");
    starMaterial.rotationNode = instancedBufferAttribute(rotationAttribute, "float");

    // `sizeNode` is consumed as logical pixels — the material multiplies by `screenDPR` itself.
    if (this.twinkle) {
      sizeAttribute.setUsage(DynamicDrawUsage);
      starMaterial.sizeNode = instancedDynamicBufferAttribute(sizeAttribute, "float");
    } else {
      starMaterial.sizeNode = instancedBufferAttribute(sizeAttribute, "float");
    }
    if (colors) {
      starMaterial.colorNode = instancedBufferAttribute(new InstancedBufferAttribute(colors, 3), "vec3");
    }

    const mesh = new InstancedMesh(centered, starMaterial, count);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;

    const identity = new Matrix4();
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity);
    mesh.instanceMatrix.needsUpdate = true;

    return mesh;
  }

  /** Full 3D stars rotated to face the shell center. */
  private createRadialField({
    count,
    minRadius,
    maxRadius,
    sizeMin,
    sizeMax,
    color,
    fog,
    material,
    geometry,
    rotation,
    rotationJitter,
  }: {
    count: number;
    minRadius: number;
    maxRadius: number;
    sizeMin: number;
    sizeMax: number;
    color: ColorRepresentation | ColorRepresentation[];
    fog: boolean;
    material?: Material;
    geometry: BufferGeometry;
    rotation: number;
    rotationJitter: number;
  }): InstancedMesh {
    const palette = resolvePalette(color);
    const direction = new Vector3();
    const shellSpan = Math.max(maxRadius - minRadius, 0);

    const centered = geometry.clone();
    centered.center();
    centered.computeBoundingSphere();
    const meshRadius = centered.boundingSphere?.radius ?? 1;

    const starMaterial =
      material ??
      new MeshBasicMaterial({
        color: palette.length === 1 ? palette[0].getHex() : 0xffffff,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
        fog,
      });

    const mesh = new InstancedMesh(centered, starMaterial, count);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;

    for (let i = 0; i < count; i++) {
      const distance = minRadius + Math.random() * shellSpan;
      randomUnitVector(direction).multiplyScalar(distance);

      const angular = sizeMin + Math.random() * (sizeMax - sizeMin);
      const scale = (distance * angular) / meshRadius;
      if (this.baseScales) this.baseScales[i] = scale;
      if (this.twinklePhases) this.twinklePhases[i] = Math.random() * Math.PI * 2;

      this.dummy.position.copy(direction);
      this.dummy.lookAt(SHELL_CENTER);
      this.dummy.rotateZ(rotation + Math.random() * rotationJitter);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);

      if (palette.length > 1) {
        mesh.setColorAt(i, palette[Math.floor(Math.random() * palette.length)]);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return mesh;
  }
}

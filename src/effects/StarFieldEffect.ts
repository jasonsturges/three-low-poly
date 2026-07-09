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
import { SpriteNodeMaterial } from "three/webgpu";
import { BurstGeometry } from "../geometry/shapes/BurstGeometry";

/** How each star is turned to face the viewer. */
export type StarFieldOrientation = "billboard" | "radial";

export interface StarBurstShapeOptions {
  /** Burst ray count. Defaults to `4` point diffraction spike. */
  sides?: number;
  innerRadius?: number;
  outerRadius?: number;
  /** Extrusion depth (`orientation: "radial"` only — billboards are flat). Defaults to `0.05`. */
  depth?: number;
}

export interface StarFieldEffectOptions {
  /**
   * How each star faces the viewer.
   *
   * - `billboard` (default) — every star is screen-aligned, so the field holds its
   *   orientation as the camera orbits. Only the geometry's **XY profile** is drawn;
   *   any Z extent is ignored.
   * - `radial` — full 3D geometry rotated to face the shell center. Depth is real here,
   *   and stars shear as the camera moves, the way any world-space mesh does.
   */
  orientation?: StarFieldOrientation;
  /** Star shape used to build the default {@link BurstGeometry}. */
  burst?: StarBurstShapeOptions;
  /** Replace the star geometry entirely. Billboards use its XY profile; radial uses all of it. */
  geometry?: BufferGeometry;
  /**
   * Override the default field material. In `billboard` mode this must be a
   * `SpriteNodeMaterial` — per-star position, scale, and rotation are assigned onto it
   * as node inputs.
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
  /** Single color or palette; multiple entries pick a random color per star. */
  color?: ColorRepresentation | ColorRepresentation[];
  /** Enable pulsing brightness; call {@link StarFieldEffect.update} each frame when `true`. */
  twinkle?: boolean;
  /**
   * Base star rotation, in radians. Defaults to `0`.
   *
   * Measured in screen space for `billboard` and world space for `radial` — the same knob
   * means different things, because a billboard re-aligns every frame and a radial star
   * does not.
   */
  rotation?: number;
  /**
   * Random rotation spread added per star, in radians. Defaults to `Math.PI * 2`.
   *
   * `0` aligns every star — with `billboard` that yields a coherent diffraction-spike field
   * that stays locked as the camera orbits. `2π` is fully random.
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
 * Largest radius in the XY plane. A billboard only ever draws the XY profile, so measuring
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
 * Stars are placed in world space around the origin. To keep the shell centered on the
 * viewer, add this object to the **scene** (not the camera) and copy the camera position
 * every frame. Parenting to the camera is not supported: Three.js does not render
 * objects attached to the active camera.
 *
 * **Orientation** — the only axis that distinguishes how stars are drawn:
 *
 * - `billboard` — screen-aligned via `SpriteNodeMaterial`, with per-star position, scale,
 *   and rotation supplied as instanced attributes. The field stays visually fixed as the
 *   camera orbits. Flat by construction: only the geometry's XY profile is used.
 * - `radial` — instanced 3D meshes rotated to face the shell center, drawn `DoubleSide` so
 *   stars stay visible from inside the shell.
 *
 * Both orientations render as a single instanced draw call, so the geometry you pass is a
 * matter of looks rather than cost.
 *
 * **Sizing** — `sizeMin` / `sizeMax` are angular extents (radians at unit distance),
 * multiplied by each star's distance from the origin so stars look similar regardless
 * of shell depth (`minRadius`–`maxRadius`).
 *
 * @example
 * ```typescript
 * const stars = new StarFieldEffect({
 *   count: 2500,
 *   radius: 480,
 *   rotationJitter: 0, // every burst locked vertical on screen
 *   twinkle: true,
 * });
 *
 * scene.add(stars);
 *
 * function animate() {
 *   stars.position.copy(camera.position); // sky dome follows the viewer
 *   stars.update(); // no-op when twinkle is false
 *   renderer.render(scene, camera);
 * }
 * ```
 *
 * Call {@link dispose} when removing the effect to free geometry and materials.
 */
export class StarFieldEffect extends Object3D {
  readonly orientation: StarFieldOrientation;

  private readonly field: InstancedMesh;
  private readonly twinkle: boolean;
  private readonly baseScales?: Float32Array;
  private readonly twinklePhases?: Float32Array;
  /** Billboard scale attribute, rewritten each frame while twinkling. */
  private scaleAttribute?: InstancedBufferAttribute;
  private readonly dummy = new Object3D();

  constructor(options: StarFieldEffectOptions = {}) {
    super();

    const {
      orientation = "billboard",
      count = 1500,
      radius = 500,
      minRadius = radius,
      maxRadius = radius,
      sizeMin = 0.008,
      sizeMax = 0.025,
      color = [0xffffff, 0xcad7ff, 0xfff4e0],
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
        sides: burst.sides ?? 4,
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
      color,
      material,
      geometry: starGeometry,
      rotation,
      rotationJitter,
    };

    this.field =
      orientation === "billboard" ? this.createBillboardField(shared) : this.createRadialField(shared);

    this.add(this.field);
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

    if (this.orientation === "billboard") {
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
   * Screen-aligned stars. `SpriteNodeMaterial` builds its quad from the geometry's XY and
   * reads the sprite center from `positionNode` — it never consults `instanceMatrix` — so
   * every per-star value has to arrive as an instanced attribute.
   */
  private createBillboardField({
    count,
    minRadius,
    maxRadius,
    sizeMin,
    sizeMax,
    color,
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
    const meshRadius = profileRadiusXY(centered);

    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const rotations = new Float32Array(count);
    const perStarColor = palette.length > 1;
    const colors = perStarColor ? new Float32Array(count * 3) : null;

    for (let i = 0; i < count; i++) {
      const distance = minRadius + Math.random() * shellSpan;
      randomUnitVector(direction).multiplyScalar(distance);
      offsets[i * 3] = direction.x;
      offsets[i * 3 + 1] = direction.y;
      offsets[i * 3 + 2] = direction.z;

      const angular = sizeMin + Math.random() * (sizeMax - sizeMin);
      scales[i] = (distance * angular) / meshRadius;
      rotations[i] = rotation + Math.random() * rotationJitter;

      if (this.baseScales) this.baseScales[i] = scales[i];
      if (this.twinklePhases) this.twinklePhases[i] = Math.random() * Math.PI * 2;

      if (colors) {
        const starColor = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = starColor.r;
        colors[i * 3 + 1] = starColor.g;
        colors[i * 3 + 2] = starColor.b;
      }
    }

    const offsetAttribute = new InstancedBufferAttribute(offsets, 3);
    const scaleAttribute = new InstancedBufferAttribute(scales, 1);
    const rotationAttribute = new InstancedBufferAttribute(rotations, 1);
    this.scaleAttribute = scaleAttribute;

    const starMaterial =
      (material as SpriteNodeMaterial | undefined) ??
      new SpriteNodeMaterial({
        color: perStarColor ? 0xffffff : palette[0].getHex(),
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });

    starMaterial.positionNode = instancedBufferAttribute(offsetAttribute, "vec3");
    starMaterial.rotationNode = instancedBufferAttribute(rotationAttribute, "float");
    if (this.twinkle) {
      scaleAttribute.setUsage(DynamicDrawUsage);
      starMaterial.scaleNode = instancedDynamicBufferAttribute(scaleAttribute, "float");
    } else {
      starMaterial.scaleNode = instancedBufferAttribute(scaleAttribute, "float");
    }
    if (colors) {
      starMaterial.colorNode = instancedBufferAttribute(new InstancedBufferAttribute(colors, 3), "vec3");
    }

    const mesh = new InstancedMesh(centered, starMaterial, count);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;

    // The sprite path ignores instanceMatrix, but InstancedMesh allocates it zeroed —
    // leave identities behind so bounds and raycasts aren't looking at degenerate matrices.
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

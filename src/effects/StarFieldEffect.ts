import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ColorRepresentation,
  DoubleSide,
  InstancedMesh,
  Material,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Quaternion,
  Vector3,
} from "three";
import { BurstGeometry } from "../geometry/shapes/BurstGeometry";

export interface StarBurstShapeOptions {
  /** Burst ray count. Defaults to `4`. */
  sides?: number;
  innerRadius?: number;
  outerRadius?: number;
  /** Extrusion depth; keep small for flat starbursts. Defaults to `0.05`. */
  depth?: number;
}

export interface StarFieldEffectOptions {
  /**
   * Rendering style.
   *
   * - `points` (default) — billboard sprites with a procedural starburst texture
   *   (not the default square `Points` marker).
   * - `burst` — instanced {@link BurstGeometry} meshes oriented toward the shell center.
   */
  style?: "points" | "burst";
  /** Shape parameters for both styles; `burst` uses them for geometry, `points` for the sprite. */
  burst?: StarBurstShapeOptions;
  /** Override the burst mesh geometry (`style: "burst"` only). */
  geometry?: BufferGeometry;
  /** Override the default field material. */
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
}

const SHELL_CENTER = new Vector3(0, 0, 0);

/** Canvas sprite matching the burst profile (inner/outer star polygon). */
function createStarSpriteTexture(
  sides: number,
  innerRadius: number,
  outerRadius: number,
  size = 128,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const outer = size * 0.46;
  const inner = outer * (innerRadius / outerRadius);

  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < sides * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (sides * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

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
 * Procedural star field distributed on a spherical shell — intended as an infinite sky dome.
 *
 * Stars are placed in world space around the origin. To keep the shell centered on the
 * viewer, add this object to the **scene** (not the camera) and copy the camera position
 * every frame. Parenting to the camera is not supported: Three.js does not render
 * objects attached to the active camera.
 *
 * **Styles**
 *
 * - `points` — lightweight `Points` sprites using a canvas starburst texture.
 * - `burst` — instanced 3D starbursts ({@link BurstGeometry}) that face the shell center.
 *   Uses `DoubleSide` so stars remain visible when the camera sits inside the shell.
 *
 * **Sizing** — `sizeMin` / `sizeMax` are angular extents (radians at unit distance),
 * multiplied by each star's distance from the origin so stars look similar regardless
 * of shell depth (`minRadius`–`maxRadius`).
 *
 * **Rendering** — `frustumCulled` is disabled and materials use `depthWrite: false` so
 * the field draws reliably as a background layer. For per-star color variation in burst
 * mode, colors are written via `InstancedMesh.setColorAt`, not `vertexColors` on the
 * base material.
 *
 * @example
 * ```typescript
 * const stars = new StarFieldEffect({
 *   style: "burst",
 *   count: 2500,
 *   radius: 480,
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
 * Call {@link dispose} when removing the effect to free geometry, materials, and the
 * points sprite texture.
 */
export class StarFieldEffect extends Object3D {
  readonly style: "points" | "burst";

  private readonly field: Points | InstancedMesh;
  private readonly twinkle: boolean;
  private readonly baseSize: number;
  private readonly baseScales?: Float32Array;
  private readonly twinklePhases?: Float32Array;
  private spriteTexture?: CanvasTexture;
  private readonly dummy = new Object3D();

  constructor(options: StarFieldEffectOptions = {}) {
    super();

    this.style = options.style ?? "points";
    const {
      count = 1500,
      radius = 500,
      minRadius = radius,
      maxRadius = radius,
      sizeMin = 0.008,
      sizeMax = 0.025,
      color = [0xffffff, 0xcad7ff, 0xfff4e0],
      twinkle = false,
      material,
      burst = {},
      geometry,
    } = options;

    this.frustumCulled = false;
    this.twinkle = twinkle;
    const shellSpan = Math.max(maxRadius - minRadius, 0);
    const meanRadius = minRadius + shellSpan * 0.5;
    const meanAngular = (sizeMin + sizeMax) * 0.5;
    this.baseSize = meanRadius * meanAngular;

    const burstShape = {
      sides: burst.sides ?? 4,
      innerRadius: burst.innerRadius ?? 0.6,
      outerRadius: burst.outerRadius ?? 1.9,
      depth: burst.depth ?? 0.05,
    };

    if (this.style === "burst") {
      if (twinkle) {
        this.baseScales = new Float32Array(count);
        this.twinklePhases = new Float32Array(count);
      }
      const burstGeometry = geometry ?? new BurstGeometry(
        burstShape.sides,
        burstShape.innerRadius,
        burstShape.outerRadius,
        burstShape.depth,
      );
      this.field = this.createBurstField({
        count,
        minRadius,
        maxRadius,
        sizeMin,
        sizeMax,
        color,
        material,
        geometry: burstGeometry,
      });
    } else {
      this.field = this.createPointsField({
        count,
        minRadius,
        maxRadius,
        sizeMin,
        sizeMax,
        color,
        material,
        burstShape,
      });
    }

    this.add(this.field);
  }

  get drawable(): Points | InstancedMesh {
    return this.field;
  }

  get geometry(): BufferGeometry {
    return this.field.geometry;
  }

  get material(): Material | Material[] {
    return this.field.material;
  }

  /** Release GPU resources held by the field (and sprite texture, if any). */
  dispose(): void {
    this.geometry.dispose();
    const materials = Array.isArray(this.material) ? this.material : [this.material];
    for (const entry of materials) entry.dispose();
    this.spriteTexture?.dispose();
  }

  /**
   * Animate twinkling. No-op when `twinkle` is `false`.
   *
   * Points style modulates sprite size; burst style pulses each instance scale with
   * a per-star phase offset. Pass elapsed time in seconds (defaults to `performance.now()`).
   */
  update(elapsed = performance.now() * 0.001): void {
    if (!this.twinkle) return;

    if (this.field instanceof Points) {
      (this.field.material as PointsMaterial).size =
        this.baseSize * (0.8 + 0.2 * Math.sin(elapsed * 2.5));
      return;
    }

    if (!this.baseScales || !this.twinklePhases) return;

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

  private createPointsField({
    count,
    minRadius,
    maxRadius,
    sizeMin,
    sizeMax,
    color,
    material,
    burstShape,
  }: {
    count: number;
    minRadius: number;
    maxRadius: number;
    sizeMin: number;
    sizeMax: number;
    color: ColorRepresentation | ColorRepresentation[];
    material?: Material;
    burstShape: Required<StarBurstShapeOptions>;
  }): Points {
    const palette = resolvePalette(color);
    const direction = new Vector3();
    const shellSpan = Math.max(maxRadius - minRadius, 0);
    const meanRadius = minRadius + shellSpan * 0.5;
    const meanAngular = (sizeMin + sizeMax) / 2;
    const pointSize = meanRadius * meanAngular;

    const positions = new Float32Array(count * 3);
    const colors = palette.length > 1 ? new Float32Array(count * 3) : null;

    for (let i = 0; i < count; i++) {
      const distance = minRadius + Math.random() * shellSpan;
      randomUnitVector(direction).multiplyScalar(distance);
      positions[i * 3] = direction.x;
      positions[i * 3 + 1] = direction.y;
      positions[i * 3 + 2] = direction.z;

      if (colors) {
        const starColor = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = starColor.r;
        colors[i * 3 + 1] = starColor.g;
        colors[i * 3 + 2] = starColor.b;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    if (colors) geometry.setAttribute("color", new BufferAttribute(colors, 3));

    this.spriteTexture = createStarSpriteTexture(
      burstShape.sides!,
      burstShape.innerRadius!,
      burstShape.outerRadius!,
    );

    const starMaterial =
      material ??
      new PointsMaterial({
        map: this.spriteTexture,
        color: palette.length === 1 ? palette[0].getHex() : 0xffffff,
        size: pointSize,
        sizeAttenuation: true,
        transparent: true,
        alphaTest: 0.05,
        vertexColors: colors !== null,
        depthWrite: false,
        toneMapped: false,
      });

    const points = new Points(geometry, starMaterial);
    points.frustumCulled = false;
    points.renderOrder = 1;
    return points;
  }

  private createBurstField({
    count,
    minRadius,
    maxRadius,
    sizeMin,
    sizeMax,
    color,
    material,
    geometry,
  }: {
    count: number;
    minRadius: number;
    maxRadius: number;
    sizeMin: number;
    sizeMax: number;
    color: ColorRepresentation | ColorRepresentation[];
    material?: Material;
    geometry: BufferGeometry;
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
      this.dummy.rotateZ(Math.random() * Math.PI * 2);
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
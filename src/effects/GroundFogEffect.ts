import {
  CanvasTexture,
  Color,
  ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";
import { randomFloat } from "../utils/RandomNumberUtils";

type Edge = "n" | "s" | "e" | "w";

interface FogPatch {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  driftX: number;
  driftZ: number;
  spin: number;
  baseOpacity: number;
  phase: number;
  perimeter?: {
    edge: Edge;
    plotHalf: number;
    terrainHalf: number;
  };
}

export interface GroundFogEffectOptions {
  /** Interior mist cards scattered across the plot. Defaults to `14`. */
  count?: number;
  /** Half-extent of the interior scatter (world units). Defaults to `16`. */
  area?: number;
  /**
   * Large cards hugging the plot perimeter — softens terrain cutoffs on the
   * horizons opposite the camera. Defaults to `0` (interior only).
   */
  perimeterCount?: number;
  /** Half-extent of the inner bounded plot (fence, wall, scene edge, etc.). Defaults to `12`. */
  plotHalf?: number;
  /** Terrain half-extent; perimeter cards spill outward toward this edge. Defaults to `16`. */
  terrainHalf?: number;
  /**
   * Horizontal direction from plot center toward the camera. Perimeter patches
   * concentrate on the opposite edges. Defaults to `{ x: 1, z: 1 }`.
   */
  cameraFacing?: { x: number; z: number };
  /** Mist tint. Defaults to `#9fb0c8`. */
  color?: ColorRepresentation;
  /**
   * Sample ground height at world (x, z). Defaults to flat `y = 0`.
   * Portfolio graveyard uses undulating terrain via the same callback.
   */
  heightAt?: (x: number, z: number) => number;
}

/**
 * Creeping ground mist — soft horizontal cards drifting above the floor.
 * Interior patches wrap toroidally within `area`; optional perimeter patches
 * sit on/outside the fence on edges opposite the camera. One texture, one
 * `update(dt)` — perimeter is placement logic, not a separate effect.
 */
export class GroundFogEffect extends Object3D {
  private readonly patches: FogPatch[] = [];
  private readonly area: number;
  private readonly heightAt: (x: number, z: number) => number;
  private readonly texture: CanvasTexture;
  private elapsed = 0;

  constructor({
    count = 14,
    area = 16,
    perimeterCount = 0,
    plotHalf = 12,
    terrainHalf = 16,
    cameraFacing = { x: 1, z: 1 },
    color = "#9fb0c8",
    heightAt = () => 0,
  }: GroundFogEffectOptions = {}) {
    super();

    this.area = area;
    this.heightAt = heightAt;
    this.texture = createFogTexture(color);
    const focus = focusEdges(cameraFacing);

    for (let i = 0; i < count; i++) {
      this.patches.push(this.makeInteriorPatch());
    }
    for (let i = 0; i < perimeterCount; i++) {
      this.patches.push(this.makePerimeterPatch(plotHalf, terrainHalf, focus));
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    for (const patch of this.patches) {
      const mesh = patch.mesh;
      mesh.position.x += patch.driftX * dt;
      mesh.position.z += patch.driftZ * dt;
      mesh.rotation.z += patch.spin * dt;

      if (patch.perimeter) {
        constrainPerimeter(mesh, patch.perimeter.edge, patch.perimeter.plotHalf, patch.perimeter.terrainHalf);
        mesh.position.y =
          this.heightAt(mesh.position.x, mesh.position.z) +
          0.15 +
          0.35 * (0.5 + 0.5 * Math.sin(this.elapsed * 0.22 + patch.phase));
      } else {
        if (mesh.position.x > this.area) mesh.position.x -= this.area * 2;
        if (mesh.position.x < -this.area) mesh.position.x += this.area * 2;
        if (mesh.position.z > this.area) mesh.position.z -= this.area * 2;
        if (mesh.position.z < -this.area) mesh.position.z += this.area * 2;
      }

      mesh.material.opacity = patch.baseOpacity * (0.6 + 0.4 * Math.sin(this.elapsed * 0.3 + patch.phase));
    }
  }

  dispose(): void {
    this.texture.dispose();
    for (const patch of this.patches) {
      patch.mesh.geometry.dispose();
      patch.mesh.material.dispose();
    }
    this.patches.length = 0;
    this.clear();
  }

  private makeInteriorPatch(): FogPatch {
    const size = randomFloat(8, 16);
    const baseOpacity = randomFloat(0.05, 0.16);
    const x = randomFloat(-this.area, this.area);
    const z = randomFloat(-this.area, this.area);
    const mesh = this.makeMesh(size, baseOpacity);
    mesh.position.set(x, this.heightAt(x, z) + randomFloat(0.3, 1.2), z);
    this.add(mesh);

    return {
      mesh,
      driftX: randomFloat(-0.15, 0.15),
      driftZ: randomFloat(-0.15, 0.15),
      spin: randomFloat(-0.03, 0.03),
      baseOpacity,
      phase: randomFloat(0, Math.PI * 2),
    };
  }

  private makePerimeterPatch(plotHalf: number, terrainHalf: number, focus: Edge[]): FogPatch {
    const edge = pickEdge(focus);
    const { x, z, driftX, driftZ } = placeOnPerimeter(edge, plotHalf, terrainHalf);
    const size = randomFloat(18, 30);
    const baseOpacity = randomFloat(0.1, 0.26);
    const mesh = this.makeMesh(size, baseOpacity);
    mesh.position.set(x, this.heightAt(x, z) + randomFloat(0.15, 0.55), z);
    this.add(mesh);

    return {
      mesh,
      driftX,
      driftZ,
      spin: randomFloat(-0.012, 0.012),
      baseOpacity,
      phase: randomFloat(0, Math.PI * 2),
      perimeter: { edge, plotHalf, terrainHalf },
    };
  }

  private makeMesh(size: number, baseOpacity: number): Mesh<PlaneGeometry, MeshBasicMaterial> {
    const mesh = new Mesh(
      new PlaneGeometry(size, size),
      new MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        opacity: baseOpacity,
        toneMapped: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = randomFloat(0, Math.PI * 2);
    return mesh;
  }
}

function createFogTexture(color: ColorRepresentation): CanvasTexture {
  const hex = `#${new Color(color).getHexString()}`;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, `${hex}dd`);
  gradient.addColorStop(0.45, `${hex}66`);
  gradient.addColorStop(1, `${hex}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function focusEdges(facing: { x: number; z: number }): Edge[] {
  const edges: Edge[] = [];
  if (facing.z > 0) edges.push("n");
  if (facing.z < 0) edges.push("s");
  if (facing.x > 0) edges.push("w");
  if (facing.x < 0) edges.push("e");
  return edges.length ? edges : ["n", "w"];
}

function pickEdge(focus: Edge[]): Edge {
  if (focus.length === 1) return focus[0]!;
  const r = Math.random();
  const hasN = focus.includes("n");
  const hasW = focus.includes("w");
  if (hasN && hasW) return r < 0.58 ? "n" : "w";
  return focus[Math.floor(Math.random() * focus.length)]!;
}

function placeOnPerimeter(
  edge: Edge,
  plotHalf: number,
  terrainHalf: number,
): { x: number; z: number; driftX: number; driftZ: number } {
  const spill = randomFloat(0.6, terrainHalf - plotHalf - 1.5);
  const along = randomFloat(-terrainHalf + 3, terrainHalf - 3);
  const alongSpeed = randomFloat(0.03, 0.09) * (Math.random() < 0.5 ? -1 : 1);
  const outwardSpeed = randomFloat(0.01, 0.04);

  switch (edge) {
    case "n":
      return { x: along, z: -plotHalf - spill, driftX: alongSpeed, driftZ: -outwardSpeed };
    case "s":
      return { x: along, z: plotHalf + spill, driftX: -alongSpeed, driftZ: outwardSpeed };
    case "e":
      return { x: plotHalf + spill, z: along, driftX: outwardSpeed, driftZ: -alongSpeed };
    case "w":
      return { x: -plotHalf - spill, z: along, driftX: -outwardSpeed, driftZ: alongSpeed };
  }
}

function constrainPerimeter(mesh: Mesh, edge: Edge, plotHalf: number, terrainHalf: number): void {
  const margin = 3;
  const maxSpill = terrainHalf - 1;
  const { x, z } = mesh.position;

  switch (edge) {
    case "n": {
      mesh.position.z = clamp(z, -maxSpill, -plotHalf + 0.8);
      if (x < -maxSpill + margin) mesh.position.x = maxSpill - margin;
      if (x > maxSpill - margin) mesh.position.x = -maxSpill + margin;
      break;
    }
    case "s": {
      mesh.position.z = clamp(z, plotHalf - 0.8, maxSpill);
      if (x < -maxSpill + margin) mesh.position.x = maxSpill - margin;
      if (x > maxSpill - margin) mesh.position.x = -maxSpill + margin;
      break;
    }
    case "e": {
      mesh.position.x = clamp(x, plotHalf - 0.8, maxSpill);
      if (z < -maxSpill + margin) mesh.position.z = maxSpill - margin;
      if (z > maxSpill - margin) mesh.position.z = -maxSpill + margin;
      break;
    }
    case "w": {
      mesh.position.x = clamp(x, -maxSpill, -plotHalf + 0.8);
      if (z < -maxSpill + margin) mesh.position.z = maxSpill - margin;
      if (z > maxSpill - margin) mesh.position.z = -maxSpill + margin;
      break;
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  type ColorRepresentation,
} from "three";
import { mulberry32 } from "../utils/Random";

export interface FlagstoneFloorOptions {
  /** Extent across X. Defaults to `20`. */
  width?: number;
  /** Extent along Z. Defaults to `24`. */
  length?: number;
  /**
   * Nominal tile pitch. Defaults to `1.2`.
   *
   * The slab is the pitch MINUS the grout, so this stays the number you reason about and the gap eats into
   * it rather than adding to it — widen the joint and the floor keeps its coursing.
   */
  tile?: number;
  /** Gap between slabs — the grout line. Defaults to `0.06`. See the note on why it matters. */
  gap?: number;
  /** Slab thickness. Defaults to `0.12`. */
  thickness?: number;
  /** Base stone tint. Defaults to `#54524d`. */
  color?: ColorRepresentation;
  /**
   * How far each slab's tint wanders, 0–1. Defaults to `0.12`.
   *
   * **Lightness only.** Hue drift per slab reads as STAINED rather than weathered, which is the opposite of
   * what stone wants — a pumpkin patch wants the hue, a floor does not.
   */
  tintJitter?: number;
  /**
   * How far each slab settles or lifts, in world units. Defaults to `0.012`.
   *
   * Small numbers: this is a floor. Past about `0.05` it stops reading as worn and starts reading as broken.
   */
  heightJitter?: number;
  /**
   * Deterministic layout seed. Defaults to `1`.
   *
   * Stable across rebuilds — the floor is an address, not a reshuffle. Change this and you get a different
   * floor; change anything else and you get the same floor, altered.
   */
  seed?: number;
  /** Gloss, for catching lantern light. `1` is matte. Defaults to `0.72`. */
  roughness?: number;
}

/**
 * A flagstone floor — **individual slabs, not a textured plane.**
 *
 * **The grout lines are the point.** A long floor is read down its length, and the gaps between flags give
 * perspective lines converging toward the far end — depth for free, before any light is placed. A single
 * plane with a tiled texture cannot do that, and a vertex-coloured plane gives tint variation but still no
 * gaps, because the quads stay flush. Take `gap` to `0` and watch the floor collapse into one slab: the
 * converging lines vanish and so does the depth.
 *
 * Every slab also settles slightly and carries a whisper of yaw, so the surface is not perfectly flat and
 * the joints are not laser-straight. Both are seeded.
 *
 * **One `InstancedMesh`, one draw call, at any size.** Every slab is the same box; only its matrix and its
 * tint differ. That is the opposite call from {@link PlankFloor} and {@link HardwoodFloor}, whose boards are
 * each a different shape and therefore merge — identical items instance, differing items merge.
 *
 * Centred on the origin, with the slab tops on `y = 0` so anything standing on the floor sits at zero.
 *
 * @example
 * ```ts
 * const floor = new FlagstoneFloor({ width: 20, length: 26, tile: 1, gap: 0.06 });
 * scene.add(floor);
 * floor.tiles; // slabs laid
 * ```
 */
export class FlagstoneFloor extends InstancedMesh<BoxGeometry, MeshStandardMaterial> {
  /** Slabs laid. */
  readonly tiles: number;
  /** Slabs across X. */
  readonly columns: number;
  /** Slabs along Z. */
  readonly rows: number;

  constructor({
    width = 20,
    length = 24,
    tile = 1.2,
    gap = 0.06,
    thickness = 0.12,
    color = "#54524d",
    tintJitter = 0.12,
    heightJitter = 0.012,
    seed = 1,
    roughness = 0.72,
  }: FlagstoneFloorOptions = {}) {
    const columns = Math.max(1, Math.round(width / tile));
    const rows = Math.max(1, Math.round(length / tile));

    // The slab is the pitch minus the grout, so `tile` stays the thing you reason about.
    const slab = Math.max(0.05, tile - gap);

    const geometry = new BoxGeometry(slab, thickness, slab);
    // Top face on y = 0: the floor's surface is the datum everything else stands on.
    geometry.translate(0, -thickness / 2, 0);

    // White, so `setColorAt` lands the exact tint rather than multiplying into it — the same reason the
    // hexagonal tile factories and `PumpkinPatch` start white.
    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness,
      metalness: 0,
      flatShading: true,
    });

    super(geometry, material, columns * rows);

    this.tiles = columns * rows;
    this.columns = columns;
    this.rows = rows;
    this.receiveShadow = true;
    // Slabs lie flat on the ground and cast nothing worth the shadow pass.
    this.castShadow = false;

    const random = mulberry32(seed);
    const base = new Color(color);
    const tint = new Color();
    const placement = new Object3D();

    // Centred on the origin, like every other assembly here, rather than running from a caller-supplied
    // corner. The run's true extent is `columns * tile` — the rounding, not the request.
    const originX = -(columns * tile) / 2;
    const originZ = -(rows * tile) / 2;

    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        placement.position.set(
          originX + (column + 0.5) * tile,
          (random() - 0.5) * 2 * heightJitter,
          originZ + (row + 0.5) * tile,
        );
        // A whisper of yaw. Enough that the grout lines are not laser-straight, not enough to open corners
        // between neighbours.
        placement.rotation.y = (random() - 0.5) * 0.02;
        placement.updateMatrix();
        this.setMatrixAt(index, placement.matrix);

        tint.copy(base).offsetHSL(0, 0, (random() - 0.5) * 2 * tintJitter);
        this.setColorAt(index, tint);

        index++;
      }
    }

    this.instanceMatrix.needsUpdate = true;
    if (this.instanceColor) this.instanceColor.needsUpdate = true;
  }

  /** Releases the shared slab geometry and material. */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    super.dispose();
  }
}

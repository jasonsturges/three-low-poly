import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WallShape } from "../../shapes/WallShape";

/** Where a door hangs in this mausoleum, in the mausoleum's own coordinates. */
export interface MausoleumDoorway {
  /** Width of the opening. A door should be built slightly narrower, for clearance. */
  width: number;
  /** Height of the opening's straight sides, to the springing. */
  height: number;
  /** Rise of the arch. Equal to `width / 2` — a perfect semicircle. */
  archHeight: number;
  /** Centerline of the opening. */
  x: number;
  /** The sill. A door's `y = 0` sits here. */
  y: number;
  /**
   * The hinge plane — the wall's OUTER face. A door's `z = 0` (its front face, where the straps are
   * bolted and the pin stands) sits here.
   *
   * Not set back into the reveal. Strap hinges are mounted on the face you can reach, so the pin is
   * flush with the facade and the slab hangs behind it, filling the reveal. Sink the hinge plane into
   * the opening instead and the ironwork disappears into the jamb's shadow — which is exactly what a
   * real door does not do.
   */
  z: number;
}

const BUILDING_WIDTH = 4;
const BUILDING_HEIGHT = 3;
const BUILDING_DEPTH = 4;
const BASE_HEIGHT = 1;

/** Real walls, with real thickness — so the inside is a place you can look into, not a hollow illusion. */
const WALL = 0.3;
const CEILING = 0.2;

const HW = BUILDING_WIDTH / 2;
const HD = BUILDING_DEPTH / 2;
/** The interior clear span, wall face to wall face. */
const INNER_W = BUILDING_WIDTH - WALL * 2;
const INNER_D = BUILDING_DEPTH - WALL * 2;

/** The opening. `archHeight === width / 2`, so the arch is a true semicircle. */
const DOORWAY = { width: 1.24, height: 1.42, archHeight: 0.62 };

/**
 * A mausoleum — four stone walls, a peaked roof, and an arched doorway you can walk through.
 *
 * **The building is a SHELL, not a block.** Each wall is a slab with real thickness, so the interior is
 * genuine space with genuine inward-facing surfaces: open the doors and you look into a room, not at a
 * backface. That is the whole reason the walls cost four boxes instead of one.
 *
 * **The doorway is carved out of the front wall's OUTLINE, not punched through it as a hole.** A void
 * that reaches the floor is not a hole — `ExtrudeGeometry` would run a side wall along its bottom edge
 * and hand you a face lying across the threshold. Drawing the wall *around* the opening means that face
 * never exists, and the notch's side walls become the reveals: the jambs and the arch soffit. See
 * {@link WallShape}, which owns this distinction.
 *
 * The doorway's dimensions are published on {@link MausoleumGeometry.doorway} rather than left for a
 * caller to rediscover — hang a door by asking the building where its hinges go, the same way a fence
 * run asks a post how wide it is.
 *
 * Group indices:
 * 0. Base
 * 1. Building — walls and pillars
 * 2. Roof
 * 3. Interior — the floor and ceiling of the room inside
 *
 * @example
 * ```ts
 * const mausoleum = new Mausoleum();
 * const { width, height, archHeight, x, y, z } = mausoleum.geometry.doorway;
 *
 * const doors = createDoubleDoor({ width: width - 0.04, height: height - 0.02, archHeight: archHeight - 0.02 });
 * doors.position.set(x, y, z);
 * mausoleum.add(doors);
 * ```
 */
export class MausoleumGeometry extends BufferGeometry {
  /** Where a door hangs. See {@link MausoleumDoorway}. */
  readonly doorway: MausoleumDoorway = {
    ...DOORWAY,
    x: 0,
    y: BASE_HEIGHT,
    z: HD, // the facade — the hinges are bolted to the OUTSIDE of the wall
  };

  constructor() {
    super();

    // Base of the Mausoleum
    const baseGeometry = new BoxGeometry(5, BASE_HEIGHT, 5);
    baseGeometry.translate(0, BASE_HEIGHT / 2, 0);

    // The front wall carries the doorway. The opening is part of this outline — walk the floor, up the
    // jamb, over the arch, down the far jamb, on along the floor.
    const frontWall = new ExtrudeGeometry(
      new WallShape({ width: BUILDING_WIDTH, height: BUILDING_HEIGHT, doorway: DOORWAY }),
      { depth: WALL, bevelEnabled: false, curveSegments: 16 },
    );
    frontWall.translate(0, BASE_HEIGHT, HD - WALL);
    // ExtrudeGeometry is non-indexed and everything else here is indexed; mergeGeometries will not mix
    // the two, so give it a trivial index rather than flattening every box.
    frontWall.setIndex([...Array(frontWall.attributes.position.count).keys()]);

    // The other three walls are solid slabs. Left and right are inset to butt against front and back.
    const backWall = new BoxGeometry(BUILDING_WIDTH, BUILDING_HEIGHT, WALL);
    backWall.translate(0, BASE_HEIGHT + BUILDING_HEIGHT / 2, -HD + WALL / 2);

    const leftWall = new BoxGeometry(WALL, BUILDING_HEIGHT, INNER_D);
    leftWall.translate(-HW + WALL / 2, BASE_HEIGHT + BUILDING_HEIGHT / 2, 0);

    const rightWall = new BoxGeometry(WALL, BUILDING_HEIGHT, INNER_D);
    rightWall.translate(HW - WALL / 2, BASE_HEIGHT + BUILDING_HEIGHT / 2, 0);

    // Pillars
    const pillarPositions = [
      [-1.8, 2.3, -2.2],
      [1.8, 2.3, -2.2],
      [-1.8, 2.3, 2.2],
      [1.8, 2.3, 2.2],
    ];

    const pillars: BufferGeometry[] = [];
    pillarPositions.forEach((position) => {
      const pillar = new CylinderGeometry(0.2, 0.2, 3.5, 16);
      pillar.translate(position[0], position[1], position[2]);
      pillars.push(pillar);
    });

    // Roof (Peaked)
    const roofGeometry = new ConeGeometry(3.5, 2, 4);
    roofGeometry.rotateY(Math.PI / 4);
    roofGeometry.translate(0, 5, 0);

    // The room inside. The floor sits a hair proud of the base's top face rather than flush with it —
    // two coplanar faces at the same depth is a z-fight, and a millimetre is cheaper than a fix.
    const floor = new BoxGeometry(INNER_W, 0.1, INNER_D);
    floor.translate(0, BASE_HEIGHT - 0.05 + 0.001, 0);

    const ceiling = new BoxGeometry(INNER_W, CEILING, INNER_D);
    ceiling.translate(0, BASE_HEIGHT + BUILDING_HEIGHT - CEILING / 2, 0);

    this.copy(
      mergeGeometries(
        [
          baseGeometry,
          mergeGeometries(
            [frontWall, backWall, leftWall, rightWall, ...pillars],
            false,
          ) as BufferGeometry,
          roofGeometry,
          mergeGeometries([floor, ceiling], false) as BufferGeometry,
        ],
        true,
      ) as BufferGeometry,
    );
    this.computeVertexNormals();
  }
}

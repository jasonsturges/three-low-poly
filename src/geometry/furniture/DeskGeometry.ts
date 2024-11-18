import { BoxGeometry, BufferGeometry, LatheGeometry, Vector2 } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export class DeskGeometry extends BufferGeometry {
  constructor() {
    super();

    // Desk Surface
    const surfaceGeometry = new BoxGeometry(5, 0.3, 3);
    surfaceGeometry.translate(0, 3.15, 0);

    // Desk Legs (using lathe geometry)
    const points = [
      new Vector2(0.2, 0), //
      new Vector2(0.25, 0.5),
      new Vector2(0.15, 1.5),
      new Vector2(0.3, 3),
    ];

    const legLatheGeometry = new LatheGeometry(points, 32);

    // Create four legs for the desk
    const legPositions = [
      [2.1, 0, 1.1],
      [-2.1, 0, 1.1],
      [2.1, 0, -1.1],
      [-2.1, 0, -1.1],
    ];

    const legGeometry = mergeBufferGeometries(
      legPositions.map((position) => {
        const leg = legLatheGeometry.clone();
        leg.translate(position[0], position[1], position[2]);
        return leg;
      }),
    ) as BufferGeometry;

    this.copy(mergeBufferGeometries([surfaceGeometry, legGeometry], true) as BufferGeometry);
  }
}

import { BoxGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from "three";

class Desk extends Group {
  constructor() {
    super();

    // Desk Surface
    const surfaceGeometry = new BoxGeometry(5, 0.3, 3); // Width, Height (depth), Length
    const surfaceMaterial = new MeshStandardMaterial({ color: 0x8b5a2b }); // Wood-like color
    const deskSurface = new Mesh(surfaceGeometry, surfaceMaterial);
    deskSurface.position.set(0, 3.15, 0); // Raise the desk up

    // Desk Legs (using lathe geometry)
    const points = [];
    points.push(new Vector2(0.2, 0)); // Starting point at bottom (thin)
    points.push(new Vector2(0.25, 0.5)); // Curve outward
    points.push(new Vector2(0.15, 1.5)); // Narrow toward the middle
    points.push(new Vector2(0.3, 3)); // Final part toward the top

    const legGeometry = new LatheGeometry(points, 32);
    const legMaterial = new MeshStandardMaterial({ color: 0x4b3621 }); // Darker wood for legs

    // Create four legs for the desk
    const legPositions = [
      [2.2, 0, 1.2],  // Adjust Y to 0 so legs start at ground level
      [-2.2, 0, 1.2],
      [2.2, 0, -1.2],
      [-2.2, 0, -1.2],
    ];

    legPositions.forEach((position) => {
      const leg = new Mesh(legGeometry, legMaterial);
      leg.position.set(...position);
      this.add(leg);
    });

    this.add(deskSurface);
  }
}

export { Desk };

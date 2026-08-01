import GUI from "lil-gui";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { MoldingGeometry, type MoldingStyle } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Molding Run",
  description:
    "A molding run along a wall line — CROWN at the ceiling and BASE at the floor are the same geometry, " +
    "The corner is the point — every wall junction is cut on the plane bisecting it, so the run closes " +
    "exactly whatever the section, and a carpenter's compound miter is not needed because in world space " +
    "the cut is one plain vertical plane. Switch Walls to Room for a closed run with four inside corners " +
    "and no ends at all; Corner leaves it open, so you can see the square cut where a length dies into a " +
    "doorway. Segments is the low-poly knob on the section — drop it to 1 and every curved style collapses " +
    "to its chord, which is a chamfer.",
};

/** The room's inner corners, at a given height — the line where wall meets ceiling or floor. */
function cornerLine(width: number, depth: number, y: number): Vector3[] {
  const hw = width / 2;
  const hd = depth / 2;
  return [
    new Vector3(-hw, y, hd),
    new Vector3(-hw, y, -hd),
    new Vector3(hw, y, -hd),
    new Vector3(hw, y, hd),
  ];
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8f9aa6,
    cameraPosition: [4.2, 3.6, 4.6],
  });

  controls.target.set(0, 1.1, 0);
  controls.update();

  const params = {
    width: 4,
    depth: 3,
    wallHeight: 2.6,
    wallThickness: 0.12,
    walls: "corner" as "corner" | "room",
    style: "cove" as MoldingStyle,
    drop: 0.12,
    projection: 0.09,
    segments: 6,
    crown: true,
    base: true,
    baseDrop: 0.14,
    baseProjection: 0.03,
  };

  const plaster = new MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95, flatShading: true });
  const wall = new MeshStandardMaterial({ color: 0xb9b3a8, roughness: 1 });
  const floorMaterial = new MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.9 });

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const { width, depth, wallHeight, wallThickness } = params;
    const hw = width / 2;
    const hd = depth / 2;

    const floor = new Mesh(new BoxGeometry(width, 0.06, depth).translate(0, -0.03, 0), floorMaterial);
    floor.receiveShadow = true;
    stage.add(floor);

    const closed = params.walls === "room";

    // Walls stand OUTSIDE the corner line, so the molding's back sits flush against them.
    //
    // The back and front walls RUN THROUGH and the side walls BUTT into them — a lap, and the same
    // choice a door makes with its stiles and rails. A run-through wall only laps where there IS a side
    // wall to lap: with one side open, extending it there leaves it hanging past the floor by exactly
    // the wall's thickness.
    const throughX0 = -hw - wallThickness;
    const throughX1 = closed ? hw + wallThickness : hw;
    const through = (z: number) =>
      new Mesh(
        new BoxGeometry(throughX1 - throughX0, wallHeight, wallThickness).translate(
          (throughX0 + throughX1) / 2,
          wallHeight / 2,
          z,
        ),
        wall,
      );
    const side = (x: number) =>
      new Mesh(
        new BoxGeometry(wallThickness, wallHeight, depth).translate(x, wallHeight / 2, 0),
        wall,
      );

    stage.add(through(-hd - wallThickness / 2), side(-hw - wallThickness / 2));
    if (closed) stage.add(through(hd + wallThickness / 2), side(hw + wallThickness / 2));

    // Open runs use three of the four corners — one inside corner between two walls, with both ends
    // stopping in mid-air where a doorway would be.
    const corners = (y: number) => {
      const line = cornerLine(width, depth, y);
      return closed ? line : line.slice(0, 3);
    };

    if (params.crown) {
      stage.add(
        new Mesh(
          new MoldingGeometry({
            points: corners(params.wallHeight),
            closed,
            run: "crown",
            style: params.style,
            drop: params.drop,
            projection: params.projection,
            segments: params.segments,
          }),
          plaster,
        ),
      );
    }

    if (params.base) {
      stage.add(
        new Mesh(
          new MoldingGeometry({
            points: corners(0),
            closed,
            // The same section, standing up from the floor instead of hanging from the ceiling.
            run: "base",
            style: params.style,
            drop: params.baseDrop,
            projection: params.baseProjection,
            segments: params.segments,
          }),
          plaster,
        ),
      );
    }

    for (const child of stage.children) {
      if (child instanceof Mesh) child.castShadow = true;
    }
  };
  rebuild();

  const gui = new GUI();
  gui.title("Molding Run");

  const section = gui.addFolder("Section");
  section
    .add(params, "style", {
      "Cove (cavetto)": "cove",
      Ovolo: "ovolo",
      Chamfer: "chamfer",
      "Ogee (cyma recta)": "ogee",
      "Cyma (reversa)": "cyma",
      Scotia: "scotia",
      "Fillet (plain band)": "fillet",
      "Step (corbel)": "step",
    })
    .name("Profile")
    .onChange(rebuild);
  // The low-poly knob. At 1 every curved style becomes its own chord — which is the chamfer.
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.open();

  const crown = gui.addFolder("Crown");
  crown.add(params, "crown").name("Show").onChange(rebuild);
  // The two numbers molding is sold in: how far down the wall, and how far out along the ceiling.
  crown.add(params, "drop", 0.02, 0.4, 0.005).name("Drop").onChange(rebuild);
  crown.add(params, "projection", 0.02, 0.4, 0.005).name("Projection").onChange(rebuild);
  crown.open();

  const base = gui.addFolder("Base");
  base.add(params, "base").name("Show").onChange(rebuild);
  // A baseboard is tall and shallow where a cornice is deep — same section, different proportions.
  base.add(params, "baseDrop", 0.02, 0.4, 0.005).name("Height").onChange(rebuild);
  base.add(params, "baseProjection", 0.01, 0.2, 0.005).name("Projection").onChange(rebuild);
  base.open();

  const room = gui.addFolder("Room");
  room
    .add(params, "walls", { "Corner (open run)": "corner", "Room (closed run)": "room" })
    .name("Walls")
    .onChange(rebuild);
  room.add(params, "width", 2, 6, 0.1).name("Width").onChange(rebuild);
  room.add(params, "depth", 2, 6, 0.1).name("Depth").onChange(rebuild);
  room.add(params, "wallHeight", 1.8, 3.6, 0.05).name("Wall Height").onChange(rebuild);
  room.open();

  return () => {
    gui.destroy();
    clear();
    plaster.dispose();
    wall.dispose();
    floorMaterial.dispose();
    dispose();
  };
}

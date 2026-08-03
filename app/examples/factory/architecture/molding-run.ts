import GUI from "lil-gui";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import {
  MoldingGeometry,
  surfaceProfile,
  type MoldingStyle,
  type SurfaceStyle,
} from "three-low-poly";
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
    "to its chord, which is a chamfer. Turn on the CHAIR RAIL and PICTURE RAIL for the other section " +
    "family: those sit on a single wall face rather than bridging a corner, and are swept and mitered by " +
    "the same class — the run never sees which family its profile came from.",
};

//------------------------------
//  Where a run goes
//------------------------------
//
//  CROWN         wall meets ceiling. Corner section, hanging down.
//  PICTURE RAIL  high on the wall. Hooks hang from it, which is why the plaster above is often a
//                different color. Surface section.
//  CHAIR RAIL    ~900mm, at the back of a chair. Surface section. DADO RAIL is the same thing named for
//                the paneled zone beneath it.
//  BASE          wall meets floor. Corner section, standing up. Skirting, in the UK.
//
//  A rail's height on the wall is a DESIGN decision, not a derived one — a chair rail sits where a chair
//  hits, a picture rail within reach of a hook — which is why it is the caller's number.

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

    // The other family: sections that sit on ONE wall face.
    chairRail: true,
    chairStyle: "astragal" as SurfaceStyle,
    chairAt: 0.9,
    chairHeight: 0.08,
    chairProjection: 0.03,

    pictureRail: false,
    // The one section that is genuinely picture-rail vocabulary — its undercut is what a hook catches on.
    pictureStyle: "lip" as SurfaceStyle,
    pictureAt: 2.05,
    pictureHeight: 0.055,
    pictureProjection: 0.022,

    reeds: 4,
  };

  const plaster = new MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95, flatShading: true });
  const timber = new MeshStandardMaterial({ color: 0xd9c9ad, roughness: 0.85, flatShading: true });
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

    // The OTHER family. A chair rail is not in a corner — it sits on the wall face, so its section has one
    // flat back and a face that leaves the wall and returns to it. `surfaceProfile` supplies that; the run
    // itself is identical, which is the point worth seeing here. `run: "base"` is what grows the section
    // UPWARD from its line, the same way a baseboard grows from the floor.
    const rail = (at: number, profile: ReturnType<typeof surfaceProfile>) =>
      stage.add(new Mesh(new MoldingGeometry({ points: corners(at), closed, run: "base", profile }), timber));

    if (params.chairRail) {
      rail(
        params.chairAt,
        surfaceProfile({
          style: params.chairStyle,
          height: params.chairHeight,
          projection: params.chairProjection,
          segments: params.segments,
          reeds: params.reeds,
        }),
      );
    }

    if (params.pictureRail) {
      rail(
        params.pictureAt,
        surfaceProfile({
          style: params.pictureStyle,
          height: params.pictureHeight,
          projection: params.pictureProjection,
          segments: params.segments,
          reeds: params.reeds,
        }),
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

  const SURFACE_STYLES: Record<string, SurfaceStyle> = {
    "Fillet (plain batten)": "fillet",
    Bead: "bead",
    Astragal: "astragal",
    "Reed (reeding)": "reed",
    Ovolo: "ovolo",
    Ogee: "ogee",
    "Lip (undercut, for hooks)": "lip",
  };

  // The two rail folders run IDENTICAL code — same class, same `run`, same miter. What differs is the
  // height on the wall and the section chosen. There is no `ChairRailGeometry`, because there would be
  // nothing to put in it: a chair rail is a surface section at 900mm, and that is the whole of it.
  const chair = gui.addFolder("Chair Rail (surface section)");
  chair.add(params, "chairRail").name("Show").onChange(rebuild);
  chair.add(params, "chairStyle", SURFACE_STYLES).name("Profile").onChange(rebuild);
  // HEIGHT along the wall, not drop — a surface section has no second surface for a drop to run along.
  chair.add(params, "chairHeight", 0.02, 0.16, 0.002).name("Height").onChange(rebuild);
  chair.add(params, "chairProjection", 0.005, 0.08, 0.001).name("Projection").onChange(rebuild);
  // The one number that makes it a CHAIR rail rather than a picture rail. Same section, same run.
  chair.add(params, "chairAt", 0.4, 1.5, 0.01).name("Height on Wall").onChange(rebuild);
  chair.add(params, "reeds", 2, 8, 1).name("Reeds").onChange(rebuild);
  chair.open();

  const picture = gui.addFolder("Picture Rail (surface section)");
  picture.add(params, "pictureRail").name("Show").onChange(rebuild);
  picture.add(params, "pictureStyle", SURFACE_STYLES).name("Profile").onChange(rebuild);
  picture.add(params, "pictureHeight", 0.02, 0.14, 0.002).name("Height").onChange(rebuild);
  picture.add(params, "pictureProjection", 0.005, 0.06, 0.001).name("Projection").onChange(rebuild);
  picture.add(params, "pictureAt", 1.4, 3.4, 0.01).name("Height on Wall").onChange(rebuild);

  const room = gui.addFolder("Room");
  room
    .add(params, "walls", { "Corner (open run)": "corner", "Room (closed run)": "room" })
    .name("Walls")
    .onChange(rebuild);
  room.add(params, "width", 2, 6, 0.1).name("Width").onChange(rebuild);
  room.add(params, "depth", 2, 6, 0.1).name("Depth").onChange(rebuild);
  room.add(params, "wallHeight", 1.8, 3.6, 0.05).name("Wall Height").onChange(rebuild);
  room.open();

  //------------------------------
  //  The rough edge, on purpose
  //------------------------------
  //
  //  Both rails pass `run: "base"`, and there is no floor anywhere near them. `run` really selects WHICH
  //  WAY THE SECTION GROWS from its line — down for a crown, up for everything else — and it is named
  //  after the two applications that motivated it rather than after what it does. It is not wrong here,
  //  just something the caller has to learn.
  //
  //  Two smaller ones: `style`, `drop` and `projection` are quietly ignored once `profile` is passed, and
  //  a surface section can only get in THROUGH `profile` — there is no way to name one via `style`,
  //  because the two families are separate unions and one option cannot be both.

  return () => {
    gui.destroy();
    clear();
    plaster.dispose();
    timber.dispose();
    wall.dispose();
    floorMaterial.dispose();
    dispose();
  };
}

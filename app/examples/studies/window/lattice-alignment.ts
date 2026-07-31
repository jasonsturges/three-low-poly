import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import {
  type ArchStyle,
  DiamondLatticeGeometry,
  GroundGrid,
  openingOutline,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Lattice Alignment",
  description:
    "STUDY — making the diamonds LAND, rather than fall where they may. Set FITTED and drive Cells Across " +
    "and Cells Up instead of angle and spacing, and the corners sit exactly on the jambs, the sill, and " +
    "the springing line. The finding is that there is nothing to tune: given a width, a springing height " +
    "and two counts, the angle and the spacing are DETERMINED — they are outputs, and the readout shows " +
    "them. Above the springing the arch cuts whatever it likes, and no choice of angle changes that; a " +
    "curve is not a whole number of anything. Real leaded lights do exactly this — square up to the " +
    "rectangle, let the head fall as it falls.",
};

//------------------------------
//  THE MATHEMATICS
//------------------------------
//
//  Family A runs at +θ, family B at −θ, both spaced `s` apart measured perpendicular:
//
//      A:  p · (−sin θ, cos θ) = k·s + phase
//      B:  p · ( sin θ, cos θ) = m·s + phase
//
//  Solving the two together for a crossing — add the equations for y, subtract for x:
//
//      x = v·s / (2 sin θ)                 v = m − k
//      y = (u·s + 2·phase) / (2 cos θ)     u = k + m,  same parity as v
//
//  So the crossings are a centred rectangular lattice, and one DIAMOND measures
//
//      W = s / sin θ     corner to corner, horizontally
//      H = s / cos θ     corner to corner, vertically
//
//  Read that backwards and the whole question answers itself. To fit `cellsX` diamonds across a width and
//  `cellsY` up to the springing:
//
//      W = width / cellsX          H = springing / cellsY
//      H / W = sin θ / cos θ = tan θ    →    θ = atan(H / W)
//      s = W·sin θ = H·cos θ
//
//  **The angle and the spacing are not free.** They fall out of the counts, exactly as `railWidth` fell
//  out of the coach lantern's joint: the moment a quantity has to ALIGN with something, it is determined,
//  and exposing it as a knob only ships a way to break the alignment.
//
//  `phase = 0` puts a row of crossings on `y = 0`, which is why the diamonds already sit on their bottom
//  corners on the sill.

/** The angle and spacing that land `cellsX × cellsY` diamonds exactly inside the rectangle. */
function fitLattice(width: number, springing: number, cellsX: number, cellsY: number) {
  const cellWidth = width / Math.max(1, cellsX);
  const cellHeight = springing / Math.max(1, cellsY);
  const angle = Math.atan2(cellHeight, cellWidth);
  return {
    angle: MathUtils.radToDeg(angle),
    spacing: cellWidth * Math.sin(angle),
    cellWidth,
    cellHeight,
  };
}

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8b98a6,
    cameraPosition: [0.7, 1.5, 2.9],
  });

  controls.target.set(0, 0.9, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const key = new DirectionalLight(0xffffff, 1.05);
  key.position.set(0.7, 1.1, 1.6);
  const back = new DirectionalLight(0xa9c4e0, 0.8);
  back.position.set(-0.4, 0.6, -1.5);
  scene.add(key, back);

  const lead = new MeshStandardMaterial({
    color: 0x8d949e,
    roughness: 0.5,
    metalness: 0.4,
    flatShading: true,
    side: DoubleSide,
  });
  const boundaryLine = new LineBasicMaterial({ color: 0xffd166 });
  // The springing is the alignment's ceiling: above it the head is a curve, and a curve is not a whole
  // number of anything.
  const springLine = new LineBasicMaterial({ color: 0x7fe3a1 });
  const target = new LineBasicMaterial({ color: 0xff6bb5 });

  const params = {
    mode: "fitted" as "fitted" | "free",
    arch: "pointed" as ArchStyle,
    width: 1.24,
    springing: 1.15,
    archHeight: 0.78,
    curveSegments: 20,
    cellsX: 4,
    cellsY: 4,
    angle: 45,
    spacing: 0.19,
    cameWidth: 0.022,
    cameDepth: 0.03,
    showTargets: true,
    showSpringing: true,
    derived: "",
    cell: "",
    landing: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof Line || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  /** A small cross, marking where a diamond corner is SUPPOSED to land. */
  const marker = (x: number, y: number, size: number) =>
    new LineSegments(
      new BufferGeometry().setFromPoints([
        new Vector3(x - size, y, 0),
        new Vector3(x + size, y, 0),
        new Vector3(x, y - size, 0),
        new Vector3(x, y + size, 0),
      ]),
      target,
    );

  const rebuild = () => {
    clear();
    const fit = fitLattice(params.width, params.springing, params.cellsX, params.cellsY);
    const angle = params.mode === "fitted" ? fit.angle : params.angle;
    const spacing = params.mode === "fitted" ? fit.spacing : params.spacing;

    const opening = {
      width: params.width,
      height: params.springing,
      arch: params.arch,
      archHeight: params.archHeight,
    };

    stage.add(
      new Mesh(
        new DiamondLatticeGeometry({
          opening,
          angle,
          spacing,
          phase: 0,
          cameWidth: params.cameWidth,
          cameDepth: params.cameDepth,
          curveSegments: params.curveSegments,
        }),
        lead,
      ),
    );

    const points = openingOutline({ ...opening, x: 0, y: 0 })
      .getPoints(Math.max(2, Math.round(params.curveSegments)))
      .map((p) => new Vector3(p.x, p.y, 0));
    stage.add(new Line(new BufferGeometry().setFromPoints(points), boundaryLine));

    const half = params.width / 2;
    if (params.showSpringing) {
      stage.add(
        new Line(
          new BufferGeometry().setFromPoints([
            new Vector3(-half, params.springing, 0),
            new Vector3(half, params.springing, 0),
          ]),
          springLine,
        ),
      );
    }

    // Where the crossings actually land, from the lattice equations above rather than from the mesh —
    // so a marker sitting off a came would be telling you the two disagree.
    const theta = MathUtils.degToRad(angle);
    const stepX = spacing / (2 * Math.sin(theta));
    const stepY = spacing / (2 * Math.cos(theta));

    if (params.showTargets) {
      const size = Math.max(params.width, params.springing) * 0.018;
      for (let u = 0; u * stepY <= params.springing + 1e-9; u++) {
        for (let v = -60; v <= 60; v++) {
          if (((v % 2) + 2) % 2 !== u % 2) continue;
          const x = v * stepX;
          const y = u * stepY;
          // Only the ones the alignment is ABOUT: on a jamb, on the sill, or on the springing.
          const onJamb = Math.abs(Math.abs(x) - half) < 1e-6;
          const onSill = Math.abs(y) < 1e-6;
          const onSpring = Math.abs(y - params.springing) < 1e-6;
          if (!onJamb && !onSill && !onSpring) continue;
          if (Math.abs(x) > half + 1e-6) continue;
          stage.add(marker(x, y, size));
        }
      }
    }

    params.derived =
      params.mode === "fitted"
        ? `angle ${fit.angle.toFixed(3)}° · spacing ${fit.spacing.toFixed(5)}`
        : "free — angle and spacing are yours";
    params.cell = `W ${(spacing / Math.sin(theta)).toFixed(4)} · H ${(spacing / Math.cos(theta)).toFixed(4)}`;

    // Does a crossing actually sit on the jamb, and on the springing?
    const jambError = Math.abs(params.cellsX * stepX - half);
    const springError = Math.abs(2 * params.cellsY * stepY - params.springing);
    params.landing =
      params.mode === "fitted"
        ? `jamb ${jambError.toExponential(1)} · springing ${springError.toExponential(1)}`
        : `jamb ${(((half / stepX) % 1) * stepX).toFixed(4)} off · springing ${(((params.springing / (2 * stepY)) % 1) * 2 * stepY).toFixed(4)} off`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Lattice Alignment");

  const fitFolder = gui.addFolder("Fit");
  const free: ReturnType<typeof fitFolder.add>[] = [];
  const fitted: ReturnType<typeof fitFolder.add>[] = [];
  fitFolder
    .add(params, "mode", { "Fitted — counts decide": "fitted", "Free — angle and spacing": "free" })
    .name("Mode")
    .onChange(() => {
      for (const c of fitted) c.enable(params.mode === "fitted");
      // Disabled in FITTED mode on purpose: they are outputs there, and a slider on a determined value
      // only ships a way to break the alignment.
      for (const c of free) c.enable(params.mode === "free");
      rebuild();
    });
  fitted.push(
    fitFolder.add(params, "cellsX", 1, 10, 1).name("Cells Across").onChange(rebuild),
    fitFolder.add(params, "cellsY", 1, 10, 1).name("Cells Up").onChange(rebuild),
  );
  free.push(
    fitFolder.add(params, "angle", 15, 75, 0.5).name("Angle").onChange(rebuild),
    fitFolder.add(params, "spacing", 0.06, 0.6, 0.005).name("Spacing").onChange(rebuild),
  );
  for (const c of free) c.enable(false);
  fitFolder.open();

  const opening = gui.addFolder("Opening");
  opening
    .add(params, "arch", [
      "square",
      "segmental",
      "semicircle",
      "horseshoe",
      "elliptical",
      "pointed",
      "ogee",
    ])
    .name("Arch")
    .onChange(rebuild);
  opening.add(params, "width", 0.5, 2, 0.02).name("Width").onChange(rebuild);
  // The alignment's ceiling — everything above this is the arch's business.
  opening.add(params, "springing", 0.3, 2, 0.02).name("Springing").onChange(rebuild);
  opening.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(rebuild);
  opening.add(params, "curveSegments", 3, 48, 1).name("Curve Segments").onChange(rebuild);
  opening.open();

  const came = gui.addFolder("Came");
  came.add(params, "cameWidth", 0.008, 0.06, 0.001).name("Width").onChange(rebuild);
  came.add(params, "cameDepth", 0.008, 0.1, 0.001).name("Depth").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showTargets").name("Landing Marks").onChange(rebuild);
  inspect.add(params, "showSpringing").name("Springing Line").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "derived").name("Derived").listen().disable();
  readout.add(params, "cell").name("Diamond").listen().disable();
  readout.add(params, "landing").name("Landing").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    lead.dispose();
    boundaryLine.dispose();
    springLine.dispose();
    target.dispose();
    floor.dispose();
    dispose();
  };
}

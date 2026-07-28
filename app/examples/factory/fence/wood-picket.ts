import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { centerObject, WoodPicketGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Wood Picket",
  description:
    "THE BOARD IS THE INPUT and the top is cut out of it. Height is the whole plank — the length a picket is " +
    "actually sold in, the way a four-foot fence means the highest point sits at 48 inches. Tip Drop and Tip " +
    "Inset are the two halves of ONE CORNER CUT, taken out of the height and out of the width, so neither can " +
    "move the silhouette and the shoulder is a consequence rather than an input. Flat, dog-ear and pointed are " +
    "ONE CONTINUUM: the two cuts EQUAL is a 45-degree dog-ear on any board — the angle needs no solving, " +
    "because equal cuts on perpendicular axes are 45 degrees by construction — and an inset of half the width " +
    "brings the flanks together into a point, after which Tip Drop alone decides blunt versus steep. Sizing " +
    "each cut by itself is what lets a 1x4 and a 1x6 carry the identical ear; a fraction of the width would " +
    "have stretched it.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x6ea8d8 });

  const params = {
    // A 45° point out of the box — both cuts equal (45°) and at half the width (flanks meet). Mirrors
    // WoodPicketGeometry's own defaults; they must not drift.
    width: 0.35,
    height: 1.38,
    tipDrop: 0.175,
    tipInset: 0.175,
    thickness: 0.04,
  };

  const stats = { style: "", shoulderHeight: "", tipFlat: "" };

  // NOT a constructor option — a second way to dial `tipDrop`, kept out of `params` so that what you copy into
  // your own code is exactly what the geometry takes.
  const tuning = { cutAngle: 0 };

  const wood = new MeshStandardMaterial({ color: 0xe8e4da, flatShading: true });

  const picket = new Mesh(new WoodPicketGeometry(params), wood);
  scene.add(picket);
  centerObject(picket);

  // Names where the two cuts have put you on the continuum. Ordered so the degenerate cases are caught before
  // the ones that assume a real cut exists.
  const styleOf = (g: WoodPicketGeometry) => {
    if (g.tipDrop < 0) return "chevron (inverted)";
    if (g.tipDrop === 0 || g.tipInset === 0) return "flat top";
    const point = g.tipFlat <= 1e-9;
    const square = Math.abs(g.tipInset - g.tipDrop) <= 1e-9;
    if (point) return square ? "point (45°)" : g.tipDrop > g.tipInset ? "point, steep" : "point, blunt";
    return square ? "dog ear (45°)" : "chamfered";
  };

  let dropControl: { updateDisplay(): void } | undefined;
  let angleControl: { updateDisplay(): void } | undefined;

  const refresh = () => {
    const g = picket.geometry as WoodPicketGeometry;
    stats.style = styleOf(g);
    // Both derived, not typed: the board less each cut. They move while Height and Width hold still.
    stats.shoulderHeight = g.shoulderHeight.toFixed(3);
    stats.tipFlat = g.tipFlat.toFixed(3);
    // Pushed back to the slider rather than polled: the library reserves `.listen()` for disabled readouts,
    // and a live control is written to explicitly.
    tuning.cutAngle = g.tipInset === 0 ? 90 : (g.cutAngle * 180) / Math.PI;
    angleControl?.updateDisplay();
    dropControl?.updateDisplay();
  };

  const rebuild = () => {
    picket.geometry.dispose();
    picket.geometry = new WoodPicketGeometry(params);
    centerObject(picket);
    refresh();
  };
  refresh();

  const gui = new GUI();

  const board = gui.addFolder("Board");
  board.add(params, "width", 0.1, 0.8, 0.005).name("Width").onChange(rebuild);
  // The whole plank. Drag it and the board grows from the top while both cuts keep their size.
  board.add(params, "height", 0.3, 2.5, 0.01).name("Height").onChange(rebuild);
  board.add(params, "thickness", 0.01, 0.2, 0.005).name("Thickness").onChange(rebuild);
  board.open();

  const cut = gui.addFolder("Top Cut");
  // Set these EQUAL for a 45° dog-ear — no arithmetic, on any board width. A NEGATIVE drop inverts the cut
  // into a chevron: reachable in code, deliberately off this slider, since the range states the envelope.
  dropControl = cut.add(params, "tipDrop", 0, 0.6, 0.005).name("Tip Drop").onChange(rebuild);
  // Clamped to half the width by the geometry; reaching it brings the flanks together into a point.
  cut.add(params, "tipInset", 0, 0.4, 0.005).name("Tip Inset").onChange(rebuild);
  // The machinist's way of asking for the same cut — a chamfer is specced as an angle. It solves for Tip Drop
  // rather than being a third dial, since the two cuts already determine it. 45 is where they are equal.
  angleControl = cut
    .add(tuning, "cutAngle", 5, 85, 0.1)
    .name("Cut Angle °")
    .onChange(() => {
      // No inset means no flank to angle, so there is nothing to solve for.
      if (params.tipInset === 0) return;
      params.tipDrop = params.tipInset * Math.tan((tuning.cutAngle * Math.PI) / 180);
      rebuild();
    });
  cut.open();

  const readout = gui.addFolder("Measured");
  readout.add(stats, "style").name("Style").listen().disable();
  // Outputs of the board less each cut, not parameters.
  readout.add(stats, "shoulderHeight").name("Shoulder Height").listen().disable();
  readout.add(stats, "tipFlat").name("Tip Flat").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    picket.geometry.dispose();
    wood.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import { Group } from "three";
import {
  type ArchStyle,
  GregorianLatticeWindow,
  GroundGrid,
  type WallOpeningOptions,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Gregorian Lattice Window",
  description:
    "A Gregorian light: glass, glazing bars, and the frame that carries them — the sibling of the diamond " +
    "lattice window, assembled the same way. Underneath it is literally the same construction: a lattice " +
    "type is only ever a choice of angles, and this is two bar families at 90° and 0° where the diamond " +
    "is two at ±45°. There are no miters, and none wanted — mullion crosses transom, and an X-junction has " +
    "no bisector to share. What the bars DO need is their ends cut to the boundary, and switching Arch off " +
    "`square` shows why: in a rectangle every end is already square, but under an arch the mullions run " +
    "into a curve. Drive it with LIGHT counts; the spacings are worked out and reported.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8e9aa6,
    cameraPosition: [1.0, 1.5, 2.7],
  });

  controls.target.set(0, 0.95, 0);
  controls.update();

  const floor = new GroundGrid({ size: 6, planeColor: 0x3f4954, gridColor: 0x4c5866 });
  scene.add(floor);

  const params = {
    arch: "semicircle" as ArchStyle,
    width: 1.2,
    springing: 1.5,
    archHeight: 0.6,
    lightsAcross: 3,
    lightsUp: 4,
    barWidth: 0.03,
    barDepth: 0.03,
    curveSegments: 24,
    frame: true,
    glass: true,
    frameOutset: 0.048,
    readout: "",
  };

  const stage = new Group();
  scene.add(stage);

  let light: GregorianLatticeWindow | null = null;

  const opening = (): WallOpeningOptions => ({
    width: params.width,
    height: params.springing,
    arch: params.arch,
    archHeight: params.archHeight,
  });

  const build = () => {
    light?.dispose();
    if (light) stage.remove(light);

    light = new GregorianLatticeWindow({
      opening: opening(),
      lightsAcross: params.lightsAcross,
      lightsUp: params.lightsUp,
      barWidth: params.barWidth,
      barDepth: params.barDepth,
      curveSegments: params.curveSegments,
      frame: params.frame ? { outset: params.frameOutset } : false,
      glass: params.glass,
    });
    stage.add(light);

    params.readout =
      `${light.lightsAcross}x${light.lightsUp} lights · mullions ${light.mullionSpacing.toFixed(4)} · ` +
      `transoms ${light.transomSpacing.toFixed(4)} · ${light.bars.geometry.barCount} bars`;
  };
  build();

  const gui = new GUI();
  gui.title("Gregorian Lattice Window");

  const shape = gui.addFolder("Opening");
  // `square` is the plain sash. Every other entry is the same code with a curved head.
  shape
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
    .onChange(build);
  shape.add(params, "width", 0.5, 2.2, 0.02).name("Width").onChange(build);
  shape.add(params, "springing", 0.3, 2.2, 0.02).name("Springing").onChange(build);
  shape.add(params, "archHeight", 0.1, 1.4, 0.02).name("Rise").onChange(build);
  shape.add(params, "curveSegments", 4, 48, 1).name("Curve Segments").onChange(build);
  shape.open();

  const glazing = gui.addFolder("Glazing Bars");
  // A LIGHT is one pane; 3 across gives two mullions. An odd count puts a light on the centreline, an
  // even one puts a bar there — the factory phases the family accordingly.
  glazing.add(params, "lightsAcross", 1, 8, 1).name("Lights Across").onChange(build);
  glazing.add(params, "lightsUp", 1, 10, 1).name("Lights Up").onChange(build);
  // Sizes the frame as well, which is why the assembly owns it.
  glazing.add(params, "barWidth", 0.008, 0.08, 0.001).name("Bar Width").onChange(build);
  glazing.add(params, "barDepth", 0.008, 0.12, 0.001).name("Bar Depth").onChange(build);
  glazing.open();

  const parts = gui.addFolder("Parts");
  parts.add(params, "frame").name("Frame").onChange(build);
  parts.add(params, "glass").name("Glass").onChange(build);
  // Reaches 0: the frame's band is `inset + outset`, and `inset` is already the bar's width.
  parts.add(params, "frameOutset", 0, 0.14, 0.001).name("Frame Outset").onChange(build);
  parts.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "readout").name("Fitted").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    light?.dispose();
    floor.dispose();
    dispose();
  };
}

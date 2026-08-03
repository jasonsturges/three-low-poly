import GUI from "lil-gui";
import { GroundGrid, VotiveRack } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Votive Rack",
  description:
    "A tiered rack of votive candles in four draw calls, whatever the population: one merged iron frame, " +
    "one wax batch, one flame batch, one halo batch. Candle heights vary, some cups are empty, some " +
    "candles are spent — all carried in instance data. Raise rows and columns and watch the draw count " +
    "hold while triangles climb.",
};

export default function (container: HTMLElement) {
  const { scene, renderer, controls, onFrame, dispose } = createScene(container, {
    background: 0x07070b,
    cameraPosition: [2.1, 1.75, 2.8],
  });
  controls.target.set(0, 0.9, 0);
  controls.update();

  // The frame's posts run from y=0, so the rack stands on the floor rather than floating at its base shelf.
  const ground = new GroundGrid({ size: 6, divisions: 6 });
  scene.add(ground);

  const params = {
    seed: 7,
    rows: 4,
    columns: 8,
    density: 0.9,
    litFraction: 0.72,
    color: "#ffb347",
    glowSize: 0.48,
    glowOpacity: 0.42,
    intensity: 0,
  };

  const measured = { candles: 0, lit: 0, drawCalls: 0, triangles: 0 };

  // The renderer clears `info` at the top of its own animation loop — i.e. before this callback — so
  // reading it there always yields zero unless we take over the reset.
  renderer.info.autoReset = false;

  let rack = new VotiveRack(params);
  scene.add(rack);

  const rebuild = () => {
    scene.remove(rack);
    rack.dispose();
    rack = new VotiveRack(params);
    scene.add(rack);
    measured.candles = rack.candleCount;
    measured.lit = rack.litCount;
  };
  measured.candles = rack.candleCount;
  measured.lit = rack.litCount;

  onFrame(() => {
    measured.drawCalls = renderer.info.render.drawCalls;
    measured.triangles = renderer.info.render.triangles;
    renderer.info.reset();

    rack.update(performance.now() * 0.001);
  });

  const gui = new GUI();
  gui.title("Votive Rack");
  gui.add(params, "seed", 0, 100, 1).name("Seed").onChange(rebuild);
  gui.add(params, "rows", 1, 12, 1).name("Rows").onChange(rebuild);
  gui.add(params, "columns", 1, 24, 1).name("Columns").onChange(rebuild);
  // The presence cascade: a cup may be empty, then a present candle may be spent.
  gui.add(params, "density", 0, 1, 0.01).name("Cup Density").onChange(rebuild);
  gui.add(params, "litFraction", 0, 1, 0.01).name("Lit Fraction").onChange(rebuild);
  gui.addColor(params, "color").name("Flame Color").onChange(rebuild);
  gui.add(params, "glowSize", 0.1, 1.5, 0.01).name("Glow Size").onChange(rebuild);
  gui.add(params, "glowOpacity", 0, 1, 0.01).name("Glow Opacity").onChange(rebuild);
  // Zero omits the light entirely — hundreds of votives must never mean hundreds of lights.
  gui.add(params, "intensity", 0, 4, 0.1).name("Light Intensity").onChange(rebuild);

  const measuredFolder = gui.addFolder("Measured");
  measuredFolder.add(measured, "candles").name("Candles").disable().listen();
  measuredFolder.add(measured, "lit").name("Lit").disable().listen();
  measuredFolder.add(measured, "drawCalls").name("Draw Calls").disable().listen();
  measuredFolder.add(measured, "triangles").name("Triangles").disable().listen();
  measuredFolder.open();

  return () => {
    gui.destroy();
    scene.remove(rack);
    rack.dispose();
    ground.dispose();
    dispose();
  };
}

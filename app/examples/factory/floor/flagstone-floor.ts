import GUI from "lil-gui";
import { DirectionalLight } from "three";
import { FlagstoneFloor } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Flagstone Floor",
  description:
    "Individual slabs, not a textured plane — and the GROUT is the point. The gaps give perspective lines " +
    "that converge as the floor recedes, which is depth for free before any light is placed. A tiled " +
    "texture cannot do that, and a vertex-coloured plane gives tint variation but no gaps, because the " +
    "quads stay flush. Take Grout Gap to zero and watch the floor collapse into one slab: the converging " +
    "lines vanish and so does the depth. Every slab is the SAME box, differing only by matrix and tint — so " +
    "unlike the plank floors, whose boards are each a different shape and therefore merge, this one " +
    "instances. Hundreds of slabs, one draw call.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x0a0b10,
    // Low and raking. A floor is read down its length, and a shallow angle is the only view that shows
    // what the grout lines and the per-slab settle are doing.
    cameraPosition: [0, 3.5, 16],
  });

  controls.target.set(0, 0, -2);
  controls.update();

  const key = new DirectionalLight(0xffeedd, 1.4);
  key.position.set(4, 8, 6);
  const bounce = new DirectionalLight(0x8fa8c8, 0.35);
  bounce.position.set(-4, 2, -6);
  scene.add(key, bounce);

  const params = {
    width: 20,
    length: 26,
    tile: 1.0,
    gap: 0.06,
    thickness: 0.12,
    color: "#54524d",
    tintJitter: 0.12,
    heightJitter: 0.012,
    roughness: 0.72,
    seed: 1,
    cost: "",
  };

  let floor: FlagstoneFloor;

  const build = () => {
    floor = new FlagstoneFloor(params);
    scene.add(floor);
    params.cost = `${floor.tiles} slabs (${floor.columns} × ${floor.rows}) · 1 geometry · 1 material · 1 draw call`;
  };

  const rebuild = () => {
    scene.remove(floor);
    floor.dispose();
    build();
  };
  build();

  const gui = new GUI();
  gui.title("Flagstone Floor");

  const extent = gui.addFolder("Extent");
  extent.add(params, "width", 4, 60, 1).name("Width").onChange(rebuild);
  extent.add(params, "length", 4, 60, 1).name("Length").onChange(rebuild);
  extent.open();

  const slabs = gui.addFolder("Slabs");
  slabs.add(params, "tile", 0.3, 4, 0.05).name("Tile Pitch").onChange(rebuild);
  // The whole reason this is not a plane. Take it to 0 and the floor collapses into one flat slab — the
  // converging lines vanish and so does the depth.
  slabs.add(params, "gap", 0, 0.5, 0.01).name("Grout Gap").onChange(rebuild);
  slabs.add(params, "thickness", 0.02, 0.8, 0.01).name("Thickness").onChange(rebuild);
  slabs.open();

  const wear = gui.addFolder("Wear");
  wear.addColor(params, "color").name("Stone").onChange(rebuild);
  // Lightness only — hue drift per slab reads as STAINED rather than weathered, which is the opposite of
  // what stone wants. A pumpkin patch wants the hue; a floor does not.
  wear.add(params, "tintJitter", 0, 0.5, 0.005).name("Colour Variance").onChange(rebuild);
  // How far each slab settles or lifts. Past about 0.05 it stops reading as worn and reads as broken.
  wear.add(params, "heightJitter", 0, 0.12, 0.002).name("Settle").onChange(rebuild);
  wear.add(params, "roughness", 0, 1, 0.02).name("Roughness").onChange(rebuild);
  // Stable across rebuilds — the floor is an address, not a reshuffle.
  wear.add(params, "seed", 1, 200, 1).name("Seed").onChange(rebuild);
  wear.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "cost").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    scene.remove(floor);
    floor.dispose();
    dispose();
  };
}

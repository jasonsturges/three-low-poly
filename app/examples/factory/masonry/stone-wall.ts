import GUI from "lil-gui";
import { DirectionalLight } from "three";
import { StoneWall } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Stone Wall",
  description:
    "ASHLAR — squared, dressed stone in level courses, built stone by stone rather than as a slab with " +
    "lines drawn on it. Three rules make it read as masonry. A RUNNING BOND, so no vertical joint runs " +
    "through: take Bond Offset to 0 for a stack bond and watch it stop being a wall. No course ever gives " +
    "up — a stone that would strand an uncuttable remainder takes the remainder instead, so every course " +
    "reaches the edge. And the joint comes OUT of the stone, so widening the mortar never moves the " +
    "coursing. Three variance axes: Length and Depth per STONE, Course per COURSE — because a course that " +
    "is not level is not a course. Settle and Tilt are displacement rather than size, and are a stylised " +
    "decrepit read rather than masonry truth, which is why they default to nothing. One draw call at any " +
    "size.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14161c,
    cameraPosition: [2.6, 2.4, 4.2],
  });

  controls.target.set(0, 1.4, 0);
  controls.update();

  const key = new DirectionalLight(0xfff2e2, 1.45);
  key.position.set(2.5, 3.5, 3);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-2.5, 0.5, -2);
  scene.add(key, bounce);

  const params = {
    width: 3.2,
    height: 3,
    thickness: 0.34,
    courseHeight: 0.26,
    stoneAspect: 2.2,
    joint: 0.012,
    bondOffset: 0.5,
    shortestStone: 0.45,
    courseVariance: 0,
    lengthVariance: 0.22,
    mortar: true,
    mortarRecess: 0.014,
    mortarColor: "#b8b2a6",
    settle: 0,
    tilt: 0,
    depthVariance: 0.006,
    proudChance: 0.12,
    proudDepth: 0.03,
    color: "#6a6560",
    colorVariance: 0.07,
    seed: 0x2c1a,
    laid: "",
    cost: "",
  };

  let wall: StoneWall;

  const build = () => {
    wall = new StoneWall(params);
    scene.add(wall);
    const geometry = wall.mesh.geometry;
    const index = geometry.getIndex();
    const tris = (index ? index.count : geometry.getAttribute("position").count) / 3;
    params.laid = `${wall.stoneCount} stones · ${wall.courseCount} courses of ${wall.courseHeight.toFixed(4)} · ${wall.closerCount} closers · ${wall.proudCount} proud`;
    params.cost = `${tris.toLocaleString()} tris · 1 geometry · 1 material · ${Math.max(1, geometry.groups.length)} draw call`;
  };

  const rebuild = () => {
    scene.remove(wall);
    wall.dispose();
    build();
  };
  build();

  const gui = new GUI();
  gui.title("Stone Wall");

  const size = gui.addFolder("Wall");
  size.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  size.add(params, "height", 0.5, 8, 0.1).name("Height").onChange(rebuild);
  size.add(params, "thickness", 0.08, 1, 0.02).name("Thickness").onChange(rebuild);
  size.open();

  // CEILINGS are set low deliberately: seven variance controls that SUM, where a brick wall has three.
  // Each is about twice where it starts fighting something real — see the factory's docs.
  const coursing = gui.addFolder("Coursing");
  coursing.add(params, "courseHeight", 0.08, 0.8, 0.01).name("Course Height").onChange(rebuild);
  coursing.add(params, "stoneAspect", 0.6, 5, 0.1).name("Stone Aspect").onChange(rebuild);
  // Per COURSE, not per stone. 0 is ASHLAR; above it is RANDOM COURSED.
  coursing.add(params, "courseVariance", 0, 0.45, 0.01).name("Course Variance").onChange(rebuild);
  coursing.add(params, "lengthVariance", 0, 0.5, 0.02).name("Length Variance").onChange(rebuild);
  // THE control that decides how a course ends. Under ~(1 − Length Variance) it governs only closers.
  coursing.add(params, "shortestStone", 0.15, 1, 0.05).name("Shortest Stone").onChange(rebuild);
  coursing.add(params, "joint", 0, 0.06, 0.002).name("Joint (mortar)").onChange(rebuild);
  // 0.5 is a running bond; 0 is a stack bond, which is not a bond at all.
  coursing.add(params, "bondOffset", 0, 1, 0.05).name("Bond Offset").onChange(rebuild);
  coursing.open();

  const mortar = gui.addFolder("Mortar");
  // Off is a DRY STONE wall — joints open all the way through.
  mortar.add(params, "mortar").name("Mortar").onChange(rebuild);
  // Flush has no shadow and reads as a painted line; raked back, a joint reads as a joint.
  mortar.add(params, "mortarRecess", 0, 0.08, 0.002).name("Mortar Recess").onChange(rebuild);
  mortar.addColor(params, "mortarColor").name("Mortar Color").onChange(rebuild);

  const laid = gui.addFolder("Laid");
  // Displacement, not size — where a stone ended up rather than how big it is. Stylised, not masonry.
  laid.add(params, "settle", 0, 0.03, 0.001).name("Settle").onChange(rebuild);
  laid.add(params, "tilt", 0, 0.08, 0.002).name("Tilt").onChange(rebuild);

  const relief = gui.addFolder("Relief");
  relief.add(params, "depthVariance", 0, 0.035, 0.001).name("Depth Variance").onChange(rebuild);
  relief.add(params, "proudChance", 0, 1, 0.01).name("Proud Chance").onChange(rebuild);
  relief.add(params, "proudDepth", 0, 0.1, 0.002).name("Proud Depth").onChange(rebuild);
  relief.open();

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Color").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.3, 0.005).name("Color Variance").onChange(rebuild);
  colour.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "cost").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    scene.remove(wall);
    wall.dispose();
    dispose();
  };
}

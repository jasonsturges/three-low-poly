import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { centerObject, PestleGeometry, type PestleGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Pestle",
  description:
    "The grinding tool, standing on its own head. The HEAD IS THE WIDE END AND IT SITS AT Y=0 — a " +
    "pestle at rest stands on the part that does the work, and that is also the frame an assembly " +
    "places it from. Drop Sides to 6 and it reads as hand-cut stone. It is currently a truncated cone, " +
    "which is what the old mortar-and-pestle prefab used; a real pestle is club-shaped and wants a " +
    "lathe profile instead.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [1.6, 1.4, 2.2] });

  const params: Required<PestleGeometryOptions> = {
    height: 1.5,
    headRadius: 0.3,
    gripRadius: 0.2,
    radialSegments: 8,
  };

  const colors = { stone: "#8b5a2b" };

  const stone = new MeshStandardMaterial({
    color: colors.stone,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });

  const pestle = new Mesh(new PestleGeometry(params), stone);
  pestle.castShadow = true;
  scene.add(pestle);
  centerObject(pestle);

  const stats = { triangles: 0 };

  const refresh = () => {
    const g = pestle.geometry;
    stats.triangles = g.index ? g.index.count / 3 : g.attributes.position!.count / 3;
  };

  const rebuild = () => {
    pestle.geometry.dispose();
    pestle.geometry = new PestleGeometry(params);
    centerObject(pestle);
    refresh();
  };
  refresh();

  const gui = new GUI();
  gui.title("Pestle");

  const shape = gui.addFolder("Shape");
  shape.add(params, "height", 0.4, 3, 0.05).name("Height").onChange(rebuild);
  // Take the head down to the grip radius and the taper vanishes — a plain rod.
  shape.add(params, "headRadius", 0.05, 0.8, 0.01).name("Head Radius").onChange(rebuild);
  shape.add(params, "gripRadius", 0.05, 0.8, 0.01).name("Grip Radius").onChange(rebuild);
  shape.add(params, "radialSegments", 3, 32, 1).name("Radial Segments").onChange(rebuild);
  shape.open();

  const material = gui.addFolder("Material");
  material.addColor(colors, "stone").name("Stone").onChange(() => stone.color.set(colors.stone));

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    pestle.geometry.dispose();
    stone.dispose();
    dispose();
  };
}

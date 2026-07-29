import GUI from "lil-gui";
import { DoubleSide, FrontSide, Mesh, MeshStandardMaterial } from "three";
import { centerObject, MortarGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Mortar",
  description:
    "The bowl, on its own — the pestle is a separate geometry and a separate example, because nothing " +
    "about a mortar requires one to be sitting in it. DoubleSide is not decoration here, it is a " +
    "PATCH: the profile climbs the outside and turns in across the rim, then stops, so there is no " +
    "inner wall at all. Measured level by level there is exactly one radius at every height except the " +
    "lip — thickness 0.5 at the rim and 0 below it. What reads as the inside is the BACK FACE of the " +
    "outside, so its normals point outward and the interior shades as though lit from behind. It only " +
    "looks like a bowl by happenstance. Switch Side to FrontSide to watch it fall apart. The geometry " +
    "also takes no parameters, which is why this panel is material-only; both are TODOs on the class.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [3, 2.6, 4] });

  const colors = { stone: "#5c4033" };

  // A single-surface bowl, so both faces have to render. Fully rough and non-metallic — it is stone.
  const stone = new MeshStandardMaterial({
    color: colors.stone,
    roughness: 1.0,
    metalness: 0.0,
    side: DoubleSide,
  });

  const mortar = new Mesh(new MortarGeometry(), stone);
  mortar.castShadow = true;
  scene.add(mortar);
  centerObject(mortar);

  const stats = { triangles: 0 };
  const geometry = mortar.geometry;
  stats.triangles = geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position!.count / 3;

  const gui = new GUI();
  gui.title("Mortar");

  const material = gui.addFolder("Material");
  material.addColor(colors, "stone").name("Stone").onChange(() => stone.color.set(colors.stone));
  // Toggle to see why the shell needs both faces.
  material
    .add(stone, "side", { DoubleSide, FrontSide })
    .name("Side")
    .onChange(() => {
      stone.needsUpdate = true;
    });
  material.open();

  const readout = gui.addFolder("Measured");
  readout.add(stats, "triangles").name("Triangles").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    mortar.geometry.dispose();
    stone.dispose();
    dispose();
  };
}

import GUI from "lil-gui";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { LeafGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Leaf" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 0.35] });

  const params = {
    size: 0.13,
    lift: 0.22,
    color: "#a8702c",
  };

  // DoubleSide — a leaf is a folded sheet and is read from both faces as it tumbles.
  const foliage = new MeshStandardMaterial({
    color: params.color,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
    side: DoubleSide,
  });

  const makeLeaf = () =>
    new Mesh(new LeafGeometry({ size: params.size, lift: params.lift }), foliage);

  let leaf = makeLeaf();
  scene.add(leaf);

  const rebuild = () => {
    scene.remove(leaf);
    leaf.geometry.dispose();
    leaf = makeLeaf();
    scene.add(leaf);
  };

  const gui = new GUI();
  gui.title("Leaf");
  gui.add(params, "size", 0.05, 0.4).name("Size").step(0.01).onChange(rebuild);
  gui.add(params, "lift", 0, 0.5).name("Lift").step(0.01).onChange(rebuild);
  gui.addColor(params, "color")
    .name("Color")
    .onChange(() => {
      foliage.color.set(params.color);
    });

  return () => {
    gui.destroy();
    scene.remove(leaf);
    leaf.geometry.dispose();
    foliage.dispose();
    dispose();
  };
}
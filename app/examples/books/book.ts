import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { BookGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Book" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = {
    width: 1,
    height: 1.5,
    depth: 0.5,
    coverThickness: 0.05,
    pageIndent: 0.05,
    coverColor: "#8b0000",
    pageColor: "#ffffff",
  };

  // Group 0 is the cover shell, group 1 the page block.
  const materials = [
    new MeshStandardMaterial({
      color: params.coverColor,
      metalness: 0.1,
      roughness: 0.7,
      flatShading: true,
    }),
    new MeshStandardMaterial({ color: params.pageColor, flatShading: true }),
  ];

  const makeBook = () => new Mesh(new BookGeometry(params), materials);

  let book = makeBook();
  scene.add(book);
  centerObject(book);

  const rebuild = () => {
    scene.remove(book);
    book.geometry.dispose();
    book = makeBook();
    scene.add(book);
    centerObject(book);
  };

  const gui = new GUI();
  gui.title("Book");

  const shapeFolder = gui.addFolder("Shape");
  shapeFolder.add(params, "width", 0.1, 5, 0.001).name("Width").onChange(rebuild);
  shapeFolder.add(params, "height", 0.1, 5, 0.001).name("Height").onChange(rebuild);
  shapeFolder.add(params, "depth", 0.1, 2, 0.001).name("Depth").onChange(rebuild);
  shapeFolder.add(params, "coverThickness", 0.01, 0.25, 0.001).name("Cover Thickness").onChange(rebuild);
  shapeFolder.add(params, "pageIndent", 0, 0.25, 0.001).name("Page Indent").onChange(rebuild);
  shapeFolder.open();

  const materialsFolder = gui.addFolder("Materials");
  materialsFolder.addColor(params, "coverColor")
    .name("Cover")
    .onChange(() => materials[0]!.color.set(params.coverColor));
  materialsFolder.addColor(params, "pageColor")
    .name("Pages")
    .onChange(() => materials[1]!.color.set(params.pageColor));
  materialsFolder.open();

  return () => {
    gui.destroy();
    scene.remove(book);
    book.geometry.dispose();
    materials.forEach((m) => m.dispose());
    dispose();
  };
}
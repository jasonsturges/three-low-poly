import GUI from "lil-gui";
import { Book, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Book" };

function disposeMaterials(materials: Book["material"]) {
  materials.forEach((material) => material.dispose());
}

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

  const makeBook = () => new Book(params);

  let book = makeBook();
  scene.add(book);
  centerObject(book);

  const rebuild = () => {
    scene.remove(book);
    book.geometry.dispose();
    disposeMaterials(book.material);
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
    .onChange(() => book.material[0].color.set(params.coverColor));
  materialsFolder.addColor(params, "pageColor")
    .name("Pages")
    .onChange(() => book.material[1].color.set(params.pageColor));
  materialsFolder.open();

  return () => {
    gui.destroy();
    scene.remove(book);
    book.geometry.dispose();
    disposeMaterials(book.material);
    dispose();
  };
}
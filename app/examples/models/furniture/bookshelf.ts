import GUI from "lil-gui";
import { Bookshelf, BookshelfGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Bookshelf" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 0, 10] });

  const params = {
    width: 5,
    height: 8,
    depth: 1,
    shelves: 4,
    frameThickness: 0.1,
    open: false,
  };

  const bookshelf = new Bookshelf(params);
  scene.add(bookshelf);
  centerObject(bookshelf);

  const rebuild = () => {
    bookshelf.geometry.dispose();
    bookshelf.geometry = new BookshelfGeometry(params);
    centerObject(bookshelf);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.5, 10).name("Width").step(0.1).onChange(rebuild);
  gui.add(params, "height", 0.5, 10).name("Height").step(0.1).onChange(rebuild);
  gui.add(params, "depth", 0.5, 4).name("Depth").step(0.1).onChange(rebuild);
  gui.add(params, "shelves", 0, 10).name("Shelves").step(1).onChange(rebuild);
  gui.add(params, "frameThickness", 0.1, 1).name("Frame Thickness").step(0.01).onChange(rebuild);
  gui.add(params, "open").name("Open").onChange(rebuild);

  return () => {
    gui.destroy();
    bookshelf.geometry.dispose();
    dispose();
  };
}
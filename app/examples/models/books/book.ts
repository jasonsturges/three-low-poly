import GUI from "lil-gui";
import { Book, BookGeometry, centerObject } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

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

  // Book's cover/page colors are typed as numbers (ColorPalette values), so the
  // hex-string colors are applied to the materials directly rather than through
  // the constructor — the compiler keeps the two concerns honest.
  const { width, height, depth, coverThickness, pageIndent } = params;
  const book = new Book({ width, height, depth, coverThickness, pageIndent });
  book.material[0].color.set(params.coverColor);
  book.material[1].color.set(params.pageColor);
  scene.add(book);
  centerObject(book);

  // `Book extends Mesh<BookGeometry, MeshStandardMaterial[]>`, so geometry and
  // both material slots are fully typed here — no casts needed.
  const rebuild = () => {
    book.geometry.dispose();
    book.geometry = new BookGeometry(params.width, params.height, params.depth, params.coverThickness, params.pageIndent);
    book.material[0].color.set(params.coverColor);
    book.material[1].color.set(params.pageColor);
    centerObject(book);
  };

  const gui = new GUI();
  gui.add(params, "width", 0.1, 5, 0.001).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.1, 5, 0.001).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0.1, 2, 0.001).name("Depth").onChange(rebuild);
  gui.add(params, "coverThickness", 0.01, 0.25, 0.001).name("Cover Thickness").onChange(rebuild);
  gui.add(params, "pageIndent", 0.0, 0.25, 0.001).name("Page Indent").onChange(rebuild);
  gui.addColor(params, "coverColor").name("Cover Color").onChange(rebuild);
  gui.addColor(params, "pageColor").name("Page Color").onChange(rebuild);

  return () => {
    gui.destroy();
    book.geometry.dispose();
    book.material.forEach((m) => m.dispose());
    dispose();
  };
}

import GUI from "lil-gui";
import { ColorPalette, Diorama, DioramaGeometry } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";

export const meta = { title: "Diorama" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container);

  const params = {
    width: 5,
    height: 3,
    depth: 5,
    wallThickness: 0.05,
    interiorColor: ColorPalette.WHITE_SMOKE,
    floorColor: ColorPalette.RAW_SIENNA,
    exteriorColor: ColorPalette.GRAY,
  };

  const diorama = new Diorama(params);
  scene.add(diorama);

  const rebuild = () => {
    diorama.geometry.dispose();
    diorama.geometry = new DioramaGeometry({
      width: params.width,
      height: params.height,
      depth: params.depth,
      wallThickness: params.wallThickness,
    });
    diorama.material[0].color.set(params.interiorColor);
    diorama.material[1].color.set(params.floorColor);
    diorama.material[2].color.set(params.exteriorColor);
  };

  const gui = new GUI();
  gui.title("Diorama");
  gui.add(params, "width", 0.1, 5, 0.001).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.1, 5, 0.002).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0.1, 5, 0.001).name("Depth").onChange(rebuild);
  gui.add(params, "wallThickness", 0.01, 0.25, 0.001).name("Wall Thickness").onChange(rebuild);
  gui.addColor(params, "interiorColor").name("Interior Color").onChange(rebuild);
  gui.addColor(params, "floorColor").name("Floor Color").onChange(rebuild);
  gui.addColor(params, "exteriorColor").name("Exterior Color").onChange(rebuild);

  return () => {
    gui.destroy();
    diorama.geometry.dispose();
    diorama.material.forEach((m) => m.dispose());
    dispose();
  };
}
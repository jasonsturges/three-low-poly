import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial } from "three";
import { centerObject, MortarGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Mortar" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [3, 2.6, 4] });

  const params = {
    radius: 1.4,
    height: 1.8,
    wallThickness: 0.45,
    radialSegments: 16,
    stone: "#5c4033",
  };

  // Single-sided now that the shell is solid — the double wall gives it a real interior, so stone reads
  // right from every angle.
  const stone = new MeshStandardMaterial({ color: params.stone, roughness: 1.0, metalness: 0.0, flatShading: true });

  const mortar = new Mesh(new MortarGeometry(params), stone);
  mortar.castShadow = true;
  mortar.receiveShadow = true;
  scene.add(mortar);
  centerObject(mortar);

  const rebuild = () => {
    mortar.geometry.dispose();
    mortar.geometry = new MortarGeometry(params);
    centerObject(mortar);
  };

  const gui = new GUI();
  gui.title("Mortar");
  gui.add(params, "radius", 0.6, 2.5, 0.01).name("Radius").onChange(rebuild);
  gui.add(params, "height", 0.6, 3, 0.01).name("Height").onChange(rebuild);
  gui.add(params, "wallThickness", 0.05, 0.9, 0.01).name("Wall Thickness").onChange(rebuild);
  gui.add(params, "radialSegments", 5, 48, 1).name("Radial Segments").onChange(rebuild);
  gui.addColor(params, "stone").name("Stone").onChange(() => stone.color.set(params.stone));

  return () => {
    gui.destroy();
    mortar.geometry.dispose();
    stone.dispose();
    dispose();
  };
}

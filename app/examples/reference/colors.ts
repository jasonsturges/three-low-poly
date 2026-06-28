import { Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { ColorPalette } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Color Palette" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, -54, 84);
  controls.target.set(0, -54, 0);
  controls.update();

  const colorEntries = Object.entries(ColorPalette);
  const gridCols = 7;
  const gridSpacing = 12;
  const planeGeometry = new PlaneGeometry(10, 10);

  for (let i = 0; i < colorEntries.length; i++) {
    const [name, color] = colorEntries[i];
    const plane = new Mesh(planeGeometry, new MeshBasicMaterial({ color }));
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    plane.position.x = col * gridSpacing - (gridCols - 1) * gridSpacing * 0.5;
    plane.position.y = -row * gridSpacing;
    scene.add(plane);
    scene.add(
      createTextSprite(name, {
        x: plane.position.x,
        y: plane.position.y - 6,
        z: 0,
        size: 40,
      }),
    );
  }

  return () => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}
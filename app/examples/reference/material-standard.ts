import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Material Standard" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container);
  camera.position.set(0, 24, 0);
  controls.target.set(0, 0, 0);
  controls.update();

  const rows = 10;
  const cols = 10;
  const spacing = 2.5;
  const sphereGeometry = new SphereGeometry(1, 32, 32);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const roughness = row / (rows - 1);
      const metalness = col / (cols - 1);
      const x = col * spacing - (cols * spacing) / 2 + spacing / 2;
      const z = row * spacing - (rows * spacing) / 2 + spacing / 2;

      const sphere = new Mesh(
        sphereGeometry,
        new MeshStandardMaterial({ color: 0x0077ff, roughness, metalness }),
      );
      sphere.position.set(x, 0, z);
      scene.add(sphere);
      scene.add(
        createTextSprite(`${roughness.toFixed(1)}, ${metalness.toFixed(1)}`, {
          size: 24,
          x,
          y: 0.5,
          z: z + 1.75,
        }),
      );
    }
  }

  scene.add(createTextSprite("METALNESS", { x: (cols * spacing) / 2 + 3, y: 0, z: -(rows * spacing) / 2 - 1 }));
  scene.add(createTextSprite("ROUGHNESS", { x: -(cols * spacing) / 2 - 3, y: 0, z: (rows * spacing) / 2 + 2 }));
  scene.add(createTextSprite("0,0", { x: -(cols * spacing) / 2 - 3, y: 0, z: -(rows * spacing) / 2 - 1 }));
  scene.add(createTextSprite("1,1", { x: (cols * spacing) / 2 + 3, y: 0, z: (rows * spacing) / 2 + 2 }));

  return () => {
    sphereGeometry.dispose();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}
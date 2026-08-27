import GUI from "lil-gui";
import { DirectionalLight, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from "three";
import { createCheckerboardTexture } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Checkerboard",
  description: "A hard-edged checker as a DataTexture — raise the texel count, or tile a tiny 2×2 with repeat.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [4, 3.5, 6] });

  // createScene's default lights are soft; a brighter key makes the pattern read like it should.
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 7, 4);
  scene.add(key);

  const params = { size: 2, repeat: 8 };

  const material = new MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const plane = new Mesh(new PlaneGeometry(10, 10), material);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);
  const sphere = new Mesh(new SphereGeometry(1.4, 48, 48), material);
  sphere.position.y = 1.4;
  sphere.castShadow = true;
  scene.add(sphere);

  const rebuild = () => {
    material.map?.dispose();
    const texture = createCheckerboardTexture({ size: params.size });
    texture.repeat.set(params.repeat, params.repeat);
    material.map = texture;
    material.needsUpdate = true;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Checkerboard");
  // Odd values round up: the pattern alternates on (x ^ y) & 1, so an odd texel count repeats its
  // parity at the tile seam and two same-colored rows meet.
  gui.add(params, "size", 2, 32, 1).name("Texels").onChange(rebuild);
  gui.add(params, "repeat", 1, 32, 1).name("Tile Repeat").onChange(rebuild);

  return () => {
    gui.destroy();
    plane.geometry.dispose();
    sphere.geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}

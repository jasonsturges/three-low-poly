import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { createCheckerboardTexture } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Checkerboard",
  description:
    "Hard-edged checker pattern as a DataTexture — a chessboard or tile floor. Two ways to get more " +
    "squares: raise the texel count, or keep a tiny 2×2 texture and tile it with repeat. The second " +
    "is nearly free, which is the point of the pattern living in a texture at all.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const params = { size: 2, repeat: 8 };

  const geometry = new PlaneGeometry(10, 10);
  const material = new MeshStandardMaterial();
  const plane = new Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  scene.add(plane);

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
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}

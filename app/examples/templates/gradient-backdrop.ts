import { DirectionalLight, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { GroundGrid, createLinearGradientTexture } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";

export const meta = {
  title: "Gradient Backdrop",
  description: "Dark, moody scene template — a linear-gradient background, a cool rim light, and a ground grid.",
};

/**
 * Contribution starter: the "moody showcase" backdrop, isolated to copy.
 *
 * Three ingredients, marked below. The gradient is the load-bearing one: transmission glass and glossy
 * surfaces refract/reflect it, so they read as material instead of vanishing against flat black. The rim
 * light catches silhouettes; the grid grounds the subject. Drop your own object where the sphere is.
 */
export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [3, 2.5, 5] });
  const { scene, dispose } = handle;

  // 1 — Gradient background: slate at the floor, near-black overhead. Gives the scene value to refract.
  const background = createLinearGradientTexture({
    stops: [
      { offset: 0, color: 0x28323f }, // bottom of the view
      { offset: 1, color: 0x0c1016 }, // top
    ],
  });
  scene.background = background;

  // 2 — Cool back-rim light to catch edges against the dark.
  const rim = new DirectionalLight(0xaad2f0, 0.7);
  rim.position.set(5, 7, -9);
  scene.add(rim);

  // 3 — A grounding floor.
  const grid = new GroundGrid({ size: 16, planeColor: 0x0f141b });
  scene.add(grid);

  // --- your subject goes here ---
  const subject = new Mesh(
    new SphereGeometry(1, 48, 48),
    new MeshStandardMaterial({ color: 0x6ab8e0, roughness: 0.3, metalness: 0.1 }),
  );
  subject.position.y = 1;
  subject.castShadow = true;
  scene.add(subject);

  frameObject(handle, subject);

  return () => {
    subject.geometry.dispose();
    (subject.material as MeshStandardMaterial).dispose();
    grid.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    background.dispose();
    dispose();
  };
}

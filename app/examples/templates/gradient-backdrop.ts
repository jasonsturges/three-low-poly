import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { GroundGrid } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import { gradientBackdrop } from "../../framework/gradientBackdrop";

export const meta = {
  title: "Gradient Backdrop",
  description: "Dark, moody scene template — a linear-gradient background, a cool rim light, and a ground grid.",
};

/**
 * Contribution starter: the "moody showcase" backdrop, isolated to copy.
 *
 * The load-bearing pair — a slate→near-black gradient background and a cool rim light — is the reusable
 * `gradientBackdrop` helper (transmission glass and glossy surfaces refract/reflect the gradient, so they
 * read as material instead of vanishing against flat black; the rim catches silhouettes). Add a grid to
 * ground the subject, then drop your own object where the sphere is.
 */
export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [3, 2.5, 5] });
  const { scene, dispose } = handle;

  // 1 — The moody gradient wash + rim light. Pass options (colours, rim intensity) to retune.
  const disposeBackdrop = gradientBackdrop(scene);

  // 2 — A grounding floor. Optional: the vessel examples omit it so transparent subjects read from below.
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
    disposeBackdrop();
    dispose();
  };
}

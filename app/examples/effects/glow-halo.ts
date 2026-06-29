import { Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import GUI from "lil-gui";
import { GlowHalo } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Glow Halo",
  description:
    "Additive billboard glow — fake light without a PointLight. " +
    "Scales to many instances; pair with bloom for soft candlefields.",
};

export default function (container: HTMLElement) {
  const { scene, camera, onFrame, dispose } = createScene(container, {
    background: 0x050508,
    cameraPosition: [0, 2.5, 6],
  });

  const params = {
    color: 0xffaa44,
    size: 1.2,
    opacity: 0.75,
    count: 48,
  };

  const halos: GlowHalo[] = [];
  const flames: Mesh[] = [];

  const rebuild = () => {
    for (const halo of halos) {
      scene.remove(halo);
      halo.dispose();
    }
    for (const flame of flames) {
      scene.remove(flame);
      flame.geometry.dispose();
      (flame.material as MeshBasicMaterial).dispose();
    }
    halos.length = 0;
    flames.length = 0;

    const ringRadius = 3.5;
    for (let i = 0; i < params.count; i++) {
      const angle = (i / params.count) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;

      const halo = new GlowHalo({
        color: params.color,
        size: params.size,
        opacity: params.opacity,
      });
      halo.position.set(x, 0.55, z);
      scene.add(halo);
      halos.push(halo);

      const flame = new Mesh(
        new SphereGeometry(0.08, 8, 8),
        new MeshBasicMaterial({ color: params.color, toneMapped: false }),
      );
      flame.position.set(x, 0.55, z);
      scene.add(flame);
      flames.push(flame);
    }
  };

  rebuild();

  onFrame(() => {
    for (const halo of halos) halo.faceCamera(camera.position);
  });

  const sync = () => {
    for (const halo of halos) {
      halo.setColor(params.color);
      halo.setOpacity(params.opacity);
    }
    for (const flame of flames) {
      (flame.material as MeshBasicMaterial).color.set(params.color);
    }
  };

  const gui = new GUI();
  gui.title("Glow Halo");
  gui.addColor(params, "color").name("Color").onChange(sync);
  gui.add(params, "size", 0.4, 2.5, 0.05).name("Size").onChange(rebuild);
  gui.add(params, "opacity", 0, 1, 0.01).name("Opacity").onChange(sync);
  gui.add(params, "count", 8, 120, 1).name("Count").onChange(rebuild);

  return () => {
    gui.destroy();
    for (const halo of halos) halo.dispose();
    for (const flame of flames) {
      flame.geometry.dispose();
      (flame.material as MeshBasicMaterial).dispose();
    }
    dispose();
  };
}
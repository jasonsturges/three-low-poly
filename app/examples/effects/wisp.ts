import { Fog, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { WispEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Wisp",
  description:
    "Will-o'-the-wisps bobbing through a volume — portfolio graveyard motion and pulse. " +
    "Toggle real lights for hero scenes vs glow-only scale.",
};

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container, {
    background: 0x010101,
    cameraPosition: [0, 4, 12],
  });

  scene.fog = new Fog(0x010101, 6, 32);

  const ground = new Mesh(
    new PlaneGeometry(32, 32),
    new MeshStandardMaterial({ color: 0x1a2a1a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const params = {
    count: 3,
    castLight: true,
    color: 0x6dffb0,
    driftX: 1.6,
    driftY: 0.3,
  };

  let wisps = new WispEffect({
    count: params.count,
    castLight: params.castLight,
    color: params.color,
    driftX: params.driftX,
    driftY: params.driftY,
  });
  scene.add(wisps);

  const rebuild = () => {
    scene.remove(wisps);
    wisps.dispose();
    wisps = new WispEffect({
      count: params.count,
      castLight: params.castLight,
      color: params.color,
      driftX: params.driftX,
      driftY: params.driftY,
    });
    scene.add(wisps);
  };

  onFrame((dt) => wisps.update(dt));

  const gui = new GUI();
  gui.title("Wisp");
  gui.add(params, "count", 1, 12, 1).name("Count").onChange(rebuild);
  gui.add(params, "castLight").name("Cast Light").onChange(rebuild);
  gui.addColor(params, "color").name("Color").onChange(rebuild);
  gui.add(params, "driftX", 0.2, 4, 0.1).name("Drift X").onChange(rebuild);
  gui.add(params, "driftY", 0.05, 1, 0.05).name("Drift Y").onChange(rebuild);

  return () => {
    gui.destroy();
    wisps.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    dispose();
  };
}
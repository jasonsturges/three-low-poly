import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import GUI from "lil-gui";
import { EffervescenceEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Effervescence",
  description:
    "Carbonation bubbles rising through a liquid volume — seltzer, soda, or brewing flask.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    background: 0x101418,
    cameraPosition: [0, 2.8, 5.5],
  });

  controls.target.set(0, 1.6, 0);
  controls.update();

  const groundSize = 16;
  const ground = new Mesh(
    new PlaneGeometry(groundSize, groundSize),
    new MeshStandardMaterial({ color: 0x1c2428, roughness: 1, metalness: 0, side: DoubleSide }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(groundSize, groundSize, 0x334455, 0x223344);
  scene.add(grid);

  const bench = new Mesh(
    new BoxGeometry(4, 0.12, 1.6),
    new MeshStandardMaterial({ color: 0x2a3238, roughness: 0.85, metalness: 0.05 }),
  );
  bench.position.set(0, 0.9, 0);
  bench.castShadow = true;
  bench.receiveShadow = true;
  scene.add(bench);

  const vesselMaterial = new MeshStandardMaterial({
    color: 0x8899a4,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.35,
  });
  const vessel = new Mesh(new CylinderGeometry(0.72, 0.82, 2.1, 24, 1, true), vesselMaterial);
  vessel.position.set(0, 1.95, 0);
  scene.add(vessel);

  const liquidMaterial = new MeshStandardMaterial({
    color: 0x2a6e58,
    emissive: 0x143830,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
  });
  const liquid = new Mesh(new CylinderGeometry(0.66, 0.76, 1.55, 20), liquidMaterial);
  liquid.position.set(0, 1.62, 0);
  scene.add(liquid);

  const params = {
    count: 28,
    width: 1.1,
    height: 1.45,
    depth: 1.1,
    speedMin: 0.35,
    speedMax: 0.85,
    spread: 0.88,
    emissiveIntensity: 0.28,
    showReference: true,
  };

  const createFizz = () =>
    new EffervescenceEffect({
      count: params.count,
      width: params.width,
      height: params.height,
      depth: params.depth,
      speedMin: params.speedMin,
      speedMax: params.speedMax,
      spread: params.spread,
      color: 0xb8ffe8,
      opacity: 0.72,
      emissiveIntensity: params.emissiveIntensity,
    });

  let fizz = createFizz();
  fizz.position.set(0, 0.95, 0);
  scene.add(fizz);

  const rebuild = () => {
    scene.remove(fizz);
    fizz.dispose();
    fizz = createFizz();
    fizz.position.set(0, 0.95, 0);
    scene.add(fizz);
  };

  onFrame((dt) => fizz.update(dt));

  const gui = new GUI();
  gui.title("Effervescence");
  gui.add(params, "count", 4, 120, 1).name("Count").onChange(rebuild);
  gui.add(params, "width", 0.3, 2.5, 0.05).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.3, 3, 0.05).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0.3, 2.5, 0.05).name("Depth").onChange(rebuild);
  gui.add(params, "speedMin", 0.05, 2, 0.01).name("Speed Min").onChange(rebuild);
  gui.add(params, "speedMax", 0.05, 2.5, 0.01).name("Speed Max").onChange(rebuild);
  gui.add(params, "spread", 0.5, 1, 0.01).name("Spread Inset").onChange(rebuild);
  gui.add(params, "emissiveIntensity", 0, 1.2, 0.01).name("Glow").onChange(rebuild);
  gui
    .add(params, "showReference")
    .name("Bench / Vessel")
    .onChange((visible: boolean) => {
      ground.visible = visible;
      grid.visible = visible;
      bench.visible = visible;
      vessel.visible = visible;
      liquid.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(fizz);
    fizz.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    bench.geometry.dispose();
    (bench.material as MeshStandardMaterial).dispose();
    vessel.geometry.dispose();
    vesselMaterial.dispose();
    liquid.geometry.dispose();
    liquidMaterial.dispose();
    dispose();
  };
}
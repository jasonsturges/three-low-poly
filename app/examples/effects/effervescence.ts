import { BoxGeometry, CylinderGeometry, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { EffervescenceEffect, GroundGrid } from "three-low-poly";
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

  controls.target.set(0, 1.0, 0);
  controls.update();

  const floor = new GroundGrid({ size: 16, planeColor: 0x1c2428 });
  scene.add(floor);

  const benchMaterial = new MeshStandardMaterial({ color: 0x2a3238, roughness: 0.85, metalness: 0.05 });
  const bench = new Mesh(new BoxGeometry(3, 0.12, 2.4), benchMaterial);
  bench.position.set(0, 0.06, 0);
  bench.castShadow = true;
  bench.receiveShadow = true;
  scene.add(bench);

  const vesselMaterial = new MeshStandardMaterial({
    color: 0x8899a4,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: DoubleSide,
  });
  const vessel = new Mesh(new CylinderGeometry(0.72, 0.82, 2.1, 24, 1, true), vesselMaterial);
  vessel.position.set(0, 1.11, 0);
  vessel.renderOrder = 2;
  scene.add(vessel);

  const liquidMaterial = new MeshStandardMaterial({
    color: 0x2a6e58,
    emissive: 0x143830,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: DoubleSide,
  });
  const liquid = new Mesh(new CylinderGeometry(0.66, 0.76, 1.55, 20), liquidMaterial);
  liquid.position.set(0, 0.78, 0);
  liquid.renderOrder = 1;
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
  fizz.position.set(0, 0.11, 0);
  fizz.renderOrder = 0;
  scene.add(fizz);

  const rebuild = () => {
    scene.remove(fizz);
    fizz.dispose();
    fizz = createFizz();
    fizz.position.set(0, 0.11, 0);
    fizz.renderOrder = 0;
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
      floor.visible = visible;
      bench.visible = visible;
      vessel.visible = visible;
      liquid.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(fizz);
    fizz.dispose();
    floor.dispose();
    bench.geometry.dispose();
    benchMaterial.dispose();
    vessel.geometry.dispose();
    vesselMaterial.dispose();
    liquid.geometry.dispose();
    liquidMaterial.dispose();
    dispose();
  };
}
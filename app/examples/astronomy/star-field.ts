import { DoubleSide, GridHelper, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { NightSkybox, StarFieldEffect, Tree } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Star Field",
  description:
    "Procedural starry night — point sprites or instanced BurstGeometry starbursts. " +
    "Orbit the scene; the star shell follows the camera.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createScene(container, {
    background: 0x000000,
    cameraPosition: [0, 4, 14],
  });

  controls.target.set(0, 1.5, 0);
  controls.update();

  const sky = new NightSkybox(990);
  scene.add(sky);

  const groundSize = 24;

  const ground = new Mesh(
    new PlaneGeometry(groundSize, groundSize),
    new MeshStandardMaterial({ color: 0x1a2a1a, roughness: 1, metalness: 0, side: DoubleSide }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(groundSize, groundSize, 0x334455, 0x223344);
  scene.add(grid);

  const tree = new Tree({ trunkHeight: 2, leafCount: 4 });
  tree.position.set(-4, 0, 2);
  scene.add(tree);

  const params = {
    style: "burst" as "points" | "burst",
    count: 2500,
    radius: 480,
    sizeMin: 0.008,
    sizeMax: 0.025,
    twinkle: true,
    burstSides: 4,
    burstInner: 0.6,
    burstOuter: 1.9,
    burstDepth: 0.05,
    showSky: true,
    showReference: true,
  };

  const createStars = () =>
    new StarFieldEffect({
      style: params.style,
      count: params.count,
      radius: params.radius,
      sizeMin: params.sizeMin,
      sizeMax: params.sizeMax,
      twinkle: params.twinkle,
      burst: {
        sides: params.burstSides,
        innerRadius: params.burstInner,
        outerRadius: params.burstOuter,
        depth: params.burstDepth,
      },
    });

  let stars = createStars();
  stars.position.copy(camera.position);
  scene.add(stars);

  const rebuild = () => {
    scene.remove(stars);
    stars.dispose();
    stars = createStars();
    stars.position.copy(camera.position);
    scene.add(stars);
  };

  onFrame(() => {
    stars.position.copy(camera.position);
    if (params.twinkle) stars.update(performance.now() * 0.001);
  });

  const gui = new GUI();
  gui.title("Star Field");
  gui.add(params, "style", ["points", "burst"]).name("Style").onChange(rebuild);
  gui.add(params, "count", 100, 8000, 100).name("Count").onChange(rebuild);
  gui.add(params, "radius", 100, 900, 10).name("Radius").onChange(rebuild);
  gui.add(params, "sizeMin", 0.002, 0.08, 0.001).name("Angular Min").onChange(rebuild);
  gui.add(params, "sizeMax", 0.002, 0.08, 0.001).name("Angular Max").onChange(rebuild);
  gui.add(params, "twinkle").name("Twinkle");

  const burstFolder = gui.addFolder("Burst Shape");
  burstFolder.add(params, "burstSides", 2, 16, 1).name("Sides").onChange(rebuild);
  burstFolder.add(params, "burstInner", 0.1, 1.5, 0.05).name("Inner Radius").onChange(rebuild);
  burstFolder.add(params, "burstOuter", 0.5, 3, 0.05).name("Outer Radius").onChange(rebuild);
  burstFolder.add(params, "burstDepth", 0, 0.5, 0.01).name("Depth").onChange(rebuild);
  burstFolder.open();

  gui
    .add(params, "showSky")
    .name("Night Sky")
    .onChange((visible: boolean) => {
      sky.visible = visible;
    });
  gui
    .add(params, "showReference")
    .name("Ground / Props")
    .onChange((visible: boolean) => {
      ground.visible = visible;
      grid.visible = visible;
      tree.visible = visible;
    });

  return () => {
    gui.destroy();
    scene.remove(stars);
    stars.dispose();
    sky.geometry.dispose();
    sky.material.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    tree.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}
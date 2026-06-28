import { AmbientLight, DirectionalLight, GridHelper, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createBrickWall } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Brick Wall" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 5, 15] });

  const frontLight = new DirectionalLight(0xffffff, 0.8);
  frontLight.position.set(0, 5, 10);
  scene.add(frontLight);

  const backLight = new DirectionalLight(0xffffff, 0.3);
  backLight.position.set(0, 2, -5);
  scene.add(backLight);

  const extraAmbient = new AmbientLight(0x404040, 0.3);
  scene.add(extraAmbient);

  scene.add(new GridHelper(20, 20, 0x444444, 0x222222));

  const params = {
    wallWidth: 10,
    wallHeight: 8,
    brickWidth: 0.8,
    brickHeight: 0.3,
    brickDepth: 0.4,
    mortarGap: 0.05,
    offsetPattern: true,
    colorVariation: true,
    positionVariation: 0.02,
    rotationVariation: 0.01,
  };

  const brickColors = [0x8b4513, 0xa0522d, 0x6b3410, 0x9b5523] as const;

  const makeWall = () =>
    createBrickWall({
      ...params,
      material: new MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, metalness: 0.1 }),
      brickColors: [...brickColors],
    });

  let brickWall = makeWall();
  brickWall.position.y = 4;
  scene.add(brickWall);

  const rebuild = () => {
    scene.remove(brickWall);
    brickWall.geometry.dispose();
    if (Array.isArray(brickWall.material)) {
      brickWall.material.forEach((m) => m.dispose());
    } else {
      brickWall.material.dispose();
    }
    brickWall = makeWall();
    brickWall.position.y = 4;
    scene.add(brickWall);
  };

  const gui = new GUI();
  gui.title("Brick Wall");

  const wallFolder = gui.addFolder("Wall Dimensions");
  wallFolder.add(params, "wallWidth", 2, 20).name("Width").step(0.5).onChange(rebuild);
  wallFolder.add(params, "wallHeight", 2, 16).name("Height").step(0.5).onChange(rebuild);
  wallFolder.open();

  const brickFolder = gui.addFolder("Brick Dimensions");
  brickFolder.add(params, "brickWidth", 0.3, 1.5).name("Width").step(0.1).onChange(rebuild);
  brickFolder.add(params, "brickHeight", 0.1, 0.6).name("Height").step(0.05).onChange(rebuild);
  brickFolder.add(params, "brickDepth", 0.2, 0.8).name("Depth").step(0.1).onChange(rebuild);
  brickFolder.add(params, "mortarGap", 0, 0.2).name("Mortar Gap").step(0.01).onChange(rebuild);

  const patternFolder = gui.addFolder("Pattern & Variation");
  patternFolder.add(params, "offsetPattern").name("Running Bond").onChange(rebuild);
  patternFolder.add(params, "colorVariation").name("Color Variation").onChange(rebuild);
  patternFolder.add(params, "positionVariation", 0, 0.1).name("Position Variation").step(0.01).onChange(rebuild);
  patternFolder.add(params, "rotationVariation", 0, 0.1).name("Rotation Variation").step(0.01).onChange(rebuild);

  return () => {
    gui.destroy();
    brickWall.geometry.dispose();
    if (Array.isArray(brickWall.material)) {
      brickWall.material.forEach((m) => m.dispose());
    } else {
      (brickWall.material as MeshStandardMaterial).dispose();
    }
    dispose();
  };
}
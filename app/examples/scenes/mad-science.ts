import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SpotLight,
} from "three";
import {
  Book,
  Bookshelf,
  BubblingEffect,
  Desk,
  EmissivePulseAnimation,
  ErlenmeyerFlask,
  FlorenceFlask,
  Jar,
  LightningEffect,
  MortarAndPestle,
  Panel,
  PanelLight,
  PotionBottle,
  Stand,
  TestTubeRack,
  logarithmicRandomMax,
  randomFloat,
} from "three-low-poly";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Mad Science" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, onFrame, dispose } = createScene(container, {
    cameraPosition: [5, 5, 5],
  });
  clearDefaultLights(scene);
  renderer.setClearColor(0x000000);
  controls.target.set(0, 3, 0);
  controls.update();

  scene.add(new AmbientLight(0x404040, 0.5));
  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(-5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const spotLight = new SpotLight(0xffffff, 25, 50, Math.PI / 4, 1, 0.9);
  spotLight.position.set(-3, 8, 0);
  spotLight.target.position.set(-11, 0, 0);
  spotLight.castShadow = true;
  scene.add(spotLight);
  scene.add(spotLight.target);

  const spotLight2 = new SpotLight(0xffffff, 8, 50, Math.PI / 4, 1, 0.9);
  spotLight2.position.set(0, 8, 0);
  spotLight2.castShadow = true;
  scene.add(spotLight2);

  const hemisphereLight = new HemisphereLight(0xaaaaaa, 0x000000, 0.5);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  const plane = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: 0x0a0a0a }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const desk = new Desk();
  desk.receiveShadow = true;
  desk.castShadow = true;
  scene.add(desk);

  const stand = new Stand();
  stand.castShadow = true;
  const florenceFlask = new FlorenceFlask();
  florenceFlask.castShadow = true;
  florenceFlask.scale.set(0.35, 0.35, 0.35);
  florenceFlask.position.set(0, 0.46, 0);
  const florenceFlaskGroup = new Group();
  florenceFlaskGroup.add(stand);
  florenceFlaskGroup.add(florenceFlask);
  florenceFlaskGroup.position.set(-2, 3.3, -0.5);
  scene.add(florenceFlaskGroup);

  const book = new Book({ width: 0.8, height: 1, depth: 0.2, coverThickness: 0.015, pageIndent: 0.015 });
  book.position.set(0, 3.3, -0.25);
  book.rotation.x = Math.PI / 2;
  book.rotation.z = Math.PI / 6;
  book.castShadow = true;
  scene.add(book);

  const potionBottle = new PotionBottle();
  potionBottle.scale.set(0.25, 0.25, 0.25);
  potionBottle.position.set(0, 3.3, -1);
  potionBottle.castShadow = true;
  scene.add(potionBottle);

  const jar = new Jar();
  jar.scale.set(0.25, 0.25, 0.25);
  jar.position.set(-1, 3.3, -1);
  jar.castShadow = true;
  scene.add(jar);

  const bubblingEffect = new BubblingEffect();
  bubblingEffect.position.set(-1, 3.3, -1);
  bubblingEffect.scale.set(0.25, 0.25, 0.25);
  scene.add(bubblingEffect);

  const mortarAndPestle = new MortarAndPestle();
  mortarAndPestle.scale.set(0.15, 0.15, 0.15);
  mortarAndPestle.position.set(1, 3.3, -1);
  mortarAndPestle.castShadow = true;
  scene.add(mortarAndPestle);

  const testTubeRack = new TestTubeRack();
  testTubeRack.scale.set(0.3, 0.3, 0.3);
  testTubeRack.position.set(2, 3.2, -1);
  testTubeRack.castShadow = true;
  scene.add(testTubeRack);

  const makeShelf = () => {
    const shelf = new Group();
    const bookshelf = new Bookshelf({ open: true });
    bookshelf.castShadow = true;
    shelf.add(bookshelf);
    for (let i = 0; i <= 4; i++) {
      const shelfSpacing = (8 - 0.1) / (4 + 1);
      for (let j = -1.9; j <= 1.9; j += randomFloat(0.5, 1.5)) {
        const flask = new ErlenmeyerFlask({
          flaskRadius: logarithmicRandomMax(0.5, 0.1, 0.5),
          neckRadius: logarithmicRandomMax(0.1, 0.05, 0.1),
          height: logarithmicRandomMax(0.5, 0.2, 1),
          neckHeight: logarithmicRandomMax(0.5, 0.1, 0.2),
        });
        flask.position.set(j, 0.1 / 2 + i * shelfSpacing, logarithmicRandomMax(0.5, -0.1, 0.1));
        flask.castShadow = true;
        shelf.add(flask);
      }
    }
    return shelf;
  };

  const shelf1 = makeShelf();
  shelf1.rotation.y = Math.PI / 2;
  shelf1.position.set(-10, 0, 0);
  scene.add(shelf1);

  const shelf2 = makeShelf();
  shelf2.rotation.y = Math.PI / 2;
  shelf2.position.set(-10, 0, 6);
  scene.add(shelf2);

  const shelf3 = makeShelf();
  shelf3.rotation.y = Math.PI / 2;
  shelf3.position.set(-10, 0, -6);
  scene.add(shelf3);

  const p1 = new PointLight(0x5dffe2, 2, 6, 0);
  p1.position.set(-8, 4, 0);
  scene.add(p1);
  const p2 = new PointLight(0x5dffe2, 1, 6, 0.1);
  p2.position.set(-8, 4, 6);
  scene.add(p2);
  const p3 = new PointLight(0x5dffe2, 1, 6, 0.1);
  p3.position.set(-8, 4, -6);
  scene.add(p3);

  const controlPanel1 = new Group();
  controlPanel1.position.set(0, 0, -10);
  scene.add(controlPanel1);

  const box = new Mesh(new BoxGeometry(3, 6, 1), new MeshStandardMaterial({ color: 0x020202 }));
  box.position.set(0, 3, -0.5);
  box.castShadow = true;
  controlPanel1.add(box);

  const panel = new Panel({ width: 2.75, height: 1, depth: 0.1 });
  panel.position.set(0, 5.25, 0);

  const panelLightEffects: EmissivePulseAnimation[] = [];
  for (let i = 0; i < 30; i++) {
    const panelLight = new PanelLight({ radius: 0.05 });
    panelLight.position.set(-1.25 + (i % 6) * 0.5, 5.55 - Math.floor(i / 6) * 0.15, 0.05);
    panelLightEffects.push(
      new EmissivePulseAnimation({ material: panelLight.material, speed: randomFloat(0.2, 2), minIntensity: 0.01 }),
    );
    controlPanel1.add(panelLight);
  }
  controlPanel1.add(panel);

  const lightning1 = new DirectionalLight(0xcdd8ff, 0);
  lightning1.shadow.mapSize.width = 4096;
  lightning1.shadow.mapSize.height = 4096;
  lightning1.shadow.camera.left = -15;
  lightning1.shadow.camera.right = 15;
  lightning1.shadow.camera.top = 15;
  lightning1.shadow.camera.bottom = -15;
  lightning1.shadow.camera.near = 0.1;
  lightning1.shadow.camera.far = 25;
  lightning1.castShadow = true;
  lightning1.position.set(5, 10, -5);
  lightning1.target.position.set(0, 2, 0);
  scene.add(lightning1, lightning1.target);

  const lightning2 = new DirectionalLight(0xcdd8ff, 0);
  lightning2.shadow.mapSize.width = 4096;
  lightning2.shadow.mapSize.height = 4096;
  lightning2.shadow.camera.left = -15;
  lightning2.shadow.camera.right = 15;
  lightning2.shadow.camera.top = 15;
  lightning2.shadow.camera.bottom = -15;
  lightning2.shadow.camera.near = 0.1;
  lightning2.shadow.camera.far = 25;
  lightning2.castShadow = true;
  lightning2.position.set(-5, 10, 4);
  lightning2.target.position.set(0, 2, 0);
  scene.add(lightning2, lightning2.target);

  const storm1 = new LightningEffect({ light: lightning1, peak: 15, minGap: 3, maxGap: 8 });
  const storm2 = new LightningEffect({ light: lightning2, peak: 5, minGap: 2.5, maxGap: 7 });

  let elapsed = 0;
  onFrame((delta) => {
    elapsed += delta;
    panelLightEffects.forEach((effect) => effect.update(elapsed));
    bubblingEffect.update();
    storm1.update(delta);
    storm2.update(delta);
  });

  return () => {
    bubblingEffect.dispose();
    plane.geometry.dispose();
    plane.material.dispose();
    box.geometry.dispose();
    box.material.dispose();
    dispose();
  };
}
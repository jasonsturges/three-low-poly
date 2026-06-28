import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { SceneTransition, type EasingFunction } from "three-low-poly";

export const meta = { title: "Scene Transition" };

export default function (container: HTMLElement) {
  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  camera.position.set(0, 5, 15);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const sceneTransition = new SceneTransition(renderer);

  const forestScene = new Scene();
  forestScene.background = new Color(0x87ceeb);
  forestScene.fog = new Fog(0x87ceeb, 10, 50);
  forestScene.add(new AmbientLight(0xffffff, 0.6));
  const forestSun = new DirectionalLight(0xffffee, 1.0);
  forestSun.position.set(10, 15, 5);
  forestSun.castShadow = true;
  forestScene.add(forestSun);
  const forestGround = new Mesh(new PlaneGeometry(50, 50), new MeshStandardMaterial({ color: 0x5a8a5a }));
  forestGround.rotation.x = -Math.PI / 2;
  forestGround.receiveShadow = true;
  forestScene.add(forestGround);
  for (let i = 0; i < 20; i++) {
    const trunk = new Mesh(new CylinderGeometry(0.3, 0.4, 3, 8), new MeshStandardMaterial({ color: 0x8b4513 }));
    trunk.position.set((Math.random() - 0.5) * 40, 1.5, (Math.random() - 0.5) * 40);
    trunk.castShadow = true;
    forestScene.add(trunk);
    const leaves = new Mesh(new ConeGeometry(2, 4, 8), new MeshStandardMaterial({ color: 0x228b22 }));
    leaves.position.copy(trunk.position);
    leaves.position.y += 4;
    leaves.castShadow = true;
    forestScene.add(leaves);
  }

  const desertScene = new Scene();
  desertScene.background = new Color(0xffd700);
  desertScene.fog = new Fog(0xffd700, 10, 50);
  desertScene.add(new AmbientLight(0xffffff, 0.8));
  const desertSun = new DirectionalLight(0xffffaa, 1.2);
  desertSun.position.set(10, 15, 5);
  desertSun.castShadow = true;
  desertScene.add(desertSun);
  const desertGround = new Mesh(
    new PlaneGeometry(50, 50, 20, 20),
    new MeshStandardMaterial({ color: 0xdaa520, roughness: 0.9 }),
  );
  desertGround.rotation.x = -Math.PI / 2;
  desertGround.receiveShadow = true;
  const desertPositions = desertGround.geometry.attributes.position;
  for (let i = 0; i < desertPositions.count; i++) {
    const x = desertPositions.getX(i);
    const z = desertPositions.getZ(i);
    desertPositions.setY(i, Math.sin(x * 0.2) * Math.cos(z * 0.2) * 2);
  }
  desertGround.geometry.computeVertexNormals();
  desertScene.add(desertGround);
  for (let i = 0; i < 15; i++) {
    const cactus = new Mesh(new CylinderGeometry(0.4, 0.5, 3, 6), new MeshStandardMaterial({ color: 0x228b22 }));
    cactus.position.set((Math.random() - 0.5) * 40, 1.5, (Math.random() - 0.5) * 40);
    cactus.castShadow = true;
    desertScene.add(cactus);
  }

  const oceanScene = new Scene();
  oceanScene.background = new Color(0x1e90ff);
  oceanScene.add(new AmbientLight(0xffffff, 0.5));
  const oceanSun = new DirectionalLight(0xffffff, 1.0);
  oceanSun.position.set(5, 10, 5);
  oceanScene.add(oceanSun);
  const waterGeometry = new PlaneGeometry(50, 50, 50, 50);
  const water = new Mesh(
    waterGeometry,
    new MeshStandardMaterial({ color: 0x006994, roughness: 0.3, metalness: 0.5 }),
  );
  water.rotation.x = -Math.PI / 2;
  oceanScene.add(water);
  const waterPositions = waterGeometry.attributes.position;
  const waterUpdate = () => {
    const time = Date.now() * 0.001;
    for (let i = 0; i < waterPositions.count; i++) {
      const x = waterPositions.getX(i);
      const z = waterPositions.getZ(i);
      waterPositions.setY(i, Math.sin(x * 0.2 + time) * Math.cos(z * 0.2 + time) * 0.5);
    }
    waterGeometry.attributes.position.needsUpdate = true;
    waterGeometry.computeVertexNormals();
  };
  for (let i = 0; i < 5; i++) {
    const boat = new Mesh(new BoxGeometry(2, 1, 4), new MeshStandardMaterial({ color: 0x8b4513 }));
    boat.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
    oceanScene.add(boat);
  }

  const cityScene = new Scene();
  cityScene.background = new Color(0x0a0a1e);
  cityScene.fog = new Fog(0x0a0a1e, 10, 50);
  cityScene.add(new AmbientLight(0x666699, 0.3));
  const cityGround = new Mesh(new PlaneGeometry(50, 50), new MeshStandardMaterial({ color: 0x333333 }));
  cityGround.rotation.x = -Math.PI / 2;
  cityGround.receiveShadow = true;
  cityScene.add(cityGround);
  for (let i = 0; i < 20; i++) {
    const height = 3 + Math.random() * 8;
    const building = new Mesh(new BoxGeometry(2, height, 2), new MeshStandardMaterial({ color: 0x444444 }));
    building.position.set((Math.random() - 0.5) * 40, height / 2, (Math.random() - 0.5) * 40);
    building.castShadow = true;
    cityScene.add(building);
    if (Math.random() > 0.3) {
      const light = new PointLight(0xffff00, 2, 10);
      light.position.copy(building.position);
      light.position.y += height / 2;
      cityScene.add(light);
    }
  }

  const scenes = { Forest: forestScene, Desert: desertScene, Ocean: oceanScene, City: cityScene };
  const sceneNames = Object.keys(scenes) as (keyof typeof scenes)[];
  sceneTransition.setCurrentScene(forestScene);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    sceneTransition.setSize(w, h);
  };
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    waterUpdate();
    sceneTransition.update();
    if (!sceneTransition.getIsTransitioning()) {
      const currentScene = sceneTransition.getCurrentScene();
      if (currentScene) renderer.render(currentScene, camera);
    } else {
      sceneTransition.render();
    }
    controls.update();
  });

  const transitionSettings = {
    currentScene: "Forest" as keyof typeof scenes,
    targetScene: "Desert" as keyof typeof scenes,
    transitionType: "fade" as "fade" | "crossfade" | "blur",
    duration: 1500,
    easing: "cubicInOut" as EasingFunction | "cubicInOut",
    fadeColor: "#000000",
    progress: 0,
    startTransition: () => {
      const fromScene = scenes[transitionSettings.currentScene];
      const toScene = scenes[transitionSettings.targetScene];
      const options = {
        duration: transitionSettings.duration,
        easing: transitionSettings.easing,
        onUpdate: (progress: number) => progressController.setValue(progress),
        onComplete: () => {
          transitionSettings.currentScene = transitionSettings.targetScene;
          currentSceneController.setValue(transitionSettings.currentScene);
          const currentIndex = sceneNames.indexOf(transitionSettings.currentScene);
          transitionSettings.targetScene = sceneNames[(currentIndex + 1) % sceneNames.length];
          targetSceneController.setValue(transitionSettings.targetScene);
        },
      };
      if (transitionSettings.transitionType === "fade") {
        sceneTransition.fade(fromScene, toScene, camera, { ...options, color: transitionSettings.fadeColor });
      } else if (transitionSettings.transitionType === "crossfade") {
        sceneTransition.crossfade(fromScene, toScene, camera, options);
      } else {
        sceneTransition.blur(fromScene, toScene, camera, options);
      }
    },
  };

  const gui = new GUI();
  const sceneFolder = gui.addFolder("Scene Selection");
  const currentSceneController = sceneFolder
    .add(transitionSettings, "currentScene", sceneNames)
    .name("Current Scene")
    .listen();
  const targetSceneController = sceneFolder.add(transitionSettings, "targetScene", sceneNames).name("Target Scene");
  sceneFolder.open();

  const transitionFolder = gui.addFolder("Transition Settings");
  transitionFolder.add(transitionSettings, "transitionType", ["fade", "crossfade", "blur"]).name("Transition Type");
  transitionFolder.add(transitionSettings, "duration", 500, 3000, 100).name("Duration (ms)");
  transitionFolder
    .add(transitionSettings, "easing", [
      "linear",
      "quadIn",
      "quadOut",
      "quadInOut",
      "cubicIn",
      "cubicOut",
      "cubicInOut",
      "quartInOut",
    ])
    .name("Easing");
  transitionFolder.addColor(transitionSettings, "fadeColor").name("Fade Color");
  const progressController = transitionFolder.add(transitionSettings, "progress", 0, 1).name("Progress").listen();
  progressController.disable();
  transitionFolder.open();

  const actionFolder = gui.addFolder("Actions");
  actionFolder.add(transitionSettings, "startTransition").name("▶ Start Transition");
  actionFolder.open();

  return () => {
    gui.destroy();
    sizeObserver.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    sceneTransition.dispose();
    renderer.dispose();
    canvas.remove();
    [forestScene, desertScene, oceanScene, cityScene].forEach((s) => {
      s.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    });
  };
}
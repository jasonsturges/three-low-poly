import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DodecahedronGeometry,
  Fog,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Vector2,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createWebGLRenderer } from "../../framework/createWebGLRenderer";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GlitchPass } from "three/addons/postprocessing/GlitchPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import GUI from "lil-gui";
import { SceneTransitionFX, type EasingFunction } from "three-low-poly";

export const meta = { title: "Scene Transition FX" };

export default function (container: HTMLElement) {
  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  camera.position.set(0, 5, 15);

  const renderer = createWebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(null as unknown as Scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new Vector2(container.clientWidth, container.clientHeight), 0, 0.4, 0.85);
  bloomPass.enabled = false;
  composer.addPass(bloomPass);

  const glitchPass = new GlitchPass();
  glitchPass.enabled = false;
  composer.addPass(glitchPass);

  const sceneTransitionFX = new SceneTransitionFX(renderer, composer, ShaderPass);
  sceneTransitionFX.setBloomPass(bloomPass);
  sceneTransitionFX.setGlitchPass(glitchPass);

  const neonScene = new Scene();
  neonScene.background = new Color(0x0a0a1e);
  neonScene.fog = new Fog(0x0a0a1e, 10, 50);
  neonScene.add(new AmbientLight(0x440044, 0.3));
  const neonGround = new Mesh(
    new PlaneGeometry(50, 50),
    new MeshStandardMaterial({ color: 0x111111, emissive: 0x220066, emissiveIntensity: 0.2 }),
  );
  neonGround.rotation.x = -Math.PI / 2;
  neonGround.receiveShadow = true;
  neonScene.add(neonGround);
  const neonColors = [0xff00ff, 0x00ffff, 0xff0066, 0x00ff88, 0xffff00];
  for (let i = 0; i < 15; i++) {
    const height = 3 + Math.random() * 10;
    const building = new Mesh(
      new BoxGeometry(2, height, 2),
      new MeshStandardMaterial({
        color: 0x222222,
        emissive: neonColors[i % neonColors.length],
        emissiveIntensity: 0.5,
      }),
    );
    building.position.set((Math.random() - 0.5) * 40, height / 2, (Math.random() - 0.5) * 40);
    building.castShadow = true;
    neonScene.add(building);
    const light = new PointLight(neonColors[i % neonColors.length], 3, 15);
    light.position.copy(building.position);
    light.position.y += height / 2 + 2;
    neonScene.add(light);
  }

  const crystalScene = new Scene();
  crystalScene.background = new Color(0x1a1a2e);
  crystalScene.add(new AmbientLight(0x6666ff, 0.4));
  const crystalGround = new Mesh(new PlaneGeometry(50, 50), new MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.8 }));
  crystalGround.rotation.x = -Math.PI / 2;
  crystalScene.add(crystalGround);
  for (let i = 0; i < 20; i++) {
    const crystalHeight = 2 + Math.random() * 4;
    const crystal = new Mesh(
      new ConeGeometry(0.5, crystalHeight, 6),
      new MeshStandardMaterial({
        color: 0x4466ff,
        emissive: 0x6688ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      }),
    );
    crystal.position.set((Math.random() - 0.5) * 40, crystalHeight / 2, (Math.random() - 0.5) * 40);
    crystalScene.add(crystal);
    const light = new PointLight(0x6688ff, 4, 10);
    light.position.copy(crystal.position);
    light.position.y += crystalHeight / 2;
    crystalScene.add(light);
  }

  const lavaScene = new Scene();
  lavaScene.background = new Color(0x220000);
  lavaScene.fog = new Fog(0x220000, 10, 50);
  lavaScene.add(new AmbientLight(0xff3300, 0.3));
  const lavaGround = new Mesh(
    new PlaneGeometry(50, 50, 20, 20),
    new MeshStandardMaterial({ color: 0x330000, emissive: 0xff3300, emissiveIntensity: 0.5 }),
  );
  lavaGround.rotation.x = -Math.PI / 2;
  const lavaPositions = lavaGround.geometry.attributes.position;
  const lavaUpdate = () => {
    const time = Date.now() * 0.0005;
    for (let i = 0; i < lavaPositions.count; i++) {
      const x = lavaPositions.getX(i);
      const z = lavaPositions.getZ(i);
      lavaPositions.setY(i, Math.sin(x * 0.3 + time) * Math.cos(z * 0.3 + time) * 0.8);
    }
    lavaPositions.needsUpdate = true;
    lavaGround.geometry.computeVertexNormals();
  };
  lavaScene.add(lavaGround);
  for (let i = 0; i < 12; i++) {
    const rock = new Mesh(
      new DodecahedronGeometry(1 + Math.random()),
      new MeshStandardMaterial({ color: 0x331100, emissive: 0xff4400, emissiveIntensity: 0.3, roughness: 0.9 }),
    );
    rock.position.set((Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40);
    lavaScene.add(rock);
  }

  const arcticScene = new Scene();
  arcticScene.background = new Color(0xddddff);
  arcticScene.fog = new Fog(0xddddff, 10, 50);
  arcticScene.add(new AmbientLight(0xffffff, 0.8));
  const arcticGround = new Mesh(
    new PlaneGeometry(50, 50),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.3 }),
  );
  arcticGround.rotation.x = -Math.PI / 2;
  arcticScene.add(arcticGround);
  for (let i = 0; i < 15; i++) {
    const mound = new Mesh(
      new IcosahedronGeometry(1 + Math.random() * 1.5, 0),
      new MeshStandardMaterial({
        color: 0xeeeeff,
        roughness: 0.3,
        metalness: 0.5,
        transparent: true,
        opacity: 0.8,
      }),
    );
    mound.position.set((Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40);
    arcticScene.add(mound);
  }

  const scenes = {
    "Neon City": neonScene,
    "Crystal Cave": crystalScene,
    "Lava World": lavaScene,
    Arctic: arcticScene,
  };
  const sceneNames = Object.keys(scenes) as (keyof typeof scenes)[];
  sceneTransitionFX.setCurrentScene(neonScene);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    sceneTransitionFX.setSize(w, h);
    bloomPass.setSize(w, h);
  };
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    lavaUpdate();
    sceneTransitionFX.update();
    sceneTransitionFX.render();
    controls.update();
  });

  const transitionSettings = {
    currentScene: "Neon City" as keyof typeof scenes,
    targetScene: "Crystal Cave" as keyof typeof scenes,
    transitionType: "bloom" as "bloom" | "blur" | "fade" | "glitch",
    duration: 2000,
    easing: "cubicInOut" as EasingFunction | "cubicInOut",
    maxBloom: 15.0,
    maxBlur: 10.0,
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
          currentSceneController.updateDisplay();
          const currentIndex = sceneNames.indexOf(transitionSettings.currentScene);
          transitionSettings.targetScene = sceneNames[(currentIndex + 1) % sceneNames.length];
          targetSceneController.setValue(transitionSettings.targetScene);
          targetSceneController.updateDisplay();
        },
      };
      if (transitionSettings.transitionType === "bloom") {
        sceneTransitionFX.bloom(fromScene, toScene, camera, { ...options, maxBloom: transitionSettings.maxBloom });
      } else if (transitionSettings.transitionType === "blur") {
        sceneTransitionFX.blur(fromScene, toScene, camera, { ...options, maxBlur: transitionSettings.maxBlur });
      } else if (transitionSettings.transitionType === "fade") {
        sceneTransitionFX.fade(fromScene, toScene, camera, { ...options, color: transitionSettings.fadeColor });
      } else {
        sceneTransitionFX.glitch(fromScene, toScene, camera, options);
      }
    },
  };

  const gui = new GUI();
  const sceneFolder = gui.addFolder("Scene Selection");
  const currentSceneController = sceneFolder.add(transitionSettings, "currentScene", sceneNames).name("Current Scene").listen();
  const targetSceneController = sceneFolder.add(transitionSettings, "targetScene", sceneNames).name("Target Scene");
  sceneFolder.open();

  const transitionFolder = gui.addFolder("Transition Settings");
  transitionFolder.add(transitionSettings, "transitionType", ["bloom", "blur", "fade", "glitch"]).name("FX Type");
  transitionFolder.add(transitionSettings, "duration", 200, 4000, 100).name("Duration (ms)");
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
  transitionFolder.add(transitionSettings, "maxBloom", 0.5, 20.0, 0.5).name("Max Bloom Strength");
  transitionFolder.add(transitionSettings, "maxBlur", 1.0, 25.0, 0.5).name("Max Blur Radius");
  transitionFolder.addColor(transitionSettings, "fadeColor").name("Fade Color");
  const progressController = transitionFolder.add(transitionSettings, "progress", 0, 1).name("Progress").listen();
  progressController.disable();
  transitionFolder.open();

  const actionFolder = gui.addFolder("Actions");
  actionFolder.add(transitionSettings, "startTransition").name("▶ Start FX Transition");
  actionFolder.open();

  return () => {
    gui.destroy();
    sizeObserver.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    composer.dispose();
    bloomPass.dispose();
    glitchPass.dispose();
    sceneTransitionFX.dispose();
    renderer.dispose();
    canvas.remove();
    [neonScene, crystalScene, lavaScene, arcticScene].forEach((s) => {
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
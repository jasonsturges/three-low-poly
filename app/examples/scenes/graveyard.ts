import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SpotLight,
  SRGBColorSpace,
} from "three";
import {
  BoneGeometry,
  createWroughtIronFence,
  FlameFlickerEffect,
  GlowHalo,
  GroundFogEffect,
  Lantern,
  LightningEffect,
  RainEffect,
  WispEffect,
  Mausoleum,
  rowOfHeadstones,
  scatterRocks,
  StoneFencePost,
} from "three-low-poly";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Graveyard" };

const BG_COLOR = new Color(0x05070c);
const FOG_COLOR = new Color(0x080b12);
const FLASH_COLOR = new Color(0x3a527e);
const RAINFALL = 0.28;
const LAMP_COLOR = 0xffd700;

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, onFrame, dispose } = createScene(container, {
    background: BG_COLOR.clone(),
    // Match portfolio orbital start: radius ~36, elevation ~0.58 rad, azimuth π/4.
    cameraPosition: [21, 22, 21],
  });
  clearDefaultLights(scene);

  // Portfolio graveyard uses a narrow FOV (~30°) — wide FOV makes misty streaks vanish.
  camera.fov = 30;
  camera.updateProjectionMatrix();
  renderer.outputColorSpace = SRGBColorSpace;

  const fog = new FogExp2(FOG_COLOR.getHex(), 0.03);
  scene.fog = fog;
  renderer.setClearColor(BG_COLOR);

  controls.target.set(0, 2, 0);
  controls.update();

  const terrainMesh = new Mesh(
    new PlaneGeometry(32, 32, 64, 64),
    new MeshStandardMaterial({ color: 0x1b211c, flatShading: true, roughness: 1 }),
  );
  terrainMesh.rotateX(-Math.PI / 2);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const mausoleum = new Mausoleum();
  mausoleum.position.set(0, 0, -5);
  mausoleum.castShadow = true;
  scene.add(mausoleum);

  const lantern = new Lantern({ bodyHeight: 1.3, baseWidth: 0.5 });
  lantern.scale.set(0.28, 0.28, 0.28);
  // Base slab top is y=1; front ledge between the left pillar and the doorway.
  lantern.position.set(-1.2, 1, 2.2);

  const lanternHalo = new GlowHalo({
    color: LAMP_COLOR,
    size: 0.9,
    opacity: 0.65,
  });
  lanternHalo.position.y = lantern.lampCenterY;
  lantern.add(lanternHalo);

  const lanternLight = new PointLight(LAMP_COLOR, 2.2, 7, 2);
  lanternLight.position.y = lantern.lampCenterY;
  lantern.add(lanternLight);

  const lanternFlicker = new FlameFlickerEffect({
    light: lanternLight,
    lightIntensity: 2.2,
    halo: lanternHalo,
    haloOpacity: 0.65,
  });

  const lanternGlass = lantern.material[1];
  const glassEmissiveBase = lanternGlass.emissiveIntensity;

  mausoleum.add(lantern);

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const tombstones = rowOfHeadstones({ count: 7, spacing: 1, seed: i * 2 + j });
      tombstones.traverse((child) => {
        if (child instanceof InstancedMesh) child.castShadow = true;
      });
      tombstones.position.set(j === 0 ? -7.5 : 1.5, 0, (i + 1) * 2);
      scene.add(tombstones);
    }
  }

  const stoneFencePost = new StoneFencePost();
  const enclosedFenceGroup = new Group();
  const sideLength = 4;
  const columnSpacing = 6;

  const picketHeight = 2.0;
  const railHeight = 0.1;
  const upperRailY = picketHeight - railHeight / 2;

  // Pickets and rails want opposite things at a post. Pickets must clear its widest step over their
  // whole height, or they bury themselves in the stonework; the rails must then reach back past that
  // step to embed in the narrower column, or they float unattached:  []-O--O--O-[]
  // Ask the post rather than hardcoding its profile — resize the post and the fence re-fits itself.
  const postProfile = stoneFencePost.geometry;
  const clearWidth = postProfile.maxWidthBetween(0, picketHeight);
  const railReach = postProfile.widthAt(upperRailY);

  const wroughtIronFence = createWroughtIronFence({
    length: columnSpacing - clearWidth,
    gap: 0.3,
    height: picketHeight,
    railHeight,
    upperRailY,
    railOverhang: (clearWidth - railReach) / 2 + 0.05,
  });

  for (let side = 0; side < sideLength; side++) {
    for (let i = 0; i < sideLength; i++) {
      const column = stoneFencePost.clone();
      const x = side === 1 || side === 3 ? i * columnSpacing : side === 0 ? 0 : (sideLength - 1) * columnSpacing;
      const z = side === 0 || side === 2 ? i * columnSpacing : side === 1 ? (sideLength - 1) * columnSpacing : 0;
      column.position.set(x, 0, z);
      column.castShadow = true;
      enclosedFenceGroup.add(column);

      if (i < sideLength - 1) {
        const fence = wroughtIronFence.clone();
        fence.position.set(x, 0, z);
        fence.castShadow = true;
        if (side === 0 || side === 2) fence.rotation.y = -Math.PI / 2;
        // Push the run off the post's widest face, along its own axis.
        fence.translateX(clearWidth / 2);
        if (!(side === 1 && i === 1)) enclosedFenceGroup.add(fence);
      }
    }
  }
  enclosedFenceGroup.position.set(-9, 0, -9);
  scene.add(enclosedFenceGroup);

  const rocks = scatterRocks({
    count: 36,
    width: 28,
    depth: 28,
    heightJitter: 0.05,
    scaleMin: 0.35,
    scaleMax: 0.65,
  });
  rocks.position.y = -0.1;
  rocks.castShadow = true;
  scene.add(rocks);

  for (let i = 0; i < 25; i++) {
    const radius = Math.random() * 0.07 + 0.03;
    const bone = new Mesh(new BoneGeometry(radius, radius, radius * 4, 8), new MeshStandardMaterial({ color: 0xffffff }));
    bone.position.set(Math.random() * 24 - 12, 0, Math.random() * 24 - 12);
    bone.rotation.x = -Math.PI / 2;
    bone.rotation.z = Math.random() * Math.PI;
    bone.rotation.x += Math.random() * 0.1 - 0.05;
    bone.rotation.y += Math.random() * 0.1 - 0.05;
    bone.rotation.z += Math.random() * 0.1 - 0.05;
    bone.castShadow = true;
    scene.add(bone);
  }

  const groundFog = new GroundFogEffect({
    count: 16,
    area: 16,
    perimeterCount: 20,
    plotHalf: 12,
    terrainHalf: 26,
    cameraFacing: { x: 1, z: 1 },
  });
  scene.add(groundFog);

  const wisps = new WispEffect({ count: 3 });
  scene.add(wisps);

  const rain = new RainEffect({
    area: 26,
    height: 20,
    count: 900,
    width: 0.009,
    opacity: 0.16,
    groundY: -0.5,
    intensity: RAINFALL,
  });
  rain.renderOrder = 2;
  scene.add(rain);

  const createBolt = (x: number, z: number, castShadow: boolean) => {
    const bolt = new DirectionalLight(0xcdd8ff, 0);
    bolt.position.set(x, 22, z);
    bolt.target.position.set(0, 2, 0);
    if (castShadow) {
      bolt.castShadow = true;
      bolt.shadow.mapSize.set(2048, 2048);
      const cam = bolt.shadow.camera;
      cam.left = -18;
      cam.right = 18;
      cam.top = 18;
      cam.bottom = -18;
      cam.near = 1;
      cam.far = 60;
      cam.updateProjectionMatrix();
      bolt.shadow.bias = -0.0005;
    }
    scene.add(bolt, bolt.target);
    return bolt;
  };

  const storm1 = new LightningEffect({
    light: createBolt(9, 11, true),
    peak: 9,
    minGap: 6,
    maxGap: 15,
  });
  const storm2 = new LightningEffect({
    light: createBolt(-7, 7, false),
    peak: 5,
    minGap: 5,
    maxGap: 13,
  });

  const spotlight = new SpotLight(0xaebfff, 40, 18, Math.PI / 8);
  spotlight.position.set(0, 9, -15);
  spotlight.target = mausoleum;
  spotlight.distance = 18;
  spotlight.angle = Math.PI / 6;
  spotlight.penumbra = 0.5;
  spotlight.castShadow = true;
  scene.add(spotlight);

  const moonlight = new DirectionalLight(0xaebfff, 1.2);
  moonlight.position.set(-13, 17, -30);
  moonlight.target.position.set(0, 0, 0);
  scene.add(moonlight, moonlight.target);

  const pointLight = new PointLight(0xffffff, 0.6, 32);
  pointLight.position.set(4.4, 2, 1.7);
  pointLight.decay = 2;
  scene.add(pointLight);

  const pointLight2 = new PointLight(0xffffff, 0.6, 32);
  pointLight2.position.set(-4.4, 2, 1.7);
  pointLight2.decay = 2;
  scene.add(pointLight2);

  scene.add(new AmbientLight(0x404040, 0.15));
  const hemisphereLight = new HemisphereLight(0xaaaaaa, 0x000000, 0.2);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  const baseBg = BG_COLOR.clone();
  const baseFog = FOG_COLOR.clone();

  // Bloom postprocessing was WebGL EffectComposer + UnrealBloomPass; dropped in the
  // WebGPU migration. TODO: reintroduce with three/webgpu PostProcessing + TSL bloom
  // (three/addons/tsl/display/BloomNode.js).
  onFrame((delta) => {
    wisps.update(delta);
    groundFog.update(delta);

    storm1.update(delta);
    storm2.update(delta);
    const flash = Math.max(storm1.level, storm2.level);
    const t = Math.min(1, flash * 0.6);
    fog.color.copy(baseFog).lerp(FLASH_COLOR, t);
    (scene.background as Color).copy(baseBg).lerp(FLASH_COLOR, t * 0.85);

    rain.intensity = Math.min(1, RAINFALL + flash * 0.5);
    rain.update(delta);

    lanternFlicker.update(delta);
    lanternFlicker.faceCamera(camera.position);
    lanternGlass.emissiveIntensity = glassEmissiveBase * (0.85 + 0.3 * lanternFlicker.level);
  });

  return () => {
    rain.dispose();
    wisps.dispose();
    groundFog.dispose();
    lanternHalo.dispose();
    lantern.geometry.dispose();
    lantern.material.forEach((material) => material.dispose());
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
    rocks.geometry.dispose();
    (Array.isArray(rocks.material) ? rocks.material : [rocks.material]).forEach((m) => m.dispose());
    dispose();
  };
}
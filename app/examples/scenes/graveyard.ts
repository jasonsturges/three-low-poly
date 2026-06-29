import {
  AmbientLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SpotLight,
} from "three";
import {
  BoneGeometry,
  CrossHeadstone,
  EllipticLeafGeometry,
  Lantern,
  PetalDriftEffect,
  Mausoleum,
  Moon,
  ObeliskHeadstone,
  Rocks,
  RoundedHeadstone,
  SquareHeadstone,
  StoneFencePost,
  WroughtIronFence,
} from "three-low-poly";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Graveyard" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, onFrame, dispose } = createScene(container, {
    cameraPosition: [0, 7, 13],
  });
  clearDefaultLights(scene);
  scene.fog = new Fog(0x010101, 5, 35);
  renderer.setClearColor(0x000000);

  controls.target.set(0, 3, 0);
  controls.update();

  const terrainMesh = new Mesh(
    new PlaneGeometry(32, 32, 256, 256),
    new MeshStandardMaterial({ color: 0x228b22, flatShading: true }),
  );
  terrainMesh.rotateX(-Math.PI / 2);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const mausoleum = new Mausoleum();
  mausoleum.position.set(0, 0, -5);
  mausoleum.castShadow = true;
  scene.add(mausoleum);

  const lantern = new Lantern(1.3, 0.5);
  lantern.scale.set(0.5, 0.5, 0.5);
  lantern.position.set(-1.25, 1, -2.8);
  scene.add(lantern);

  function createTombstoneRow(numTombstones = 5) {
    const tombstoneGroup = new Group();
    const tombstoneTypes = [RoundedHeadstone, CrossHeadstone, SquareHeadstone, ObeliskHeadstone];
    for (let i = 0; i < numTombstones; i++) {
      const TombstoneClass = tombstoneTypes[Math.floor(Math.random() * tombstoneTypes.length)]!;
      const tombstone = new TombstoneClass();
      tombstone.position.set(i, 0, (Math.random() - 0.5) * 0.1);
      tombstone.rotation.y = (Math.random() - 0.5) * 0.5;
      tombstone.rotation.z = (Math.random() - 0.5) * 0.25;
      tombstone.castShadow = true;
      tombstoneGroup.add(tombstone);
    }
    return tombstoneGroup;
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const tombstones = createTombstoneRow(7);
      tombstones.position.set(j === 0 ? -7.5 : 1.5, 0, (i + 1) * 2);
      scene.add(tombstones);
    }
  }

  const stoneFencePost = new StoneFencePost();
  const wroughtIronFence = new WroughtIronFence({ count: 15 });
  const enclosedFenceGroup = new Group();
  const sideLength = 4;
  const columnSpacing = 6;

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
        if (!(side === 1 && i === 1)) enclosedFenceGroup.add(fence);
      }
    }
  }
  enclosedFenceGroup.position.set(-9, 0, -9);
  scene.add(enclosedFenceGroup);

  for (let i = 0; i < 10; i++) {
    const rock = new Rocks();
    rock.scale.set(0.5, 0.5, 0.5);
    rock.castShadow = true;
    const angle = Math.random() * 2 * Math.PI;
    const distance = 6 + Math.random() * 12;
    rock.position.set(Math.cos(angle) * distance, -0.1, Math.sin(angle) * distance);
    scene.add(rock);
  }

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

  const moon = new Moon();
  moon.position.set(9, 15, -45);
  scene.add(moon);

  const leafGeometry = new EllipticLeafGeometry();
  const leafMaterial = new MeshStandardMaterial({
    color: 0x88aa33,
    side: DoubleSide,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
  });
  const petalDrift = new PetalDriftEffect({
    geometry: leafGeometry,
    material: leafMaterial,
    count: 120,
    color: 0x88aa33,
    flutter: 0.25,
  });
  scene.add(petalDrift);

  const spotlight = new SpotLight(0x23adf5, 100, 10, Math.PI / 8);
  spotlight.position.set(0, 9, -15);
  spotlight.target = mausoleum;
  spotlight.distance = 15;
  spotlight.angle = Math.PI / 6;
  spotlight.penumbra = 0.5;
  spotlight.castShadow = true;
  scene.add(spotlight);

  const pointLight = new PointLight(0xffffff, 1.2, 32);
  pointLight.position.set(4.4, 2, 1.7);
  pointLight.decay = 2;
  pointLight.castShadow = true;
  scene.add(pointLight);

  const pointLight2 = new PointLight(0xffffff, 1.2, 32);
  pointLight2.position.set(-4.4, 2, 1.7);
  pointLight2.decay = 2;
  pointLight2.castShadow = true;
  scene.add(pointLight2);

  scene.add(new AmbientLight(0x404040, 0.15));
  const hemisphereLight = new HemisphereLight(0xaaaaaa, 0x000000, 0.2);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  onFrame((delta) => petalDrift.update(delta));

  return () => {
    petalDrift.dispose();
    leafGeometry.dispose();
    leafMaterial.dispose();
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
    dispose();
  };
}
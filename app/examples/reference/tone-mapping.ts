import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  AmbientLight,
  BoxGeometry,
  CineonToneMapping,
  ConeGeometry,
  DirectionalLight,
  LinearToneMapping,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  NeutralToneMapping,
  PlaneGeometry,
  PointLight,
  ReinhardToneMapping,
  SphereGeometry,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Tone Mapping" };

export default function (container: HTMLElement) {
  const { scene, camera, renderer, dispose } = createScene(container, {
    background: 0x000000,
    cameraPosition: [0, 5, 30],
  });
  clearDefaultLights(scene);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const ambientLight = new AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 3.0);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);
  const pointLight = new PointLight(0xffffff, 50, 100);
  pointLight.position.set(0, 8, 0);
  scene.add(pointLight);

  const plane = new Mesh(
    new PlaneGeometry(100, 100),
    new MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  scene.add(plane);

  const sphereGeometry = new SphereGeometry(1, 32, 32);
  const boxGeometry = new BoxGeometry(2, 2, 2);
  const coneGeometry = new ConeGeometry(1, 2, 32);
  const distances = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xff8b94, 0xc7ceea, 0xffd3b6, 0xaa96da, 0xfcbad3];

  distances.forEach((distance, index) => {
    const color = colors[index % colors.length];
    const isEmissive = index % 3 === 0;
    const matProps = {
      color,
      emissive: isEmissive ? color : 0x000000,
      emissiveIntensity: isEmissive ? 0.5 : 0,
      roughness: 0.4,
      metalness: 0.6,
    };
    const sphere = new Mesh(sphereGeometry, new MeshStandardMaterial(matProps));
    sphere.position.set(-5, 1, distance);
    scene.add(sphere);
    const box = new Mesh(boxGeometry, new MeshStandardMaterial(matProps));
    box.position.set(0, 1, distance);
    scene.add(box);
    const cone = new Mesh(coneGeometry, new MeshStandardMaterial(matProps));
    cone.position.set(5, 1, distance);
    scene.add(cone);
  });

  const emissiveColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  emissiveColors.forEach((color, index) => {
    const sphere = new Mesh(
      new SphereGeometry(0.5, 32, 32),
      new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0 }),
    );
    const angle = (index / emissiveColors.length) * Math.PI * 2;
    sphere.position.set(Math.cos(angle) * 8, 3, Math.sin(angle) * 8);
    scene.add(sphere);
  });

  const toneMappingTypes = {
    None: NoToneMapping,
    Linear: LinearToneMapping,
    Reinhard: ReinhardToneMapping,
    Cineon: CineonToneMapping,
    ACESFilmic: ACESFilmicToneMapping,
    AgX: AgXToneMapping,
    Neutral: NeutralToneMapping,
  };

  const toneMappingSettings = { type: "ACESFilmic" as keyof typeof toneMappingTypes, exposure: 1.0 };

  const updateToneMapping = () => {
    renderer.toneMapping = toneMappingTypes[toneMappingSettings.type];
    renderer.toneMappingExposure = toneMappingSettings.exposure;
  };

  const gui = new GUI();
  const toneMappingFolder = gui.addFolder("Tone Mapping");
  toneMappingFolder.add(toneMappingSettings, "type", Object.keys(toneMappingTypes)).name("Tone Mapping Type").onChange(updateToneMapping);
  toneMappingFolder.add(toneMappingSettings, "exposure", 0.0, 3.0).name("Exposure").onChange(updateToneMapping);
  toneMappingFolder.open();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", -50, 50).name("Z");

  const lightFolder = gui.addFolder("Lighting");
  lightFolder.add(directionalLight, "intensity", 0, 10).name("Directional Intensity");
  lightFolder.add(pointLight, "intensity", 0, 100).name("Point Light Intensity");

  return () => {
    gui.destroy();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}
import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Fog,
  FogExp2,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Fog" };

export default function (container: HTMLElement) {
  const { scene, camera, renderer, dispose } = createScene(container, {
    cameraPosition: [0, 5, 30],
  });
  clearDefaultLights(scene);
  renderer.setClearColor(0x87ceeb);

  const ambientLight = new AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const plane = new Mesh(new PlaneGeometry(100, 100), new MeshStandardMaterial({ color: 0x5a8a5a }));
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
    const sphere = new Mesh(sphereGeometry, new MeshStandardMaterial({ color }));
    sphere.position.set(-5, 1, distance);
    scene.add(sphere);
    const box = new Mesh(boxGeometry, new MeshStandardMaterial({ color }));
    box.position.set(0, 1, distance);
    scene.add(box);
    const cone = new Mesh(coneGeometry, new MeshStandardMaterial({ color }));
    cone.position.set(5, 1, distance);
    scene.add(cone);
  });

  const fogSettings = {
    fogType: "None" as "None" | "Linear" | "Exponential" | "Exponential²",
    fogColor: "#87ceeb",
    near: 10,
    far: 50,
    density: 0.02,
  };

  const updateFog = () => {
    scene.fog = null;
    renderer.setClearColor(new Color(fogSettings.fogColor));
    switch (fogSettings.fogType) {
      case "Linear":
        scene.fog = new Fog(fogSettings.fogColor, fogSettings.near, fogSettings.far);
        break;
      case "Exponential":
      case "Exponential²":
        scene.fog = new FogExp2(fogSettings.fogColor, fogSettings.density);
        break;
    }
  };

  const gui = new GUI();
  const fogFolder = gui.addFolder("Fog Controls");
  let controllers: ReturnType<typeof fogFolder.add>[] = [];

  fogFolder
    .add(fogSettings, "fogType", ["None", "Linear", "Exponential", "Exponential²"])
    .name("Fog Type")
    .onChange((value: typeof fogSettings.fogType) => {
      controllers.forEach((controller) => controller.destroy());
      controllers = [];
      updateFog();
      if (value === "Linear") {
        controllers.push(fogFolder.add(fogSettings, "near", 0.1, 100).name("Near").onChange(updateFog));
        controllers.push(fogFolder.add(fogSettings, "far", 0.1, 100).name("Far").onChange(updateFog));
      } else if (value === "Exponential" || value === "Exponential²") {
        controllers.push(fogFolder.add(fogSettings, "density", 0.001, 0.1).name("Density").onChange(updateFog));
      }
    });

  fogFolder.addColor(fogSettings, "fogColor").name("Fog Color").onChange(updateFog);
  fogFolder.open();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", -50, 50).name("Z");

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
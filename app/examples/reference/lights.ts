import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SpotLight,
  SphereGeometry,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Lights" };

export default function (container: HTMLElement) {
  const { scene, camera, renderer, dispose } = createScene(container, {
    cameraPosition: [0, 5, 10],
  });
  clearDefaultLights(scene);
  renderer.setClearColor(0x000000);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.3;

  const plane = new Mesh(
    new PlaneGeometry(20, 20),
    new MeshStandardMaterial({ color: 0x808080, side: DoubleSide }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const sphere = new Mesh(new SphereGeometry(1, 32, 32), new MeshStandardMaterial({ color: 0xffffff }));
  sphere.position.set(0, 1, 0);
  sphere.castShadow = true;
  scene.add(sphere);

  const ambientLight = new AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(-5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const pointLight = new PointLight(0xffffff, 1, 50);
  pointLight.position.set(5, 10, 5);
  pointLight.castShadow = true;
  scene.add(pointLight);

  const spotLight = new SpotLight(0xffffff, 1);
  spotLight.position.set(0, 10, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.castShadow = true;
  scene.add(spotLight);

  const hemisphereLight = new HemisphereLight(0xaaaaaa, 0x000000, 0.5);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  const lightOptions = { lightType: "All" as "All" | "Ambient" | "Directional" | "Point" | "Spot" | "Hemisphere" };
  const gui = new GUI();
  const lightFolder = gui.addFolder("Light Controls");
  let controllers: ReturnType<typeof lightFolder.add>[] = [];

  lightFolder
    .add(lightOptions, "lightType", ["All", "Ambient", "Directional", "Point", "Spot", "Hemisphere"])
    .name("Select Light")
    .onChange((value: typeof lightOptions.lightType) => {
      ambientLight.visible = false;
      directionalLight.visible = false;
      pointLight.visible = false;
      spotLight.visible = false;
      hemisphereLight.visible = false;
      controllers.forEach((controller) => controller.destroy());
      controllers = [];

      switch (value) {
        case "All":
          ambientLight.visible = true;
          directionalLight.visible = true;
          pointLight.visible = true;
          spotLight.visible = true;
          hemisphereLight.visible = true;
          break;
        case "Ambient":
          ambientLight.visible = true;
          controllers.push(lightFolder.add(ambientLight, "intensity", 0, 2).name("Intensity"));
          break;
        case "Directional":
          directionalLight.visible = true;
          controllers.push(lightFolder.add(directionalLight, "intensity", 0, 2).name("Intensity"));
          controllers.push(lightFolder.add(directionalLight.position, "x", -20, 20).name("Position X"));
          controllers.push(lightFolder.add(directionalLight.position, "y", -20, 20).name("Position Y"));
          controllers.push(lightFolder.add(directionalLight.position, "z", -20, 20).name("Position Z"));
          break;
        case "Point":
          pointLight.visible = true;
          controllers.push(lightFolder.add(pointLight, "intensity", 0, 2).name("Intensity"));
          controllers.push(lightFolder.add(pointLight.position, "x", -20, 20).name("Position X"));
          controllers.push(lightFolder.add(pointLight.position, "y", -20, 20).name("Position Y"));
          controllers.push(lightFolder.add(pointLight.position, "z", -20, 20).name("Position Z"));
          controllers.push(lightFolder.add(pointLight, "distance", 0, 100).name("Distance"));
          controllers.push(lightFolder.add(pointLight, "decay", 0, 10).name("Decay"));
          break;
        case "Spot":
          spotLight.visible = true;
          controllers.push(lightFolder.add(spotLight, "intensity", 0, 2).name("Intensity"));
          controllers.push(lightFolder.add(spotLight.position, "x", -20, 20).name("Position X"));
          controllers.push(lightFolder.add(spotLight.position, "y", -20, 20).name("Position Y"));
          controllers.push(lightFolder.add(spotLight.position, "z", -20, 20).name("Position Z"));
          controllers.push(lightFolder.add(spotLight, "angle", 0, Math.PI / 2).name("Angle"));
          controllers.push(lightFolder.add(spotLight, "penumbra", 0, 1).name("Penumbra"));
          controllers.push(lightFolder.add(spotLight, "distance", 0, 100).name("Distance"));
          controllers.push(lightFolder.add(spotLight, "decay", 0, 10).name("Decay"));
          break;
        case "Hemisphere":
          hemisphereLight.visible = true;
          controllers.push(lightFolder.add(hemisphereLight, "intensity", 0, 2).name("Intensity"));
          controllers.push(
            lightFolder.addColor({ color: "#ffffff" }, "color").onChange((v: string) => {
              hemisphereLight.color.set(v);
            }),
          );
          controllers.push(
            lightFolder.addColor({ groundColor: "#ffffff" }, "groundColor").onChange((v: string) => {
              hemisphereLight.groundColor.set(v);
            }),
          );
          break;
      }
    });

  lightFolder.open();

  return () => {
    gui.destroy();
    plane.geometry.dispose();
    plane.material.dispose();
    sphere.geometry.dispose();
    sphere.material.dispose();
    dispose();
  };
}
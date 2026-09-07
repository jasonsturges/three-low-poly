import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  DoubleSide,
  HemisphereLight,
  HemisphereLightHelper,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  RectAreaLight,
  SpotLight,
  SpotLightHelper,
  SphereGeometry,
} from "three";
import { RectAreaLightNode } from "three/webgpu";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Lights",
  description:
    "Compare individual lights on the same sphere and floor. Point and spot " +
    "intensity is measured in candela and falls with distance squared at Decay 2. Their defaults are " +
    "scaled for this scene's roughly ten-unit lighting distance. Ambient and hemisphere lights provide " +
    "fill without cast shadows; directional, point, and spot lights reveal shape and shadows. Rect Area " +
    "models a rectangular emitter with broad highlights, but does not support cast shadows. Show Light Helper " +
    "visualizes the selected light's position or direction; Rect Area has its own Show Emitter control. " +
    "Ambient light has no position or direction to visualize.",
};

// Cache Three's shared LTC textures across visits, loading the data only for the area-light mode.
let areaLightReady: Promise<void> | undefined;
function loadAreaLight(): Promise<void> {
  return (areaLightReady ??= import("three/addons/lights/RectAreaLightTexturesLib.js")
    .then(({ RectAreaLightTexturesLib }) => {
      RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());
    })
    .catch((error: unknown) => {
      areaLightReady = undefined;
      throw error;
    }));
}

export default function (container: HTMLElement) {
  const { scene, renderer, onFrame, dispose } = createScene(container, {
    cameraPosition: [0, 5, 10],
  });
  clearDefaultLights(scene);
  renderer.setClearColor(0x000000);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const plane = new Mesh(new PlaneGeometry(20, 20), new MeshStandardMaterial({ color: 0x808080, side: DoubleSide }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const sphere = new Mesh(new SphereGeometry(1, 32, 32), new MeshStandardMaterial({ color: 0xffffff }));
  sphere.position.set(0, 1, 0);
  sphere.castShadow = true;
  scene.add(sphere);

  // Use intensity rather than a dark light color to set brightness.
  const ambientLight = new AmbientLight(0xffffff, 2);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(-5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // At roughly 12 units, 400 cd delivers a similar illumination to the directional light.
  // Keep physical inverse-square falloff; distance 0 means no artificial cutoff.
  const pointLight = new PointLight(0xffffff, 400, 0, 2);
  pointLight.position.set(5, 10, 5);
  pointLight.castShadow = true;
  scene.add(pointLight);

  const spotLight = new SpotLight(0xffffff, 250, 0, Math.PI / 6, 0.25, 2);
  spotLight.position.set(0, 10, 0);
  spotLight.castShadow = true;
  scene.add(spotLight);

  const hemisphereLight = new HemisphereLight(0xffffff, 0x70685c, 2);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  const areaLight = new RectAreaLight(0xffffff, 8, 4, 3);
  areaLight.position.set(-3, 5, 4);
  const aimAreaLight = () => areaLight.lookAt(sphere.position);
  aimAreaLight();
  areaLight.visible = false;
  const areaHelper = new RectAreaLightHelper(areaLight);
  areaLight.add(areaHelper);
  scene.add(areaLight);

  scene.add(directionalLight.target, spotLight.target);
  const lights = {
    Ambient: ambientLight,
    Directional: directionalLight,
    Point: pointLight,
    Spot: spotLight,
    Hemisphere: hemisphereLight,
    "Rect Area": areaLight,
  };
  for (const light of [directionalLight, pointLight, spotLight]) {
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    // No offset is needed: the sphere casts onto a separate receiving plane. Bias here
    // detached the contact shadow (peter-panning), leaving a bright crescent at the base.
    light.shadow.bias = 0;
    light.shadow.normalBias = 0;
    light.shadow.camera.updateProjectionMatrix();
  }
  // Cover the floor instead of clipping directional shadows to the default ten-unit box.
  Object.assign(directionalLight.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
  directionalLight.shadow.camera.updateProjectionMatrix();

  let disposed = false;
  const lightOptions = { lightType: "Directional" as keyof typeof lights, showHelpers: false };
  const helpers = {
    Directional: new DirectionalLightHelper(directionalLight, 1, 0x72d9ed),
    Point: new PointLightHelper(pointLight, 0.35, 0x72d9ed),
    Spot: new SpotLightHelper(spotLight, 0x72d9ed),
    Hemisphere: new HemisphereLightHelper(hemisphereLight, 0.75),
  };
  for (const helper of Object.values(helpers)) {
    helper.visible = false;
    scene.add(helper);
  }
  const updateHelpers = () => {
    for (const [type, helper] of Object.entries(helpers)) {
      helper.visible = lightOptions.showHelpers && lightOptions.lightType === type;
      if (helper.visible) helper.update();
    }
  };
  // Keep the active helper synchronized with position, cone angle, range, and color edits.
  onFrame(updateHelpers);
  const status = { shadows: "Enabled", state: "Ready" };
  const gui = new GUI();
  gui.title("Lights");
  gui.add(renderer, "toneMappingExposure", 0.25, 3, 0.05).name("Exposure");
  const helperControl = gui.add(lightOptions, "showHelpers").name("Show Light Helper").onChange(updateHelpers);
  gui.add(status, "shadows").name("Cast Shadows").listen().disable();
  gui.add(status, "state").name("Light Status").listen().disable();
  const lightFolder = gui.addFolder("Light Controls");
  let controllers: ReturnType<typeof lightFolder.add>[] = [];

  const selectLight = (value: typeof lightOptions.lightType) => {
    for (const [type, light] of Object.entries(lights)) light.visible = value === type && light !== areaLight;
    status.shadows = lights[value].castShadow ? "Enabled" : "Not supported";
    status.state = "Ready";
    helperControl.enable(value in helpers);
    updateHelpers();
    controllers.forEach((controller) => controller.destroy());
    controllers = [];

    switch (value) {
      case "Ambient":
        controllers.push(lightFolder.add(ambientLight, "intensity", 0, 5, 0.05).name("Intensity"));
        break;
      case "Directional":
        controllers.push(lightFolder.add(directionalLight, "intensity", 0, 10, 0.05).name("Intensity (lux)"));
        controllers.push(lightFolder.add(directionalLight.position, "x", -20, 20).name("Position X"));
        controllers.push(lightFolder.add(directionalLight.position, "y", -20, 20).name("Position Y"));
        controllers.push(lightFolder.add(directionalLight.position, "z", -20, 20).name("Position Z"));
        break;
      case "Point":
        controllers.push(lightFolder.add(pointLight, "intensity", 0, 2000, 1).name("Intensity (cd)"));
        controllers.push(lightFolder.add(pointLight.position, "x", -20, 20).name("Position X"));
        controllers.push(lightFolder.add(pointLight.position, "y", -20, 20).name("Position Y"));
        controllers.push(lightFolder.add(pointLight.position, "z", -20, 20).name("Position Z"));
        controllers.push(lightFolder.add(pointLight, "distance", 0, 100, 0.5).name("Cutoff (0 = none)"));
        controllers.push(lightFolder.add(pointLight, "decay", 0, 4, 0.1).name("Decay"));
        break;
      case "Spot":
        controllers.push(lightFolder.add(spotLight, "intensity", 0, 2000, 1).name("Intensity (cd)"));
        controllers.push(lightFolder.add(spotLight.position, "x", -20, 20).name("Position X"));
        controllers.push(lightFolder.add(spotLight.position, "y", -20, 20).name("Position Y"));
        controllers.push(lightFolder.add(spotLight.position, "z", -20, 20).name("Position Z"));
        controllers.push(lightFolder.add(spotLight, "angle", 0.01, Math.PI / 2 - 0.01, 0.01).name("Angle (rad)"));
        controllers.push(lightFolder.add(spotLight, "penumbra", 0, 1, 0.01).name("Penumbra"));
        controllers.push(lightFolder.add(spotLight, "distance", 0, 100, 0.5).name("Cutoff (0 = none)"));
        controllers.push(lightFolder.add(spotLight, "decay", 0, 4, 0.1).name("Decay"));
        break;
      case "Hemisphere":
        controllers.push(lightFolder.add(hemisphereLight, "intensity", 0, 5, 0.05).name("Intensity"));
        controllers.push(
          lightFolder
            .addColor({ color: `#${hemisphereLight.color.getHexString()}` }, "color")
            .name("Sky Color")
            .onChange((v: string) => {
              hemisphereLight.color.set(v);
            }),
        );
        controllers.push(
          lightFolder
            .addColor({ groundColor: `#${hemisphereLight.groundColor.getHexString()}` }, "groundColor")
            .name("Ground Color")
            .onChange((v: string) => {
              hemisphereLight.groundColor.set(v);
            }),
        );
        break;
      case "Rect Area":
        status.state = "Loading light…";
        void loadAreaLight()
          .then(() => {
            if (disposed || lightOptions.lightType !== "Rect Area") return;
            areaLight.visible = true;
            status.state = "Ready";
          })
          .catch((error: unknown) => {
            if (disposed || lightOptions.lightType !== "Rect Area") return;
            status.state = "Load failed; reselect to retry";
            console.error("Could not load area-light textures", error);
          });
        controllers.push(lightFolder.add(areaLight, "intensity", 0, 50, 0.1).name("Intensity (cd/m²)"));
        controllers.push(lightFolder.add(areaLight, "width", 0.1, 10, 0.1).name("Width"));
        controllers.push(lightFolder.add(areaLight, "height", 0.1, 10, 0.1).name("Height"));
        for (const axis of ["x", "y", "z"] as const) {
          controllers.push(
            lightFolder.add(areaLight.position, axis, -20, 20, 0.1).name(`Position ${axis.toUpperCase()}`).onChange(aimAreaLight),
          );
        }
        controllers.push(lightFolder.add(areaHelper, "visible").name("Show Emitter"));
        break;
    }
  };
  lightFolder.add(lightOptions, "lightType", Object.keys(lights)).name("Select Light").onChange(selectLight);
  selectLight(lightOptions.lightType);

  lightFolder.open();

  return () => {
    disposed = true;
    gui.destroy();
    plane.geometry.dispose();
    plane.material.dispose();
    sphere.geometry.dispose();
    sphere.material.dispose();
    areaHelper.dispose();
    Object.values(helpers).forEach((helper) => helper.dispose());
    Object.values(lights).forEach((light) => light.dispose());
    dispose();
  };
}

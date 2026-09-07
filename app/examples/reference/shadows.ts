import {
  AmbientLight,
  BasicShadowMap,
  BoxGeometry,
  Box3,
  FrontSide,
  Vector3,
  CameraHelper,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PCFSoftShadowMap,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  VSMShadowMap,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Shadows",
  description:
    "Compare shadow filters, resolution, and bias on grounded objects. The directional shadow frustum fits the floor and casters whenever the light moves. Front-face shadow casting avoids the light leaks that back-face shadow depths can cause near contact. Excessive bias separates shadows (peter-panning); too little can produce self-shadow acne. Radius affects PCF and VSM, but not Basic or PCFSoft. VSM can exhibit light bleeding even with a correctly fitted frustum.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, dispose } = createScene(container, {
    background: 0x87ceeb,
    cameraPosition: [15, 15, 15],
  });
  clearDefaultLights(scene);
  controls.enableDamping = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const ambientLight = new AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  let directionalLight = new DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(10, 15, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.bias = -0.00001;
  // Front-face shadow casting needs a small normal offset to suppress curved-surface acne.
  directionalLight.shadow.normalBias = 0.05;
  scene.add(directionalLight, directionalLight.target);

  let shadowCameraHelper = new CameraHelper(directionalLight.shadow.camera);
  shadowCameraHelper.visible = false;
  scene.add(shadowCameraHelper);

  const plane = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: 0x90c890, roughness: 0.8 }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const baseMaterial = new MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5, metalness: 0.2, shadowSide: FrontSide });
  const sphereGeometry = new SphereGeometry(1.5, 32, 32);
  const boxGeometry = new BoxGeometry(2.5, 2.5, 2.5);
  const coneGeometry = new ConeGeometry(1.5, 3, 32);
  const torusGeometry = new TorusGeometry(1.5, 0.5, 16, 32);
  const cylinderGeometry = new CylinderGeometry(1, 1, 3, 32);

  const sphere = new Mesh(sphereGeometry, baseMaterial.clone());
  sphere.position.set(-8, 1.5, -5);
  sphere.castShadow = sphere.receiveShadow = true;
  scene.add(sphere);

  const box = new Mesh(boxGeometry, baseMaterial.clone());
  box.material.color.set(0x4ecdc4);
  box.position.set(-4, 1.25, 0);
  box.castShadow = box.receiveShadow = true;
  scene.add(box);

  const cone = new Mesh(coneGeometry, baseMaterial.clone());
  cone.material.color.set(0xffe66d);
  cone.position.set(0, 1.5, -5);
  cone.castShadow = cone.receiveShadow = true;
  scene.add(cone);

  const torus = new Mesh(torusGeometry, baseMaterial.clone());
  torus.material.color.set(0xa8e6cf);
  torus.position.set(4, 2, 0);
  torus.rotation.x = Math.PI / 4;
  torus.updateMatrixWorld(true);
  torus.position.y -= new Box3().setFromObject(torus, true).min.y;
  torus.castShadow = torus.receiveShadow = true;
  scene.add(torus);

  const cylinder = new Mesh(cylinderGeometry, baseMaterial.clone());
  cylinder.material.color.set(0xc7ceea);
  cylinder.position.set(8, 1.5, -5);
  cylinder.castShadow = cylinder.receiveShadow = true;
  scene.add(cylinder);

  const tallBox = new Mesh(new BoxGeometry(1.5, 8, 1.5), baseMaterial.clone());
  tallBox.material.color.set(0xff8b94);
  tallBox.position.set(-8, 4, 5);
  tallBox.castShadow = tallBox.receiveShadow = true;
  scene.add(tallBox);

  const smallSphereGeometry = new SphereGeometry(0.75, 16, 16);
  for (let i = 0; i < 5; i++) {
    const smallSphere = new Mesh(smallSphereGeometry, baseMaterial.clone());
    smallSphere.material.color.setHSL(i / 5, 0.7, 0.6);
    smallSphere.position.set(i * 2 - 4, 0.75, 8);
    smallSphere.castShadow = smallSphere.receiveShadow = true;
    scene.add(smallSphere);
  }

  const meshes: Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof Mesh) meshes.push(object);
  });
  const sceneBounds = new Box3();
  meshes.forEach((mesh) => sceneBounds.expandByObject(mesh));
  const boundsCorners: Vector3[] = [];
  for (const x of [sceneBounds.min.x, sceneBounds.max.x]) {
    for (const y of [sceneBounds.min.y, sceneBounds.max.y]) {
      for (const z of [sceneBounds.min.z, sceneBounds.max.z]) boundsCorners.push(new Vector3(x, y, z));
    }
  }
  const fitShadowCamera = () => {
    directionalLight.updateMatrixWorld(true);
    directionalLight.target.updateMatrixWorld(true);
    const shadow = directionalLight.shadow;
    shadow.updateMatrices(directionalLight);
    const bounds = new Box3().setFromPoints(
      boundsCorners.map((point) => point.clone().applyMatrix4(shadow.camera.matrixWorldInverse)),
    );
    const margin = 1;
    // Orthographic depth can extend behind the light's position: a directional
    // source has no distance falloff, and low light positions may be below a caster.
    Object.assign(shadow.camera, {
      left: bounds.min.x - margin,
      right: bounds.max.x + margin,
      bottom: bounds.min.y - margin,
      top: bounds.max.y + margin,
      near: -bounds.max.z - margin,
      far: -bounds.min.z + margin,
    });
    shadow.camera.updateProjectionMatrix();
    shadow.updateMatrices(directionalLight);
    shadowCameraHelper.update();
  };
  fitShadowCamera();

  // VSM's blur bindings in r185 can retain disposed textures after a resize.
  // A new light gives the renderer a fresh shadow node without touching its internals.
  const resizeShadowMap = (size: number) => {
    if (directionalLight.shadow.mapSize.width === size) return;
    const previous = directionalLight;
    directionalLight = previous.clone();
    directionalLight.shadow.mapSize.set(size, size);
    scene.remove(previous, previous.target, shadowCameraHelper);
    shadowCameraHelper.dispose();
    shadowCameraHelper = new CameraHelper(directionalLight.shadow.camera);
    shadowCameraHelper.visible = shadowSettings.showShadowCamera;
    scene.add(directionalLight, directionalLight.target, shadowCameraHelper);
    previous.dispose();
    fitShadowCamera();
  };

  const shadowMapTypes = {
    Basic: BasicShadowMap,
    PCF: PCFShadowMap,
    PCFSoft: PCFSoftShadowMap,
    VSM: VSMShadowMap,
  };

  const shadowSettings = {
    shadowMapType: "PCFSoft" as keyof typeof shadowMapTypes,
    shadowMapSize: 2048,
    shadowBias: -0.00001,
    normalBias: 0.05,
    shadowRadius: 1,
    showShadowCamera: false,
  };

  const gui = new GUI();
  const shadowFolder = gui.addFolder("Shadow Settings");
  shadowFolder
    .add(shadowSettings, "shadowMapType", Object.keys(shadowMapTypes))
    .name("Shadow Map Type")
    .onChange(() => {
      renderer.shadowMap.type = shadowMapTypes[shadowSettings.shadowMapType];
      radiusControl.enable(shadowSettings.shadowMapType === "PCF" || shadowSettings.shadowMapType === "VSM");
    });
  shadowFolder
    .add(shadowSettings, "shadowMapSize", [256, 512, 1024, 2048, 4096])
    .name("Shadow Map Size")
    .onChange(() => {
      resizeShadowMap(Number(shadowSettings.shadowMapSize));
    });
  shadowFolder
    .add(shadowSettings, "shadowBias", -0.001, 0.001, 0.000001)
    .name("Shadow Bias")
    .onChange(() => {
      directionalLight.shadow.bias = shadowSettings.shadowBias;
    });
  shadowFolder
    .add(shadowSettings, "normalBias", 0, 0.1, 0.001)
    .name("Normal Bias")
    .onChange((value: number) => {
      directionalLight.shadow.normalBias = value;
    });
  const radiusControl = shadowFolder
    .add(shadowSettings, "shadowRadius", 0, 10, 0.1)
    .name("Filter Radius")
    .onChange(() => {
      directionalLight.shadow.radius = shadowSettings.shadowRadius;
    });
  radiusControl.disable();
  shadowFolder
    .add(
      {
        reset() {
          Object.assign(shadowSettings, {
            shadowMapType: "PCFSoft",
            shadowMapSize: 2048,
            shadowBias: -0.00001,
            normalBias: 0.05,
            shadowRadius: 1,
          });
          renderer.shadowMap.type = PCFSoftShadowMap;
          resizeShadowMap(2048);
          directionalLight.shadow.bias = shadowSettings.shadowBias;
          directionalLight.shadow.normalBias = 0.05;
          directionalLight.shadow.radius = 1;
          Object.assign(lightSettings, { x: 10, y: 15, z: 5 });
          directionalLight.position.set(10, 15, 5);
          fitShadowCamera();
          radiusControl.disable();
          gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
        },
      },
      "reset",
    )
    .name("Reset Shadows & Light Position");
  shadowFolder.open();

  const lightSettings = { intensity: 1.5, x: 10, y: 15, z: 5 };
  const updateLight = () => {
    directionalLight.intensity = lightSettings.intensity;
    directionalLight.position.set(lightSettings.x, lightSettings.y, lightSettings.z);
    fitShadowCamera();
  };
  const lightFolder = gui.addFolder("Light Controls");
  lightFolder.add(lightSettings, "intensity", 0, 3).name("Light Intensity").onChange(updateLight);
  lightFolder.add(lightSettings, "x", -20, 20).name("Light Position X").onChange(updateLight);
  lightFolder.add(lightSettings, "y", 5, 30).name("Light Position Y").onChange(updateLight);
  lightFolder.add(lightSettings, "z", -20, 20).name("Light Position Z").onChange(updateLight);

  const debugFolder = gui.addFolder("Debug");
  debugFolder.close();
  debugFolder
    .add(
      {
        inspect() {
          camera.position.set(-4, 0.35, 8.08);
          controls.target.set(-4, 0, 8);
          controls.update();
        },
      },
      "inspect",
    )
    .name("Inspect Sphere Contact");
  debugFolder
    .add(
      {
        overview() {
          camera.position.set(15, 15, 15);
          controls.target.set(0, 0, 0);
          controls.update();
        },
      },
      "overview",
    )
    .name("Scene View");
  debugFolder
    .add(shadowSettings, "showShadowCamera")
    .name("Show Shadow Camera")
    .onChange(() => {
      shadowCameraHelper.visible = shadowSettings.showShadowCamera;
    });

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.close();
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", -50, 50).name("Z");

  return () => {
    gui.destroy();
    shadowCameraHelper.dispose();
    const geometries = new Set(meshes.map((mesh) => mesh.geometry));
    geometries.forEach((geometry) => geometry.dispose());
    meshes.forEach((mesh) => {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
    });
    baseMaterial.dispose();
    directionalLight.dispose();
    ambientLight.dispose();
    dispose();
  };
}
